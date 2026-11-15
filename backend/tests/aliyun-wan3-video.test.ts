import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AliyunWanVideoAdapter } from '../src/services/adapters/aliyun-wan-video'

const adapter = new AliyunWanVideoAdapter()
const config = {
  provider: 'aliyun',
  baseUrl: 'https://ws-123.cn-beijing.maas.aliyuncs.com',
  apiKey: 'sk-test',
  model: 'wan3.0-video-prime',
}

test('Wan 3.0 request follows the official input/media/parameters contract', () => {
  const request = adapter.buildGenerateRequest(config, {
    id: 1,
    prompt: '@图片1女孩 走进视频1的房间',
    referenceImageUrls: JSON.stringify(['https://example.com/1.png']),
    referenceVideoUrls: JSON.stringify(['https://example.com/1.mp4']),
    referenceAudioUrls: JSON.stringify(['https://example.com/1.mp3']),
    referenceFileUrl: 'https://example.com/brief.pdf',
    duration: -1,
    aspectRatio: 'adaptive',
    resolution: '1080p',
    generateAudio: false,
    seed: 42,
    promptExtend: false,
    watermark: true,
  })

  assert.equal(request.url, 'https://ws-123.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis')
  assert.equal(request.method, 'POST')
  assert.equal(request.headers.Authorization, 'Bearer sk-test')
  assert.equal(request.headers['X-DashScope-Async'], 'enable')
  assert.deepEqual(request.body, {
    model: 'wan3.0-video-prime',
    input: {
      prompt: '图1女孩 走进视频1的房间',
      media: [
        { type: 'reference_image', url: 'https://example.com/1.png' },
        { type: 'reference_video', url: 'https://example.com/1.mp4' },
        { type: 'reference_audio', url: 'https://example.com/1.mp3' },
        { type: 'file', url: 'https://example.com/brief.pdf' },
      ],
    },
    parameters: {
      resolution: '1080P',
      ratio: 'adaptive',
      duration: -1,
      audio: false,
      prompt_extend: false,
      watermark: true,
      seed: 42,
    },
  })
})

test('Wan 3.0 supports official first/last frame mode and rejects mixed media modes', () => {
  const request = adapter.buildGenerateRequest(config, {
    id: 2,
    prompt: '从白天过渡到黑夜',
    firstFrameUrl: 'data:image/png;base64,first',
    lastFrameUrl: 'data:image/png;base64,last',
  })

  assert.deepEqual(request.body.input.media, [
    { type: 'first_frame', url: 'data:image/png;base64,first' },
    { type: 'last_frame', url: 'data:image/png;base64,last' },
  ])
  assert.throws(() => adapter.buildGenerateRequest(config, {
    id: 3,
    firstFrameUrl: 'https://example.com/first.png',
    referenceAudioUrls: JSON.stringify(['https://example.com/ref.mp3']),
  }), /first_frame\/last_frame/)
})

test('Wan 3.0 parses official async creation and polling responses', () => {
  assert.deepEqual(adapter.parseGenerateResponse({
    output: { task_status: 'PENDING', task_id: 'task-123' },
    request_id: 'request-1',
  }), { isAsync: true, taskId: 'task-123' })

  assert.deepEqual(adapter.parsePollResponse({
    output: { task_status: 'SUCCEEDED', video_url: 'https://example.com/result.mp4' },
    usage: { output_video_duration: 7.5, fps: 30, SR: 1080, ratio: '16:9' },
    request_id: 'request-2',
  }), { status: 'completed', videoUrl: 'https://example.com/result.mp4', duration: 7.5 })

  assert.deepEqual(adapter.parsePollResponse({
    output: { task_status: 'FAILED', code: 'InvalidParameter', message: 'bad media combination' },
    request_id: 'request-3',
  }), {
    status: 'failed',
    error: '[InvalidParameter] bad media combination (request_id: request-3)',
  })
})
