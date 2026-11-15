/**
 * 生成应用内更新器使用的版本清单 latest.json
 *
 * 用法：npm run dist / dist:win 完成后执行 `node scripts/make-update-feed.mjs`
 *   --base-url <url>  下载基址，默认 GitHub Releases 直链
 *                     （https://github.com/<owner>/<repo>/releases/download/v<version>）
 *   --notes "文本"    本次更新说明
 *
 * 产物 release/latest.json 结构：
 * { version, notes, platforms: { "<platform>-<arch>": { url, sha256, size } } }
 *
 * 发布：把 latest.json 与安装包一起上传到 GitHub Release（tag 形如 v1.0.1），
 * 更新器默认拉 releases/latest/download/latest.json 即完成推送。
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DESKTOP = path.resolve(__dirname, '..')
const RELEASE = path.join(DESKTOP, 'release')

const argv = process.argv.slice(2)
function argOf(flag) {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const pkg = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'package.json'), 'utf8'))
const version = pkg.version
const repo = process.env.GITHUB_REPO || 'chatfire-AI/huobao-drama'
const baseUrl = argOf('--base-url')
  || process.env.UPDATE_BASE_URL
  || `https://github.com/${repo}/releases/download/v${version}`
const notes = argOf('--notes') || ''

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    fs.createReadStream(file)
      .on('data', chunk => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

// 平台键（与更新器 process.platform-process.arch 一致）→ 产物文件名
// （electron-builder 的 mac zip 命名带 -mac 后缀）
const targets = [
  { key: 'darwin-arm64', file: `HuobaoDrama-${version}-arm64-mac.zip` },
  { key: 'darwin-x64', file: `HuobaoDrama-${version}-mac.zip` },
  { key: 'win32-x64', file: `HuobaoDrama Setup ${version}.exe` },
]

const platforms = {}
const missing = []
for (const t of targets) {
  const file = path.join(RELEASE, t.file)
  if (!fs.existsSync(file)) {
    missing.push(t.file)
    continue
  }
  platforms[t.key] = {
    // GitHub 上传资产时会把空格规范化为点号(gh CLI 与 API 均如此,无法保留空格),
    // URL 必须按服务端实际资产名生成,否则下载 404
    url: `${baseUrl}/${encodeURIComponent(t.file.replace(/ /g, '.'))}`,
    sha256: await sha256(file),
    size: fs.statSync(file).size,
  }
}

if (missing.length === targets.length) {
  console.error('release/ 下没有任何更新产物，请先运行 npm run dist / dist:win')
  process.exit(1)
}

const feed = { version, notes, platforms }
const out = path.join(RELEASE, 'latest.json')
fs.writeFileSync(out, JSON.stringify(feed, null, 2))
console.log(`latest.json ✓ (${Object.keys(platforms).length} 平台)`)
if (missing.length) console.warn(`缺失产物（未纳入清单）: ${missing.join(', ')}`)
console.log(out)
