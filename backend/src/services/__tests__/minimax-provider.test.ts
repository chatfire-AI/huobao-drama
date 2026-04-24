/**
 * Unit tests for MiniMax text provider support in getTextProviderBaseUrl
 * Run with: npx tsx src/services/__tests__/minimax-provider.test.ts
 */
import assert from 'node:assert'
import { getTextProviderBaseUrl } from '../ai.js'

type AIConfig = Parameters<typeof getTextProviderBaseUrl>[0]

function makeConfig(provider: string, baseUrl: string): AIConfig {
  return { provider, baseUrl, apiKey: 'test-key', model: 'MiniMax-M2.7' }
}

// Test 1: MiniMax provider appends /v1 when baseUrl has no path
{
  const config = makeConfig('minimax', 'https://api.minimax.io')
  const url = getTextProviderBaseUrl(config)
  assert.strictEqual(url, 'https://api.minimax.io/v1', 'MiniMax base URL should end with /v1')
  console.log('✓ MiniMax base URL resolves to https://api.minimax.io/v1')
}

// Test 2: MiniMax is case-insensitive
{
  const config = makeConfig('MiniMax', 'https://api.minimax.io')
  const url = getTextProviderBaseUrl(config)
  assert.strictEqual(url, 'https://api.minimax.io/v1', 'MiniMax provider name should be case-insensitive')
  console.log('✓ MiniMax provider name is case-insensitive')
}

// Test 3: OpenAI still works correctly
{
  const config = makeConfig('openai', 'https://api.openai.com')
  const url = getTextProviderBaseUrl(config)
  assert.strictEqual(url, 'https://api.openai.com/v1', 'OpenAI base URL should end with /v1')
  console.log('✓ OpenAI base URL unaffected')
}

// Test 4: Volcengine still works correctly
{
  const config = makeConfig('volcengine', 'https://ark.cn-beijing.volces.com')
  const url = getTextProviderBaseUrl(config)
  assert.strictEqual(url, 'https://ark.cn-beijing.volces.com/api/v3', 'Volcengine base URL should end with /api/v3')
  console.log('✓ Volcengine base URL unaffected')
}

console.log('\nAll tests passed.')
