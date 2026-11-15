import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { assertWindowsX64 } from '../scripts/validate-windows-package.mjs'

test('Windows packaging rejects host Mach-O, truncated PE and x86 binaries', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-pe-test-'))
  const file = path.join(dir, 'module.node')
  try {
    for (const bytes of [Buffer.from([0xcf,0xfa,0xed,0xfe]), Buffer.from('MZ'), Buffer.alloc(64)]) {
      fs.writeFileSync(file,bytes);assert.throws(()=>assertWindowsX64(file),/Windows x64 PE/)
    }
    const bytes=Buffer.alloc(128);bytes.write('MZ');bytes.writeUInt32LE(64,60);bytes.write('PE\0\0',64);bytes.writeUInt16LE(0x14c,68)
    fs.writeFileSync(file,bytes);assert.throws(()=>assertWindowsX64(file),/Windows x64 PE/)
    bytes.writeUInt16LE(0x8664,68);fs.writeFileSync(file,bytes)
    assert.deepEqual(assertWindowsX64(file),bytes)
  } finally { fs.rmSync(dir,{recursive:true,force:true}) }
})
