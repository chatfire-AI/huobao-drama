import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

const routeBlock = (source, route) => {
  const start = source.indexOf(route)
  assert.notEqual(start, -1, `Missing route: ${route}`)
  const next = source.indexOf('\n// ', start + route.length)
  return source.slice(start, next === -1 ? source.length : next)
}

test('backend provider registry does not expose ChatFire as a model provider', () => {
  const registry = read('src/services/adapters/registry.ts')
  const ai = read('src/services/ai.ts')
  const aiConfigRoute = read('src/routes/aiConfigs.ts')
  const useApi = read('../frontend/app/composables/useApi.ts')

  assert.doesNotMatch(registry, /chatfire/i)
  assert.doesNotMatch(ai, /chatfire/i)
  assert.doesNotMatch(ai, /openrouter/i)
  assert.doesNotMatch(aiConfigRoute, /api\.firemux\.com/i)
  assert.doesNotMatch(aiConfigRoute, /provider:\s*'chatfire'/i)
  assert.doesNotMatch(aiConfigRoute, /openrouter/i)
  assert.doesNotMatch(aiConfigRoute, /\/huobao-preset/)
  assert.doesNotMatch(useApi, /huobaoPreset/)
})

test('text agents use the official Gemini provider for gemini configs', () => {
  const agents = read('src/agents/index.ts')

  assert.match(agents, /createGoogleGenerativeAI/)
  assert.match(agents, /providerName === 'gemini'/)
  assert.match(agents, /googleProvider\(\s*modelName\s*\)/)
})

