import assert from 'node:assert/strict'
import { test } from 'node:test'
import { VolcEngineVideoAdapter } from '../src/services/adapters/volcengine-video'

const adapter = new VolcEngineVideoAdapter()
const config = {
  provider: 'volcengine',
  baseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
  apiKey: 'test-key',
  model: 'dreamina-seedance-2-5-260628',
}

test('BytePlus submits the original model ID and references to the regional endpoint', () => {
  const request = adapter.buildGenerateRequest(config, {
    id: 1, prompt: 'A scholar turns toward a lantern', duration: 20,
    resolution: '1080p', aspectRatio: '9:16', generateAudio: false,
    referenceImageUrls: JSON.stringify(['https://example.com/scholar.png']),
  })
  assert.equal(request.url, `${config.baseUrl}/contents/generations/tasks`)
  assert.equal(request.headers.Authorization, 'Bearer test-key')
  assert.deepEqual(request.body, {
    model: config.model,
    content: [
      { type: 'text', text: 'A scholar turns toward a lantern' },
      { type: 'image_url', image_url: { url: 'https://example.com/scholar.png' }, role: 'reference_image' },
    ],
    generate_audio: false, ratio: '9:16', duration: 20, resolution: '1080p', watermark: false,
  })
})

test('2.5 Flash uses 30-second duration but falls back from 1080p to 720p', () => {
  const request = adapter.buildGenerateRequest(config, {
    id: 1, model: 'dreamina-seedance-2-5-flash-261115', prompt: 'Rain',
    duration: 40, resolution: '1080p',
  })
  assert.equal(request.body.duration, 30)
  assert.equal(request.body.resolution, '720p')
})

test('existing mainland and BytePlus 2.0 settings retain their duration and resolution', () => {
  for (const model of ['doubao-seedance-2-0-mini-260615', 'dreamina-seedance-2-0-fast-260128']) {
    const request = adapter.buildGenerateRequest(config, {
      id: 1, model, prompt: 'Rain', duration: 20, resolution: '1080p',
    })
    assert.equal(request.body.model, model)
    assert.equal(request.body.duration, 15)
    assert.equal(request.body.resolution, '720p')
  }
})

test('unsupported model families are rejected before an upstream request', () => {
  for (const model of ['seedance-1-0-pro', 'dreamina-seedance-2-50-260628', 'other-model']) {
    assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, model, prompt: 'Rain' }), /仅支持/)
  }
})

test('duration defaults and lower bound remain valid', () => {
  for (const [duration, expected] of [[undefined, 5], [NaN, 5], [-2, 4], [6.4, 6]] as const) {
    assert.equal(adapter.buildGenerateRequest(config, { id: 1, prompt: 'Rain', duration }).body.duration, expected)
  }
})

test('both base URL forms produce the same create and polling paths', () => {
  for (const baseUrl of ['https://ark.ap-southeast.bytepluses.com', config.baseUrl + '/']) {
    const cfg = { ...config, baseUrl }
    assert.equal(adapter.buildGenerateRequest(cfg, { id: 1, prompt: 'Rain' }).url,
      `${config.baseUrl}/contents/generations/tasks`)
    assert.equal(adapter.buildPollRequest(cfg, 'task-123').url,
      `${config.baseUrl}/contents/generations/tasks/task-123`)
  }
  assert.deepEqual(adapter.parseGenerateResponse({ id: 'task-123' }), { isAsync: true, taskId: 'task-123' })
  assert.deepEqual(adapter.parsePollResponse({ status: 'succeeded', content: { video_url: 'https://example.com/video.mp4' } }),
    { status: 'completed', videoUrl: 'https://example.com/video.mp4' })
  assert.deepEqual(adapter.parsePollResponse({ status: 'failed', error: { code: 'Denied', message: 'Not available' } }),
    { status: 'failed', error: '[Denied] Not available' })
})
