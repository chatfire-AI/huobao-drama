/**
 * 一键发布 — GitHub Releases(海外) + 腾讯 COS(国内) 双通道
 *
 * 用法(在 desktop/ 下执行):
 *   npm run publish [-- --notes "更新说明"] [-- --skip-gh]
 *
 * 前置:
 *   - desktop/release/ 已有本版本产物(npm run dist / dist:win 之后)
 *   - gh 已登录(上传 GitHub);desktop/.env.local 已配 TENCENT_SECRET_ID/KEY(上传 COS)
 *
 * 产物布局:
 *   GitHub: vX.Y.Z Release(空格文件名自动规范化为点号,见 make-update-feed)
 *   COS:    huobao-drama/vX.Y.Z/<点号文件名> + huobao-drama/latest.json(指向 COS 直链)
 *
 * 国内下载基址(COS_BASE_URL)与更新器兜底源保持一致,将来绑自定义域名/加 CDN 只改这一处。
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { cosPut } from './cos-upload.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DESKTOP = path.resolve(__dirname, '..')
const RELEASE = path.join(DESKTOP, 'release')

/** 国内下载基址：默认使用安装包 CDN，可被 COS_BASE_URL 覆盖。 */
const COS_BASE_URL = process.env.COS_BASE_URL || 'https://installer.firemux.site/huobao-drama'
const COS_KEY_PREFIX = 'huobao-drama'

const pkg = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'package.json'), 'utf8'))
const version = pkg.version
const tag = `v${version}`

const argv = process.argv.slice(2)
function argOf(flag) { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
const notes = argOf('--notes') || ''
const skipGh = argv.includes('--skip-gh')

// 与 make-update-feed 相同的产物清单。注意 electron-builder 的 NSIS 本地产物带空格
// （HuobaoDrama Setup X.Y.Z.exe），GitHub 服务端会规范化为点号；COS key/URL 需自行归一化
const assets = [
  `HuobaoDrama-${version}-arm64.dmg`,
  `HuobaoDrama-${version}.dmg`,
  `HuobaoDrama-${version}-arm64-mac.zip`,
  `HuobaoDrama-${version}-mac.zip`,
  `HuobaoDrama Setup ${version}.exe`,
]
// URL/COS key 使用的规范化文件名（空格 → 点号，与 GitHub 服务端一致）
const dotName = (f) => f.replace(/ /g, '.')
const existing = assets.filter(f => fs.existsSync(path.join(RELEASE, f)))
if (existing.length !== assets.length) {
  console.error(`发布需要全部平台产物，缺少: ${assets.filter(f => !existing.includes(f)).join(', ')}`)
  process.exit(1)
}

// ---- 1. GitHub(海外通道) ----
if (!skipGh) {
  console.log(`[1/3] GitHub Release ${tag} …`)
  // gh release upload 要求 Release 已存在，不存在则先创建（--clobber 才能重复传）
  try {
    execFileSync('gh', ['release', 'view', tag], { stdio: 'ignore' })
  } catch {
    console.log(`  Release 不存在，先创建 …`)
    execFileSync('gh', ['release', 'create', tag, '--title', tag, '--notes', notes || tag], { stdio: 'inherit' })
  }
  const ghArgs = ['release', 'upload', tag, ...existing.map(f => path.join(RELEASE, f)), '--clobber']
  execFileSync('gh', ghArgs, { stdio: 'inherit' })
  console.log(`  ✓ 已上传 ${existing.length} 个资产`)
}

// ---- 2. latest.json(双通道各一份:GitHub 版指向 GitHub,COS 版指向 COS) ----
console.log('[2/3] 生成更新清单 latest.json …')
async function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    fs.createReadStream(file).on('data', c => hash.update(c)).on('end', () => resolve(hash.digest('hex'))).on('error', reject)
  })
}
const buildFeed = async (baseUrl) => {
  const platforms = {}
  for (const f of existing) {
    const key = f.includes('Setup') ? 'win32-x64'
      : f.includes('-arm64') ? 'darwin-arm64'
      : 'darwin-x64'
    // 同一平台 dmg/zip 都存在时只取 zip(更新器用),dmg 是给手动安装的
    if (key !== 'win32-x64' && !f.endsWith('.zip')) continue
    platforms[key] = {
      url: `${baseUrl}/${encodeURIComponent(dotName(f))}`,
      sha256: await sha256(path.join(RELEASE, f)),
      size: fs.statSync(path.join(RELEASE, f)).size,
    }
  }
  return { version, notes, platforms }
}

// GitHub 版(沿用 make-update-feed 的 base-url 约定)
const ghFeed = await buildFeed(`https://github.com/chatfire-AI/huobao-drama/releases/download/${tag}`)
fs.writeFileSync(path.join(RELEASE, 'latest.json'), JSON.stringify(ghFeed, null, 2))
if (!skipGh) execFileSync('gh', ['release', 'upload', tag, path.join(RELEASE, 'latest.json'), '--clobber'], { stdio: 'inherit' })

// COS 版(桶内固定路径 latest.json,更新器国内源入口)
const cosFeed = await buildFeed(`${COS_BASE_URL}/v${version}`)
fs.writeFileSync(path.join(RELEASE, 'latest.cos.json'), JSON.stringify(cosFeed, null, 2))
console.log(`  ✓ latest.json(GitHub) / latest.cos.json(COS) 平台: ${Object.keys(cosFeed.platforms).join(', ')}`)

// ---- 3. COS(国内通道) ----
console.log('[3/3] 上传腾讯 COS …')
for (const f of existing) {
  await cosPut(path.join(RELEASE, f), `${COS_KEY_PREFIX}/v${version}/${dotName(f)}`, {
    cacheControl: 'public, max-age=2592000', // 安装包按版本命名内容不变,缓存 30 天
  })
  console.log(`  ✓ v${version}/${dotName(f)}`)
}
await cosPut(path.join(RELEASE, 'latest.cos.json'), `${COS_KEY_PREFIX}/latest.json`, {
  cacheControl: 'no-cache', // 更新发现入口,必须实时
})
console.log(`  ✓ latest.json (no-cache)`)

// 官网使用脚本清单跨域加载，无需修改 COS 桶级 CORS。安装包全部上传后才更新。
const websiteRelease = {
  version,
  downloads: {
    'darwin-arm64': `${COS_BASE_URL}/${tag}/HuobaoDrama-${version}-arm64.dmg`,
    'darwin-x64': `${COS_BASE_URL}/${tag}/HuobaoDrama-${version}.dmg`,
    'win32-x64': `${COS_BASE_URL}/${tag}/HuobaoDrama.Setup.${version}.exe`,
  },
}
const websiteFeedPath = path.join(RELEASE, 'latest.js')
fs.writeFileSync(websiteFeedPath, `window.huobaoDramaRelease(${JSON.stringify(websiteRelease)});\n`)
await cosPut(websiteFeedPath, `${COS_KEY_PREFIX}/latest.js`, {
  cacheControl: 'no-cache',
  contentType: 'application/javascript; charset=utf-8',
})
console.log('  ✓ latest.js (官网自动下载清单)')

console.log(`
发布完成:
  海外  https://github.com/chatfire-AI/huobao-drama/releases/${tag}
  国内  ${COS_BASE_URL}/latest.json
`)
