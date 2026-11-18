"""Run on node0 after containers start; installs only local image/video configs."""
import json
import urllib.request
from pathlib import Path

token = dict(line.split('=',1) for line in Path('.env').read_text().splitlines() if '=' in line)['BRIDGE_TOKEN']
base = 'http://192.168.110.148:5679/api/v1'
def call(path, body=None):
    req = urllib.request.Request(base+path, json.dumps(body).encode() if body else None, {'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
existing = call('/ai-configs')['data']
for kind, models in [('image',['qwen-image-2512','qwen-image-edit-2509']),('video',['wan2.2-i2v-14b'])]:
    if not any(x['provider']=='comfyui' and x['service_type']==kind for x in existing):
        result=call('/ai-configs',{'service_type':kind,'provider':'comfyui','name': '本地 GB10 · '+('Qwen Image / Edit' if kind=='image' else 'Wan 2.2 静音图生视频'),'base_url':'http://comfy-bridge:8090','api_key':token,'model':models,'priority':100})
        print('Configured',kind,'id',result['data']['id'])
print('Local providers configured. Text model remains unconfigured.')
