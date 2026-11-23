import assert from 'node:assert/strict'
import { test } from 'node:test'
import { VolcEngineVideoAdapter } from '../src/services/adapters/volcengine-video'

const adapter = new VolcEngineVideoAdapter()
const config = {
  provider: 'volcengine', baseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
  apiKey: 'test-key', model: 'dreamina-seedance-2-5-260628',
}

test('mainland and overseas Seedance IDs pass through without changing request parameters', () => {
  for (const model of ['doubao-seedance-2-0-mini-260615', 'dreamina-seedance-2-0-fast-260128', 'dreamina-seedance-2-5-260628', 'dreamina-seedance-2-5-flash-261115']) {
    const request = adapter.buildGenerateRequest(config, {
      id: 1, model, prompt: 'A scholar holds a lantern', duration: 6, aspectRatio: '9:16',
    })
    assert.equal(request.body.model, model)
    assert.equal(request.body.duration, 6)
    assert.equal(request.body.resolution, '720p')
    assert.equal(request.body.ratio, '9:16')
    assert.equal(request.url, `${config.baseUrl}/contents/generations/tasks`)
  }
})

test('unrelated models remain rejected', () => {
  for (const model of ['unrelated-model', 'dreamina-seedance-1-0-pro', 'dreamina-seedance-2-50-260628']) {
    assert.throws(() => adapter.buildGenerateRequest(config, { id: 1, model, prompt: 'Rain' }), /仅支持/)
  }
})
