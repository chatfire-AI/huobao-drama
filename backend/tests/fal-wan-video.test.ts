import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FalWanVideoAdapter } from '../src/services/adapters/fal-wan-video'

const adapter = new FalWanVideoAdapter()
const config = {
  provider: 'fal-wan-video',
  baseUrl: 'https://queue.fal.run',
  apiKey: 'fal-key',
  model: 'alibaba/wan-3.0/reference-to-video',
}

test('fal Wan 3.0 submits to the queue endpoint with the documented input schema', () => {
  const request = adapter.buildGenerateRequest(config, {
    id: 1,
    prompt: '@图片1女孩 走进@图片2房间',
    referenceImageUrls: JSON.stringify(['https://example.com/1.png', 'https://example.com/2.png']),
    duration: 6,
    aspectRatio: '9:16',
    resolution: '720p',
    generateAudio: false,
    seed: 42,
    promptExtend: false,
  })

  assert.equal(request.url, 'https://queue.fal.run/alibaba/wan-3.0/reference-to-video')
  assert.equal(request.method, 'POST')
  assert.equal(request.headers.Authorization, 'Key fal-key')
  assert.deepEqual(request.body, {
    prompt: 'Image 1女孩 走进Image 2房间',
    reference_image_urls: ['https://example.com/1.png', 'https://example.com/2.png'],
    resolution: '720p',
    aspect_ratio: '9:16',
    duration: 6,
    audio: false,
    enable_prompt_expansion: false,
    enable_safety_checker: false,
    seed: 42,
  })
})

test('fal Wan 3.0 accepts the model id the workbench dropdown sends', () => {
  // The dropdown keys options as `provider/model` and strips the leading provider prefix.
  const request = adapter.buildGenerateRequest(config, { id: 2, prompt: 'a cat', model: 'wan-3.0/reference-to-video' })
  assert.equal(request.url, 'https://queue.fal.run/alibaba/wan-3.0/reference-to-video')
})

test('fal Wan 3.0 accepts a base URL that already carries the endpoint path', () => {
  const request = adapter.buildGenerateRequest(
    { ...config, baseUrl: 'https://queue.fal.run/alibaba/wan-3.0/reference-to-video/' },
    { id: 3, prompt: 'a cat' },
  )
  assert.equal(request.url, 'https://queue.fal.run/alibaba/wan-3.0/reference-to-video')
})

test('fal Wan 3.0 reads a stored request id whose base URL carries a path', () => {
  // A pasted app path or endpoint path must not double up in the poll URL.
  for (const baseUrl of ['https://queue.fal.run/alibaba/wan-3.0', 'https://queue.fal.run/alibaba/wan-3.0/reference-to-video']) {
    const poll = adapter.buildPollRequest({ ...config, baseUrl }, 'req-1')
    assert.equal(poll.url, 'https://queue.fal.run/alibaba/wan-3.0/requests/req-1/status')
  }
})

