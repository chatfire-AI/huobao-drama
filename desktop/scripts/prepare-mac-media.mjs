import fs from 'node:fs'
import path from 'node:path'
import { execFile, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'
import { createGunzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'

const run = promisify(execFile)
const require = createRequire(import.meta.url)
const release = require('ffmpeg-static/package.json')['ffmpeg-static']['binary-release-tag']

export function assertMacArchitecture(file, arch) {
  execFileSync('lipo', ['-verify_arch', arch === 'x64' ? 'x86_64' : arch, file], { stdio: 'pipe' })
}

export async function prepareMacMedia(desktop, resources) {
  // npm skips optional binaries for the other CPU even when they are declared.
  // Fetch exact versions from sharp's dependency map before cross-packaging.
  const optional = require('sharp/package.json').optionalDependencies
  for (const arch of ['arm64', 'x64']) {
    for (const name of [`sharp-darwin-${arch}`, `sharp-libvips-darwin-${arch}`]) {
      const destination = path.join(desktop, 'node_modules', '@img', name)
      if (fs.existsSync(path.join(destination, 'package.json'))) continue
      const cache = path.join(desktop, 'build', 'mac-native', name)
      fs.mkdirSync(cache, { recursive: true })
      const { stdout } = await run('npm', ['pack', `@img/${name}@${optional[`@img/${name}`]}`,
        '--ignore-scripts', '--json', '--registry=https://registry.npmjs.org', '--pack-destination', cache])
      const [{ filename }] = JSON.parse(stdout)
      fs.mkdirSync(destination, { recursive: true })
      await run('tar', ['-xzf', path.join(cache, filename), '--strip-components=1', '-C', destination])
      console.log(`[native] ${name} ✓`)
    }
  }
  await Promise.all(['arm64', 'x64'].flatMap(arch => ['ffmpeg', 'ffprobe'].map(async name => {
    const cache = path.join(desktop, 'build', 'mac-bin', release, arch)
    const binary = path.join(cache, name)
    fs.mkdirSync(cache, { recursive: true })
    if (!fs.existsSync(binary)) {
      const archive = `${binary}.gz.part`
      const temporary = `${binary}.part`
      try {
        console.log(`[media] downloading ${name} for macOS ${arch} (${release})`)
        await run('curl', ['--fail', '--location', '--silent', '--show-error', '--retry', '3',
          '--connect-timeout', '15', '--max-time', '300', '--output', archive,
          `https://github.com/eugeneware/ffmpeg-static/releases/download/${release}/${name}-darwin-${arch}.gz`])
        await pipeline(fs.createReadStream(archive), createGunzip(), fs.createWriteStream(temporary))
        assertMacArchitecture(temporary, arch)
        fs.chmodSync(temporary, 0o755)
        fs.renameSync(temporary, binary)
      } finally {
        fs.rmSync(archive, { force: true })
        fs.rmSync(temporary, { force: true })
      }
    }
    assertMacArchitecture(binary, arch)
    const dest = path.join(resources, `bin-mac-${arch}`)
    fs.mkdirSync(dest, { recursive: true })
    fs.copyFileSync(binary, path.join(dest, name))
    fs.chmodSync(path.join(dest, name), 0o755)
    console.log(`[media] ${arch}/${name} ✓`)
  })))
}
