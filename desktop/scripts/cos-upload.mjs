/**
 * 腾讯 COS(轻量对象存储)XML API 极简上传客户端 — 零外部依赖
 *
 * 用法:
 *   node scripts/cos-upload.mjs --check                          连通性检查(HeadBucket)
 *   node scripts/cos-upload.mjs <本地文件> <桶内Key> [--cache-control "no-cache"]
 *
 * 密钥来源(按优先级): 命令行环境变量 > desktop/.env.local
 *   TENCENT_SECRET_ID / TENCENT_SECRET_KEY
 * 桶与地域(可用环境变量覆盖):
 *   COS_BUCKET(默认 huobao-installer-1304922933)/ COS_REGION(默认 ap-guangzhou)
 *
 * 签名: q-sign-algorithm=sha1(腾讯云 COS XML API 鉴权规范),
 * 只签 host 头,其余头(Cache-Control 等)透传不参与签名。
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DESKTOP = path.resolve(__dirname, '..')

// 读取 desktop/.env.local(KEY=VALUE 行),不覆盖已有环境变量
function loadEnvLocal() {
  const envFile = path.join(DESKTOP, '.env.local')
  if (!fs.existsSync(envFile)) return
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
loadEnvLocal()

const SECRET_ID = process.env.TENCENT_SECRET_ID
const SECRET_KEY = process.env.TENCENT_SECRET_KEY
const BUCKET = process.env.COS_BUCKET || 'huobao-installer-1304922933'
const REGION = process.env.COS_REGION || 'ap-guangzhou'
const HOST = `${BUCKET}.cos.${REGION}.myqcloud.com`

function sha1Hex(input) {
  return crypto.createHash('sha1').update(input).digest('hex')
}
function hmacSha1Hex(key, input) {
  return crypto.createHmac('sha1', key).update(input).digest('hex')
}

/** COS q-signature(仅签 host 头、无 url 参数) */
function authorization(method, uriPathname) {
  const now = Math.floor(Date.now() / 1000)
  const keyTime = `${now - 60};${now + 3600}`
  const signKey = hmacSha1Hex(SECRET_KEY, keyTime)
  const httpString = `${method.toLowerCase()}\n${uriPathname}\n\nhost=${encodeURIComponent(HOST)}\n`
  const stringToSign = `sha1\n${keyTime}\n${sha1Hex(httpString)}\n`
  const signature = hmacSha1Hex(signKey, stringToSign)
  return `q-sign-algorithm=sha1&q-ak=${SECRET_ID}&q-sign-time=${keyTime}&q-key-time=${keyTime}`
    + `&q-header-list=host&q-url-param-list=&q-signature=${signature}`
}

export async function cosPut(localFile, key, { cacheControl, contentType } = {}) {
  const body = fs.readFileSync(localFile)
  const uriPathname = `/${key.split('/').map(encodeURIComponent).join('/')}`
  const headers = {
    'Host': HOST,
    'Authorization': authorization('PUT', uriPathname),
    'Content-Length': String(body.length),
    'Content-MD5': crypto.createHash('md5').update(body).digest('base64'),
  }
  if (cacheControl) headers['Cache-Control'] = cacheControl
  if (contentType) headers['Content-Type'] = contentType

  const res = await fetch(`https://${HOST}${uriPathname}`, {
    method: 'PUT',
    headers,
    body,
    signal: AbortSignal.timeout(600_000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`COS PUT ${key} 失败 HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return `https://${HOST}${uriPathname}`
}

export async function cosHeadBucket() {
  const res = await fetch(`https://${HOST}/`, {
    method: 'HEAD',
    headers: { 'Host': HOST, 'Authorization': authorization('HEAD', '/') },
    signal: AbortSignal.timeout(15_000),
  })
  return res.status
}

export async function cosDelete(key) {
  const uriPathname = `/${key.split('/').map(encodeURIComponent).join('/')}`
  const res = await fetch(`https://${HOST}${uriPathname}`, {
    method: 'DELETE',
    headers: { 'Host': HOST, 'Authorization': authorization('DELETE', uriPathname) },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok && res.status !== 404) throw new Error(`COS DELETE ${key} 失败 HTTP ${res.status}`)
}

// ---- CLI ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  if (!SECRET_ID || !SECRET_KEY) {
    console.error('缺少 TENCENT_SECRET_ID / TENCENT_SECRET_KEY(写入 desktop/.env.local 或环境变量)')
    process.exit(1)
  }
  const args = process.argv.slice(2)
  if (args[0] === '--check') {
    const status = await cosHeadBucket()
    console.log(status === 200 ? `连通正常 ✓ (${HOST})` : `HeadBucket 返回 ${status}(401=密钥错,403=无权限,404=桶名错)`)
    process.exit(status === 200 ? 0 : 1)
  }
  if (args[0] === '--rm') {
    await cosDelete(args[1])
    console.log(`✓ 已删除 ${args[1]}`)
    process.exit(0)
  }
  const [localFile, key] = args
  const ccIdx = args.indexOf('--cache-control')
  const cacheControl = ccIdx >= 0 ? args[ccIdx + 1] : undefined
  if (!localFile || !key || !fs.existsSync(localFile)) {
    console.error('用法: node scripts/cos-upload.mjs <本地文件> <桶内Key> [--cache-control "..."]')
    process.exit(1)
  }
  const start = Date.now()
  const url = await cosPut(localFile, key, { cacheControl })
  const mb = (fs.statSync(localFile).size / 1048576).toFixed(1)
  console.log(`✓ ${path.basename(localFile)} (${mb}MB, ${((Date.now() - start) / 1000).toFixed(0)}s)\n  ${url}`)
}
