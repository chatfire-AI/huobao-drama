import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GrokVideoAdapter } from '../src/services/adapters/grok-video'

const adapter = new GrokVideoAdapter()
const config = { provider: 'grok', baseUrl: 'https://relay.example/xai/v1/', apiKey: 'test', model: 'grok-imagine-video-1.5' }

test('xAI request preserves all 14 references, maps labels and handles first-frame offset', () => {
  const refs = Array.from({ length: 14 }, (_, n) => `data:image/png;base64,${n}`)
  const request = adapter.buildGenerateRequest(config, { id: 1, prompt: '@图片1角色看向@图片14道具', referenceImageUrls: JSON.stringify(refs), firstFrameUrl: 'https://example.com/first.png', duration: 5, generateAudio: false })
  assert.equal(request.url, 'https://relay.example/xai/v1/videos/generations')
  assert.deepEqual(request.body.reference_images, refs.map(url => ({ url })))
  assert.equal(request.body.prompt, '<IMAGE_1>角色看向<IMAGE_14>道具')
  assert.equal(request.body.generate_audio, false)
  assert.equal(adapter.buildGenerateRequest(config, { id: 1, prompt: 'test' }).body.generate_audio, true)
})

test('invalid combinations fail before submission rather than dropping assets', () => {
  const refs = JSON.stringify(Array(15).fill('https://example.com/image.png'))
  assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, referenceImageUrls: refs }), /14/)
  assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, prompt: 'test', duration: 16 }), /1–15/)
  assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, referenceImageUrls: '["x"]', resolution: '1080p' }), /720p/)
  assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, model: 'grok-imagine-video', referenceImageUrls: '["x"]', duration: 11 }), /1–10/)
  assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, referenceAudioUrls: '["x"]' }), /参考音视频/)
})

test('async lifecycle parses native IDs, output and terminal errors', () => {
  assert.deepEqual(adapter.parseGenerateResponse({ request_id: 'abc' }), { isAsync: true, taskId: 'abc' })
  assert.equal(adapter.buildPollRequest(config, 'abc/def').url, 'https://relay.example/xai/v1/videos/abc%2Fdef')
  assert.equal(adapter.parsePollResponse({ status: 'pending' }).status, 'processing')
  assert.deepEqual(adapter.parsePollResponse({ status: 'done', video: { url: 'https://example.com/out.mp4', duration: 5 } }), { status: 'completed', videoUrl: 'https://example.com/out.mp4', duration: 5 })
  assert.equal(adapter.parsePollResponse({ status: 'failed', error: { code: 'internal_error', message: 'upstream failed' } }).error, 'upstream failed')
  assert.equal(adapter.parsePollResponse({ status: 'done', video: {} }).status, 'failed')
  assert.throws(() => adapter.parseGenerateResponse({ task_id: 'wrong-protocol' }), /request_id/)
})