test('text agents keep OpenAI provider routing for non-Gemini configs', () => {
  const agents = read('src/agents/index.ts')

  assert.match(agents, /createOpenAI/)
  assert.match(agents, /const provider = createOpenAI\(/)
  assert.match(agents, /return provider\.chat\(modelName\)/)
})

test('text provider base URL handling uses official Gemini v1beta endpoint', () => {
  const ai = read('src/services/ai.ts')

  assert.match(ai, /provider === 'gemini'/)
  assert.match(ai, /return joinProviderUrl\(config\.baseUrl,\s*'\/v1beta',\s*''\)/)
})

test('backend rejects unsupported providers at DB and route boundaries', () => {
  const ai = read('src/services/ai.ts')
  const route = read('src/routes/aiConfigs.ts')

  assert.match(ai, /officialProviders/)
  assert.match(ai, /text:\s*\[\s*'openai',\s*'gemini',\s*'volcengine'\s*\]/)
  assert.match(ai, /image:\s*\[\s*'openai',\s*'gemini',\s*'volcengine'\s*\]/)
  assert.match(ai, /video:\s*\[\s*'volcengine',\s*'minimax',\s*'aliyun'\s*\]/)
  assert.doesNotMatch(ai, /'deepseek'/)
  assert.doesNotMatch(ai, /'ali'/)
  assert.doesNotMatch(ai, /'vidu'/)
  assert.doesNotMatch(ai, /audio:\s*\[/)
  assert.match(ai, /isOfficialProvider/)
  assert.match(ai, /isOfficialProvider\(serviceType,\s*r\.provider\)/)
  assert.match(ai, /isOfficialProvider\(row\.serviceType as ServiceType,\s*row\.provider\)/)

  assert.match(route, /isOfficialProvider/)
  assert.match(route, /isOfficialProvider\(body\.service_type,\s*body\.provider\)/)
  assert.match(route, /isOfficialProvider\(serviceType,\s*provider\)/)
  assert.match(route, /不支持的 service_type\/provider/)
})

test('AI config routes reject unsupported service/provider pairs in create, test, and update paths', () => {
  const route = read('src/routes/aiConfigs.ts')
  const createRoute = routeBlock(route, "app.post('/',")
  const testRoute = routeBlock(route, "app.post('/test',")
  const updateRoute = routeBlock(route, "app.put('/:id',")

  assert.match(createRoute, /if \(!body\.service_type \|\| !body\.provider\)/)
  assert.match(createRoute, /isOfficialProvider\(body\.service_type,\s*body\.provider\)/)
  assert.match(createRoute, /badRequest\(c,\s*'不支持的 service_type\/provider'\)/)

  assert.match(testRoute, /if \(!body\.service_type \|\| !body\.provider \|\| !body\.base_url\)/)
  assert.match(testRoute, /isOfficialProvider\(body\.service_type,\s*body\.provider\)/)
  assert.match(testRoute, /badRequest\(c,\s*'不支持的 service_type\/provider'\)/)

  assert.match(updateRoute, /const serviceType = 'service_type' in body \? body\.service_type : existing\.serviceType/)
  assert.match(updateRoute, /const provider = 'provider' in body \? body\.provider : existing\.provider/)
  assert.doesNotMatch(updateRoute, /body\.service_type \|\| existing\.serviceType/)
  assert.doesNotMatch(updateRoute, /body\.provider \|\| existing\.provider/)
  assert.match(updateRoute, /isOfficialProvider\(serviceType,\s*provider\)/)
  assert.match(updateRoute, /badRequest\(c,\s*'不支持的 service_type\/provider'\)/)
})

test('AI config update route persists service type changes after validation', () => {
  const route = read('src/routes/aiConfigs.ts')
  const updateRoute = routeBlock(route, "app.put('/:id',")

  assert.match(updateRoute, /const updates: Record<string, any> = \{ updatedAt: now\(\) \}/)
  assert.match(updateRoute, /if \('service_type' in body\) updates\.serviceType = body\.service_type/)
  assert.match(updateRoute, /if \('provider' in body\) updates\.provider = body\.provider/)
})

test('AI config probe uses provider-specific auth schemes', () => {
  const route = read('src/routes/aiConfigs.ts')
  const geminiHeadersStart = route.indexOf('function geminiHeaders')
  const buildProbeStart = route.indexOf('function buildProbe')
  const geminiHeaders = route.slice(geminiHeadersStart, buildProbeStart)

  assert.match(geminiHeaders, /x-goog-api-key/)
  assert.doesNotMatch(geminiHeaders, /Authorization\s*=\s*`Bearer/)
  assert.match(route, /\/models\/\$\{modelName\}:generateContent/)
  assert.match(route, /url\.searchParams\.set\('key', apiKey\)/)
  assert.match(route, /function bearerHeaders/)
  assert.match(route, /p === 'openai'/)
  assert.match(route, /p === 'volcengine'/)
  assert.match(route, /p === 'minimax'/)
  assert.match(route, /p === 'aliyun'/)
  assert.match(route, /X-DashScope-Async': 'enable'/)
  assert.match(route, /\/services\/aigc\/video-generation\/video-synthesis/)
  assert.match(route, /'\/chat\/completions'/)
  assert.doesNotMatch(route, /viduHeaders/)
  assert.doesNotMatch(route, /p === 'deepseek'/)
  assert.doesNotMatch(route, /p === 'ali'/)
  assert.doesNotMatch(route, /p === 'vidu'/)
})

test('removed providers no longer ship adapters or webhook routes', () => {
  const registry = read('src/services/adapters/registry.ts')
  const index = read('src/index.ts')

  assert.doesNotMatch(registry, /ali-image|ali-video|vidu-video/)
  assert.doesNotMatch(registry, /AliImageAdapter|AliVideoAdapter|ViduVideoAdapter/)
  assert.doesNotMatch(index, /webhooks/)
})

test('adapter registry fails closed for unsupported providers', () => {
  const registry = read('src/services/adapters/registry.ts')

  assert.match(registry, /Unsupported image provider/)
  assert.match(registry, /Unsupported video provider/)
  assert.doesNotMatch(registry, /\|\|\s*imageAdapters\['minimax'\]/)
  assert.doesNotMatch(registry, /\|\|\s*videoAdapters\['minimax'\]/)
  assert.doesNotMatch(registry, /ttsAdapters/)
})

test('OpenAI image adapter defaults to GPT Image instead of legacy DALL-E', () => {
  const adapter = read('src/services/adapters/openai-image.ts')

  assert.match(adapter, /record\.model\s*\|\|\s*config\.model\s*\|\|\s*'gpt-image-2'/)
  assert.doesNotMatch(adapter, /record\.model\s*\|\|\s*'dall-e-3'/)
})

test('OpenAI image adapter uses GPT Image request shape and keeps DALL-E response format', () => {
  const adapter = read('src/services/adapters/openai-image.ts')

  assert.match(adapter, /model\.startsWith\('gpt-image-'\)/)
  assert.match(adapter, /normalizeGptImageSize/)
  assert.match(adapter, /'1536x1024'/)
  assert.match(adapter, /'1024x1536'/)
  assert.match(adapter, /'1024x1024'/)
  assert.match(adapter, /'auto'/)
  assert.match(adapter, /if \(!isGptImage\)[\s\S]*response_format = 'url'/)
})

test('new image and video models use their current API shapes', () => {
  const openaiImage = read('src/services/adapters/openai-image.ts')
  const geminiImage = read('src/services/adapters/gemini-image.ts')
  const volcVideo = read('src/services/adapters/volcengine-video.ts')
  const wanVideo = read('src/services/adapters/aliyun-wan-video.ts')

  assert.match(openaiImage, /isGptImage2/)
  assert.match(openaiImage, /normalizeGptImage2Size/)
  assert.match(geminiImage, /isGemini3Image/)
  assert.match(geminiImage, /\/v1beta'[\s\S]*'\/interactions'/)
  assert.match(geminiImage, /response_format/)
  assert.doesNotMatch(geminiImage, /Authorization': `Bearer/)
  assert.match(volcVideo, /doubao-seedance-2-0-mini-260615/)
  // Seedance 2.0 多模态能力
  assert.match(volcVideo, /SEEDANCE2_MODEL_PREFIX/)
  assert.match(volcVideo, /startsWith\(SEEDANCE2_MODEL_PREFIX\)/)
  assert.match(volcVideo, /reference_video/)
  assert.match(volcVideo, /reference_audio/)
  assert.match(volcVideo, /generate_audio:\s*record\.generateAudio/)
  // Wan 3.0 使用阿里云百炼官方异步视频生成协议
  assert.match(wanVideo, /wan3\.0-video-prime/)
  assert.match(wanVideo, /wan3\.0-video/)
  assert.match(wanVideo, /\/services\/aigc\/video-generation\/video-synthesis/)
  assert.match(wanVideo, /X-DashScope-Async': 'enable'/)
  assert.match(wanVideo, /body:\s*\{ model, input, parameters \}/)
  assert.match(wanVideo, /\/tasks\/\$\{encodeURIComponent\(taskId\)\}/)
  assert.match(wanVideo, /output\.task_status/)
  assert.match(wanVideo, /output_video_duration/)
})
