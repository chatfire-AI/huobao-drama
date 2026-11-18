"""Private-network ComfyUI bridge. Durable task IDs; never retries submissions."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import threading
import urllib.error
import urllib.parse
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DATA = Path(os.environ.get('BRIDGE_DATA', '/data'))
DATA.mkdir(parents=True, exist_ok=True)
TOKEN = os.environ.get('BRIDGE_TOKEN', '')
IMAGE = os.environ.get('COMFY_IMAGE_URL', 'http://192.168.110.201:8188')
VIDEO = os.environ.get('COMFY_VIDEO_URL', 'http://192.168.110.202:8188')
BASE = os.environ.get('BRIDGE_BASE_URL', 'http://comfy-bridge:8090')
LOCK = threading.Lock()

def database():
    con = sqlite3.connect(DATA / 'tasks.sqlite3')
    con.row_factory = sqlite3.Row
    con.execute('CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, key TEXT UNIQUE, digest TEXT, host TEXT, kind TEXT, prompt_id TEXT, output TEXT, duration REAL, error TEXT)')
    return con

def api(host, path, body=None, headers=None):
    payload = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(host + path, payload, headers or {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError(f'ComfyUI HTTP {error.code}: {error.read(6000).decode(errors="replace")}') from error

def upload(host, source):
    if not source.startswith('data:image/') or ';base64,' not in source:
        raise ValueError('参考图必须为 data:image/...;base64（由平台从素材库自动读取）')
    mime, encoded = source.split(',', 1)
    content = base64.b64decode(encoded, validate=True)
    if len(content) > 30 * 1024 * 1024:
        raise ValueError('参考图超过 30 MB')
    ext = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp'}.get(mime[5:].split(';')[0])
    if not ext:
        raise ValueError('仅支持 PNG/JPEG/WebP 参考图')
    name = f'huobao_{hashlib.sha256(content).hexdigest()}.{ext}'
    boundary = uuid.uuid4().hex
    data = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()
            + content + f'\r\n--{boundary}--\r\n'.encode())
    req = urllib.request.Request(host + '/upload/image', data, {'Content-Type': f'multipart/form-data; boundary={boundary}'})
    with urllib.request.urlopen(req, timeout=60) as response:
        result = json.load(response)
    return '/'.join(filter(None, [result.get('subfolder'), result['name']]))

def node(kind, **inputs):
    return {'class_type': kind, 'inputs': inputs}

def array(value):
    return json.loads(value) if isinstance(value, str) else value or []

def image_graph(record, refs):
    model = record.get('model') or 'qwen-image-2512'
    if model not in ('qwen-image-2512', 'qwen-image-edit-2509'):
        raise ValueError('不支持的本地图像模型')
    if len(refs) > 3:
        raise ValueError('本地 Qwen 编辑最多支持 3 张参考图，请先筛选素材')
    if model == 'qwen-image-edit-2509' and not refs:
        raise ValueError('Qwen Image Edit 需要至少一张参考图')
    w, h = map(int, (record.get('size') or '1024x1024').lower().split('x'))
    if min(w, h) < 256 or max(w, h) > 2048:
        raise ValueError('图像尺寸需为 256–2048，实际输出按比例限制到约一百万像素')
    scale = min(1, (1048576 / (w * h)) ** .5)
    w, h = max(256, round(w * scale / 16) * 16), max(256, round(h * scale / 16) * 16)
    g = {
        '1': node('UNETLoader', unet_name='qwen_image_edit_2509_bf16.safetensors' if refs else 'qwen_image_2512_bf16.safetensors', weight_dtype='default'),
        '2': node('CLIPLoader', clip_name='qwen_2.5_vl_7b.safetensors', type='qwen_image'),
        '3': node('VAELoader', vae_name='qwen_image_vae.safetensors'),
        '4': node('ModelSamplingAuraFlow', model=['1', 0], shift=3.1),
        '7': node('EmptySD3LatentImage', width=w, height=h, batch_size=1),
        '8': node('KSampler', model=['4', 0], seed=secrets.randbelow(2**32), steps=20, cfg=4.0, sampler_name='euler', scheduler='simple', positive=['5', 0], negative=['6', 0], latent_image=['7', 0], denoise=1.0),
        '9': node('VAEDecode', samples=['8', 0], vae=['3', 0]),
        '10': node('SaveImage', images=['9', 0], filename_prefix='huobao/image'),
    }
    if refs:
        images = {}
        for i, name in enumerate(refs, 1):
            g[str(20+i)] = node('LoadImage', image=name)
            images[f'image{i}'] = [str(20+i), 0]
        g['5'] = node('TextEncodeQwenImageEditPlus', clip=['2', 0], vae=['3', 0], prompt=record['prompt'], **images)
        g['6'] = node('TextEncodeQwenImageEditPlus', clip=['2', 0], vae=['3', 0], prompt='', **images)
    else:
        g['5'] = node('CLIPTextEncode', clip=['2', 0], text=record['prompt'])
        g['6'] = node('CLIPTextEncode', clip=['2', 0], text='')
    return g, '10', None

def validate_video(record):
    if record.get('model', 'wan2.2-i2v-14b') != 'wan2.2-i2v-14b':
        raise ValueError('仅支持 wan2.2-i2v-14b')
    for key in ['lastFrameUrl', 'referenceVideoUrls', 'referenceAudioUrls', 'referenceFileUrl', 'referenceLinkUrl']:
        value = record.get(key)
        if value and value != '[]':
            raise ValueError('本地 Wan 2.2 仅支持单首帧，不支持尾帧/参考音视频/文件')
    refs = array(record.get('referenceImageUrls'))
    first = record.get('firstFrameUrl') or record.get('imageUrl')
    if refs:
        if len(refs) != 1 or first:
            raise ValueError('本地 Wan 仅接受一张首帧：请先将角色/场景合成为分镜图片')
        first = refs[0]
    if not first:
        raise ValueError('本地 Wan 图生视频需要首帧图片，请先生成/上传分镜图')
    if record.get('generateAudio'):
        raise ValueError('本地 Wan 2.2 不生成声音，请关闭生成音频')
    duration = float(record.get('duration') or 5)
    if not 2 <= duration <= 5:
        raise ValueError('本地视频时长仅支持 2–5 秒，请拆分较长镜头')
    res = (record.get('resolution') or '720p').lower()
    if res not in ('480p', '720p'):
        raise ValueError('本地视频仅支持 480p/720p')
    ratio = record.get('aspectRatio') or '16:9'
    if ratio not in ('16:9', '9:16', '1:1', '4:3', '3:4'):
        raise ValueError('不支持的画面比例')
    return first, duration, res, ratio

def video_graph(record, first):
    _, duration, res, ratio = validate_video(record)
    short = 480 if res == '480p' else 720
    a, b = map(int, ratio.split(':'))
    w, h = (round(short*a/b/16)*16, short) if a >= b else (short, round(short*b/a/16)*16)
    w, h = round(w/16)*16, round(h/16)*16
    frames = round(duration*16/4)*4+1
    seed = record.get('seed')
    seed = secrets.randbelow(2**32) if seed is None or int(seed) < 0 else int(seed)
    g = {}
    for index, stage in [(1, 'high'), (2, 'low')]:
        g[str(index)] = node('UNETLoader', unet_name=f'wan2.2_i2v_{stage}_noise_14B_fp8_scaled.safetensors', weight_dtype='default')
        g[str(index+2)] = node('LoraLoaderModelOnly', model=[str(index), 0], lora_name=f'wan2.2_i2v_lightx2v_4steps_lora_v1_{stage}_noise.safetensors', strength_model=1.0)
        g[str(index+4)] = node('ModelSamplingSD3', model=[str(index+2), 0], shift=5.0)
    g.update({
        '7': node('CLIPLoader', clip_name='umt5_xxl_fp8_e4m3fn_scaled.safetensors', type='wan'),
        '8': node('VAELoader', vae_name='wan_2.1_vae.safetensors'),
        '9': node('CLIPTextEncode', clip=['7', 0], text=record['prompt']),
        '10': node('CLIPTextEncode', clip=['7', 0], text='变形的手，换脸，换装，多余的人，文字，水印'),
        '11': node('LoadImage', image=first),
        '12': node('WanImageToVideo', positive=['9', 0], negative=['10', 0], vae=['8', 0], width=w, height=h, length=frames, batch_size=1, start_image=['11', 0]),
        '15': node('VAEDecode', samples=['14', 0], vae=['8', 0]),
        '16': node('CreateVideo', images=['15', 0], fps=16.0),
        '17': node('SaveVideo', video=['16', 0], filename_prefix='huobao/video', format='mp4', codec='auto'),
    })
    for key, model, latent, start, end in [('13', '5', '12', 0, 2), ('14', '6', '13', 2, 4)]:
        g[key] = node('KSamplerAdvanced', model=[model, 0], add_noise='enable' if start == 0 else 'disable', noise_seed=seed, steps=4, cfg=1.0, sampler_name='euler', scheduler='simple', positive=['12', 0], negative=['12', 1], latent_image=[latent, 2 if start == 0 else 0], start_at_step=start, end_at_step=end, return_with_leftover_noise='enable' if start == 0 else 'disable')
    return g, '17', frames/16

def submit(kind, record):
    if not isinstance(record.get('prompt'), str) or not record['prompt'].strip():
        raise ValueError('提示词不能为空')
    host = IMAGE if kind == 'image' else VIDEO
    if kind == 'image':
        refs = array(record.get('referenceImages'))
        image_graph(record, ['validation']*len(refs))
    else:
        first, _, _, _ = validate_video(record)
    digest = hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest()
    key = record.get('requestKey') or uuid.uuid4().hex
    with LOCK, database() as con:
        old = con.execute('SELECT * FROM tasks WHERE key=?', (key,)).fetchone()
        if old:
            if old['digest'] != digest:
                raise ValueError('同一个请求编号不能提交不同参数')
            return old['id']
        task = uuid.uuid4().hex
        con.execute('INSERT INTO tasks(id,key,digest,host,kind) VALUES(?,?,?,?,?)', (task,key,digest,host,kind))
    try:
        if kind == 'image':
            graph, output, duration = image_graph(record, [upload(host, ref) for ref in refs])
        else:
            graph, output, duration = video_graph(record, upload(host, first))
        # One attempt only. A network error after submission is ambiguous; never resubmit.
        result = api(host, '/prompt', {'prompt': graph, 'client_id': 'huobao-'+task})
        if not result.get('prompt_id'):
            raise ValueError(json.dumps(result))
        with database() as con:
            con.execute('UPDATE tasks SET prompt_id=?,output=?,duration=? WHERE id=?', (result['prompt_id'],output,duration,task))
    except Exception as error:
        with database() as con:
            con.execute('UPDATE tasks SET error=? WHERE id=?', (str(error)[:6000], task))
    return task

def status(task):
    with database() as con:
        row = con.execute('SELECT * FROM tasks WHERE id=?', (task,)).fetchone()
    if not row:
        raise ValueError('任务不存在')
    if row['error']:
        return {'status': 'failed', 'error': row['error']}
    if not row['prompt_id']:
        return {'status': 'failed', 'error': '提交中断或结果未知，请核对 ComfyUI 队列；不会自动重复提交'}
    history = api(row['host'], '/history/'+row['prompt_id']).get(row['prompt_id'])
    if not history:
        return {'status': 'processing'}
    if history.get('status', {}).get('status_str') == 'error':
        errors = [m[1].get('exception_message', str(m[1])) for m in history['status'].get('messages', []) if m[0] == 'execution_error']
        return {'status': 'failed', 'error': '\n'.join(errors) or 'ComfyUI execution failed'}
    output = history.get('outputs', {}).get(row['output'], {})
    files = output.get('images') or output.get('video') or output.get('videos') or output.get('gifs')
    if not files:
        if history.get('status', {}).get('completed'):
            return {'status': 'failed', 'error': '任务完成但缺少输出文件'}
        return {'status': 'processing'}
    f = files[0]
    url = row['host']+'/view?'+urllib.parse.urlencode({k:f.get(k, '') for k in ['filename','subfolder','type']})
    # ComfyUI outputs are fetched by the platform over the private network.
    return {'status': 'completed', 'imageUrl' if row['kind']=='image' else 'videoUrl': url, 'duration': row['duration']}

class Handler(BaseHTTPRequestHandler):
    def respond(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def authorized(self):
        return bool(TOKEN) and hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+TOKEN)

    def do_GET(self):
        if not self.authorized():
            return self.respond(401, {'error':'Unauthorized'})
        try:
            if self.path == '/health':
                checks = {}
                for name, host in [('image',IMAGE),('video',VIDEO)]:
                    try:
                        checks[name] = {'ok': True, 'queue': api(host, '/queue')}
                    except Exception as e:
                        checks[name] = {'ok': False, 'error':str(e)}
                return self.respond(200 if all(x['ok'] for x in checks.values()) else 503, checks)
            if self.path.startswith('/v1/tasks/'):
                return self.respond(200, status(self.path.split('/')[-1]))
            self.respond(404, {'error':'Not found'})
        except Exception as e:
            self.respond(502, {'error':str(e)})

    def do_POST(self):
        if not self.authorized():
            return self.respond(401, {'error':'Unauthorized'})
        try:
            if self.path not in ('/v1/images','/v1/videos'):
                return self.respond(404, {'error':'Not found'})
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 100*1024*1024:
                return self.respond(413, {'error':'Request too large or empty'})
            record = json.loads(self.rfile.read(length))
            task = submit('image' if self.path.endswith('images') else 'video', record)
            self.respond(200, {'taskId':task})
        except (ValueError, TypeError, KeyError) as e:
            self.respond(400, {'error':str(e)})
        except Exception as e:
            self.respond(502, {'error':str(e)})

if __name__ == '__main__':
    if not TOKEN:
        raise SystemExit('BRIDGE_TOKEN must be configured')
    database().close()
    ThreadingHTTPServer(('0.0.0.0',8090), Handler).serve_forever()
