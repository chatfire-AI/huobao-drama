import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isAsciiPath, stageRuntimeResources } from '../src/runtime-resources.js'

function makeResources(root: string): string {
  const resources = path.join(root, '中文安装目录', 'resources')
  fs.mkdirSync(path.join(resources, 'app.asar.unpacked', 'node_modules', 'native'), { recursive: true })
  fs.mkdirSync(path.join(resources, 'frontend'), { recursive: true })
  fs.mkdirSync(path.join(resources, 'workspace-template', 'prompts'), { recursive: true })
  fs.mkdirSync(path.join(resources, 'bin'), { recursive: true })
  fs.writeFileSync(path.join(resources, 'app.asar'), 'asar-v1')
  fs.writeFileSync(path.join(resources, 'app.asar.unpacked', 'node_modules', 'native', 'module.node'), 'native')
  fs.writeFileSync(path.join(resources, 'frontend', 'index.html'), 'frontend-v1')
  fs.writeFileSync(path.join(resources, 'workspace-template', 'prompts', 'agent.md'), 'prompt')
  fs.writeFileSync(path.join(resources, 'bin', 'ffmpeg.exe'), 'ffmpeg')
  fs.writeFileSync(path.join(resources, 'bin', 'ffprobe.exe'), 'ffprobe')
  return resources
}

test('ASCII detection only accepts paths safe for native runtime loading', () => {
  assert.equal(isAsciiPath('C:\\Program Files\\HuobaoDrama'), true)
  assert.equal(isAsciiPath('C:\\用户\\HuobaoDrama'), false)
  assert.equal(isAsciiPath('D:\\应用\\HuobaoDrama'), false)
})

test('runtime staging copies every backend dependency, reuses cache and refreshes on package change', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-runtime-'))
  try {
    const resources = makeResources(root)
    const options = { version: '1.0.0', userDataDir: path.join(root, 'userData') }
    const staged = stageRuntimeResources(resources, options)
    assert.equal(isAsciiPath(staged), true)
    for (const file of [
      'app.asar',
      'app.asar.unpacked/node_modules/native/module.node',
      'frontend/index.html',
      'workspace-template/prompts/agent.md',
      'bin/ffmpeg.exe',
      'bin/ffprobe.exe',
    ]) assert.equal(fs.existsSync(path.join(staged, file)), true, file)

    fs.writeFileSync(path.join(resources, 'frontend', 'index.html'), 'frontend-v2')
    assert.equal(stageRuntimeResources(resources, options), staged)
    assert.equal(fs.readFileSync(path.join(staged, 'frontend', 'index.html'), 'utf8'), 'frontend-v1')

    fs.appendFileSync(path.join(resources, 'app.asar'), '-updated')
    assert.equal(stageRuntimeResources(resources, options), staged)
    assert.equal(fs.readFileSync(path.join(staged, 'frontend', 'index.html'), 'utf8'), 'frontend-v2')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('a Chinese user profile falls back to an ASCII ProgramData runtime cache', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-runtime-fallback-'))
  try {
    const resources = makeResources(root)
    const programData = path.join(root, 'ProgramData')
    const staged = stageRuntimeResources(resources, {
      version: '1.0.0',
      userDataDir: path.join(root, '中文用户', 'HuobaoDrama'),
      programDataDir: programData,
    })
    assert.equal(isAsciiPath(staged), true)
    assert.ok(staged.startsWith(path.join(programData, 'HuobaoDrama')))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
