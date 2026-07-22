import assert from 'node:assert/strict'

import { AtlasCloudImageAdapter } from '../src/services/adapters/atlascloud-image'
import { AtlasCloudVideoAdapter } from '../src/services/adapters/atlascloud-video'
import { getImageAdapter, getVideoAdapter } from '../src/services/adapters/registry'
import { joinProviderUrl } from '../src/services/adapters/url'
import type { AIConfig } from '../src/services/adapters/types'

const config: AIConfig = {
  provider: 'atlascloud',
  baseUrl: 'https://api.atlascloud.ai/api/v1',
  apiKey: 'test-atlascloud-key',
  model: '',
}

const image = new AtlasCloudImageAdapter()
const imageRequest = image.buildGenerateRequest(config, {
  id: 1,
  prompt: 'A cinematic poster for a short drama',
  size: '1920x1080',
})

assert.equal(imageRequest.url, 'https://api.atlascloud.ai/api/v1/model/generateImage')
assert.equal(imageRequest.method, 'POST')
assert.equal(imageRequest.headers.Authorization, 'Bearer test-atlascloud-key')
assert.equal(imageRequest.body.model, 'bytedance/seedream-v5.0-lite')
assert.equal(imageRequest.body.size, '2304*1728')
assert.equal(imageRequest.body.output_format, 'png')
assert.equal(imageRequest.body.enable_base64_output, false)

assert.deepEqual(image.parseGenerateResponse({ data: { id: 'img_task_1' } }), {
  isAsync: true,
  taskId: 'img_task_1',
})
assert.equal(
  image.buildPollRequest(config, 'img_task_1').url,
  'https://api.atlascloud.ai/api/v1/model/result/img_task_1',
)
assert.deepEqual(image.parsePollResponse({
  data: { status: 'completed', outputs: [{ url: 'https://cdn.example/image.png' }] },
}), {
  status: 'completed',
  imageUrl: 'https://cdn.example/image.png',
})

const video = new AtlasCloudVideoAdapter()
const videoRequest = video.buildGenerateRequest(config, {
  id: 2,
  prompt: 'A fast-paced drama trailer',
  imageUrl: 'https://cdn.example/first-frame.png',
  referenceMode: 'single',
  duration: 99,
  aspectRatio: '9:16',
})

assert.equal(videoRequest.url, 'https://api.atlascloud.ai/api/v1/model/generateVideo')
assert.equal(videoRequest.method, 'POST')
assert.equal(videoRequest.headers.Authorization, 'Bearer test-atlascloud-key')
assert.equal(videoRequest.body.model, 'bytedance/seedance-2.0-fast/image-to-video')
assert.equal(videoRequest.body.image, 'https://cdn.example/first-frame.png')
assert.equal(videoRequest.body.duration, 15)
assert.equal(videoRequest.body.ratio, '9:16')
assert.equal(videoRequest.body.watermark, false)

const referenceVideoRequest = video.buildGenerateRequest(config, {
  id: 3,
  prompt: 'Keep the same lead actor across shots',
  referenceMode: 'multiple',
  referenceImageUrls: JSON.stringify(['https://cdn.example/a.png', 'https://cdn.example/b.png']),
})
assert.equal(referenceVideoRequest.body.model, 'bytedance/seedance-2.0-fast/reference-to-video')
assert.deepEqual(referenceVideoRequest.body.reference_images, [
  'https://cdn.example/a.png',
  'https://cdn.example/b.png',
])

assert.deepEqual(video.parseGenerateResponse({ data: { request_id: 'video_task_1' } }), {
  isAsync: true,
  taskId: 'video_task_1',
})
assert.equal(
  video.buildPollRequest(config, 'video_task_1').url,
  'https://api.atlascloud.ai/api/v1/model/prediction/video_task_1',
)
assert.deepEqual(video.parsePollResponse({
  data: { status: 'succeeded', videos: ['https://cdn.example/video.mp4'] },
}), {
  status: 'completed',
  videoUrl: 'https://cdn.example/video.mp4',
})

assert.equal(getImageAdapter('atlascloud').provider, 'atlascloud')
assert.equal(getVideoAdapter('atlascloud').provider, 'atlascloud')
assert.equal(joinProviderUrl('https://api.atlascloud.ai/v1', '/v1', '/models'), 'https://api.atlascloud.ai/v1/models')
assert.equal(joinProviderUrl('https://api.atlascloud.ai/api/v1', '/api/v1', '/models'), 'https://api.atlascloud.ai/api/v1/models')

console.log('atlascloud-adapters.test.ts passed')