test('fal Wan 3.0 rejects other fal models and empty input', () => {
  assert.throws(
    () => adapter.buildGenerateRequest({ ...config, model: 'alibaba/wan-3.0/image-to-video' }, { id: 4, prompt: 'a cat' }),
    /supports only alibaba\/wan-3\.0\/reference-to-video/,
  )
  assert.throws(() => adapter.buildGenerateRequest(config, { id: 5 }), /needs a prompt or at least one reference/)
  assert.throws(
    () => adapter.buildGenerateRequest(config, {
      id: 6,
      prompt: 'a cat',
      referenceImageUrls: JSON.stringify(Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.png`)),
    }),
    /reference limits exceeded/,
  )
})

test('fal Wan 3.0 carries the project -1 conventions onto fal fields', () => {
  const request = adapter.buildGenerateRequest(config, { id: 7, prompt: 'a cat', duration: -1, seed: -1 })
  assert.equal(request.body.duration, null)
  assert.equal('seed' in (request.body as object), false)
})

test('fal Wan 3.0 rejects inputs this endpoint would silently drop', () => {
  assert.throws(
    () => adapter.buildGenerateRequest(config, { id: 8, prompt: 'a cat', firstFrameUrl: 'https://example.com/f.png' }),
    /unsupported fields: firstFrameUrl\/imageUrl/,
  )
  assert.throws(
    () => adapter.buildGenerateRequest(config, { id: 9, prompt: 'a cat', referenceFileUrl: 'https://example.com/brief.pdf' }),
    /unsupported fields: referenceFileUrl/,
  )
})

test('fal Wan 3.0 clamps out-of-range duration to the documented window', () => {
  assert.equal(adapter.buildGenerateRequest(config, { id: 10, prompt: 'a cat', duration: 90 }).body.duration, 30)
  assert.equal(adapter.buildGenerateRequest(config, { id: 11, prompt: 'a cat', duration: 1 }).body.duration, 2)
  assert.equal(adapter.buildGenerateRequest(config, { id: 12, prompt: 'a cat' }).body.duration, 5)
})

test('fal Wan 3.0 polls the queue status and reads status envelopes', () => {
  const poll = adapter.buildPollRequest(config, 'req-1')
  assert.equal(poll.url, 'https://queue.fal.run/alibaba/wan-3.0/requests/req-1/status')
  assert.equal(poll.method, 'GET')
  assert.equal(poll.headers.Authorization, 'Key fal-key')

  assert.deepEqual(adapter.parsePollResponse({ status: 'IN_QUEUE', queue_position: 2 }), { status: 'pending' })
  assert.deepEqual(adapter.parsePollResponse({ status: 'IN_PROGRESS' }), { status: 'processing' })

  const generated = adapter.parsePollResponse({ status: 'COMPLETED', metrics: { inference_time: 40 } })
  assert.equal(generated.status, 'completed')
  assert.equal(generated.videoUrl, undefined)

  const failed = adapter.parsePollResponse({ status: 'COMPLETED', error: 'content flagged', error_type: 'content_policy' })
  assert.equal(failed.status, 'failed')
  assert.match(failed.error, /content_policy: content flagged/)
})

test('fal Wan 3.0 reads the video URL from the result endpoint', () => {
  const submit = adapter.parseGenerateResponse({ request_id: 'req-1', status_url: 'https://queue.fal.run/s', response_url: 'https://queue.fal.run/r' })
  assert.deepEqual(submit, { isAsync: true, taskId: 'req-1' })

  const result = adapter.buildResultRequest(config, 'req-1')
  assert.equal(result.url, 'https://queue.fal.run/alibaba/wan-3.0/requests/req-1')
  assert.equal(result.method, 'GET')

  const payload = { video: { url: 'https://fal.media/video.mp4' }, seed: 7, duration: 6 }
  assert.equal(adapter.extractVideoUrl(payload), 'https://fal.media/video.mp4')
  assert.equal(adapter.extractVideoUrl({ video: {} }), null)
  assert.equal(adapter.extractVideoUrl({ data: payload }), 'https://fal.media/video.mp4')
})

test('fal Wan 3.0 reads a status value in any case, wrapped or not', () => {
  // A case or shape the adapter does not match means polling the status forever while the
  // provider has finished, so every form must land on the right status.
  assert.equal(adapter.parsePollResponse({ status: 'completed' }).status, 'completed')
  assert.equal(adapter.parsePollResponse({ status: 'Completed' }).status, 'completed')
  assert.equal(adapter.parsePollResponse({ status: 'in_progress' }).status, 'processing')
  assert.equal(adapter.parsePollResponse({ status: 'in_queue' }).status, 'pending')
  assert.equal(adapter.parsePollResponse({ status: 'completed', error: 'flagged' }).status, 'failed')

  const wrapped = adapter.parsePollResponse({ data: { status: 'completed', duration: 6 } })
  assert.deepEqual(wrapped, { status: 'completed', duration: 6 })
  const wrappedOutput = adapter.parsePollResponse({ data: { video: { url: 'https://fal.media/w.mp4' } } })
  assert.equal(wrappedOutput.videoUrl, 'https://fal.media/w.mp4')
})
