import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { STORAGE_ROOT } from '../utils/paths.js'
import { ffmpeg, checkFfmpegSuite } from '../utils/ffmpeg.js'

const MAX_BYTES = 15 * 1024 * 1024
const INLINE_PROVIDERS = new Set(['volcengine', 'minimax'])

function localAudioPath(url: string): string | null {
  if (!/^\/?static\//.test(url)) return null
  const file = path.resolve(STORAGE_ROOT, url.replace(/^\/?static\//, ''))
  if (!file.startsWith(path.resolve(STORAGE_ROOT) + path.sep)) throw new Error('无效的本地音色路径')
  return file
}

function publicAudioUrl(url: string): string {
  const base = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//.test(base)) {
    throw new Error('当前视频模型需要公网音色地址。请配置后端 PUBLIC_BASE_URL，或切换至支持本地音色的 Seedance 2.0 / MiniMax H3。')
  }
  return `${base}/${url.replace(/^\//, '')}`
}

/** Validate before creating a paid task. M4A/AAC samples are converted without trimming the voice. */
export async function prepareReferenceAudio(refs: string[] | undefined, provider: string): Promise<string[]> {
  const urls = [...new Set((refs || []).map(url => url.trim()).filter(Boolean))]
  const minSeconds = provider === 'aliyun' ? 1 : 2
  let durationSum = 0
  const prepared: string[] = []
  for (const url of urls) {
    const file = localAudioPath(url)
    if (!file) { prepared.push(url); continue }
    if (!INLINE_PROVIDERS.has(provider)) publicAudioUrl(url)
    let size: number
    try { size = (await fs.stat(file)).size } catch { throw new Error('角色音色文件不存在，请重新上传音色') }
    const ext = path.extname(file).toLowerCase()
    if (!['.mp3', '.wav', '.m4a', '.aac'].includes(ext)) throw new Error('参考音色仅支持 MP3、WAV、M4A 或 AAC')
    if (size > 20 * 1024 * 1024) throw new Error('音色文件过大，请上传不超过 20MB 的音频')
    const suite = await checkFfmpegSuite()
    if (!suite.ffprobe) throw new Error('音色校验需要 FFprobe，请修复后端 FFprobe 配置后重试')
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(file, (error, metadata) => {
        if (error || !metadata.streams.some(stream => stream.codec_type === 'audio')) {
          reject(new Error('无法读取音色文件，请上传有效的人声音频')); return
        }
        resolve(Number(metadata.format.duration))
      })
    })
    if (!Number.isFinite(duration) || duration < minSeconds || duration > 15) {
      throw new Error(`当前模型要求每段参考音色为 ${minSeconds}–15 秒，请裁剪或重新上传`)
    }
    durationSum += duration
    if (durationSum > 15.05) throw new Error('本次引用的音色总时长不能超过 15 秒，请减少引用或缩短音色样本')
    if (ext === '.wav' || ext === '.mp3') {
      if (size > MAX_BYTES) throw new Error('当前模型要求每段参考音色不超过 15MB，请压缩或重新上传')
      prepared.push(url.replace(/^\//, ''))
      continue
    }
    if (!suite.ffmpeg) throw new Error('M4A / AAC 音色需要 FFmpeg 转换，请修复配置或上传 WAV / MP3')
    const hash = createHash('sha256').update(await fs.readFile(file)).digest('hex')
    const relative = `static/voice-references/${hash}.wav`
    const target = localAudioPath(relative)!
    await fs.mkdir(path.dirname(target), { recursive: true })
    try { await fs.access(target) } catch {
      const temporary = `${target}.${randomUUID()}.wav`
      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(file).noVideo().audioChannels(1).audioFrequency(48000).audioCodec('pcm_s16le')
            .format('wav').on('end', () => resolve()).on('error', () => reject(new Error('音色转换失败，请改用 WAV / MP3 文件'))).save(temporary)
        })
        await fs.rename(temporary, target)
      } finally { await fs.rm(temporary, { force: true }) }
    }
    prepared.push(relative)
  }
  return prepared
}

/** Seedance 2.0 / MiniMax H3 accept audio data URLs; Wan requires a public/OSS URL.
 * https://docs.volcengine.com/docs/ark/create-video-generation-task-api
 * https://platform.minimax.cn/docs/api-reference/video-generation-v2-create
 * https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference
 */
export async function resolveReferenceAudioUrls(refs: string[] | undefined, provider: string): Promise<string[]> {
  return Promise.all((refs || []).map(async url => {
    const file = localAudioPath(url)
    if (!file) return url
    if (!INLINE_PROVIDERS.has(provider)) return publicAudioUrl(url)
    const bytes = await fs.readFile(file)
    if (bytes.length > MAX_BYTES) throw new Error('参考音色不能超过 15MB')
    const format = path.extname(file).toLowerCase() === '.mp3' ? 'mp3' : 'wav'
    return `data:audio/${format};base64,${bytes.toString('base64')}`
  }))
}
