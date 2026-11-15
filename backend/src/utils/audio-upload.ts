import { saveUploadedFile } from './storage.js'

export const AUDIO_MAX_BYTES = 20 * 1024 * 1024
const AUDIO_EXT = new Set(['.mp3', '.wav', '.m4a', '.aac'])
const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/x-aac'])

export class AudioUploadError extends Error {}

/** 音色与视频参考音频共用上传规则，文件名仅用于显示，磁盘使用 UUID。 */
export async function saveAudioUpload(file: unknown) {
  if (!(file instanceof File)) throw new AudioUploadError('文件必填')
  const name = file.name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255)
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const mime = file.type.toLowerCase()
  if (!AUDIO_EXT.has(ext) || (mime && mime !== 'application/octet-stream' && !AUDIO_MIME.has(mime))) {
    throw new AudioUploadError('仅支持 .mp3/.wav/.m4a/.aac 格式的音频文件')
  }
  if (!file.size) throw new AudioUploadError('音频文件不能为空')
  if (file.size > AUDIO_MAX_BYTES) throw new AudioUploadError('音频文件大小不能超过 20MB')
  const path = await saveUploadedFile(await file.arrayBuffer(), 'uploads', `voice${ext}`)
  return { path, name, url: `/${path}` }
}
