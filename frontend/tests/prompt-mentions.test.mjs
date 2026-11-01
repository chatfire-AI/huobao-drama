import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeMentionAt, mentionToken, highlightMentions, mentionDeletionRange } from '../app/utils/prompt-mentions.js'

const options = [
  { value: '小雨', kind: 'character' },
  { value: '小雨', aliases: ['小雨音色'], trigger: '#', kind: 'voice' },
  { value: '小雨姐姐', aliases: ['小雨姐姐音色'], trigger: '#', kind: 'voice' },
  { value: 'A&B<', trigger: '#', kind: 'voice' },
]

test('image and voice triggers stay independent, including adjacent references', () => {
  assert.deepEqual(activeMentionAt('@小雨#小', 5), { start: 3, trigger: '#', query: '小' })
  assert.deepEqual(activeMentionAt('场景 @', 4), { start: 3, trigger: '@', query: '' })
  assert.equal(activeMentionAt('#小雨音色 台词', 8), null)
  assert.equal(mentionToken(options[0]), '@小雨')
  assert.equal(mentionToken(options[1]), '#小雨')
})

test('highlighting preserves literal text, safely escapes HTML, and prefers complete names', () => {
  const html = highlightMentions('@小雨抬头，#小雨姐姐轻声说，#A&B<回应 <script>\n', options)
  assert.match(html, /mention-token-role">@小雨<\/span>/)
  assert.match(html, /mention-token-voice">#小雨姐姐<\/span>轻声说/)
  assert.match(html, /mention-token-voice">#A&amp;B&lt;<\/span>回应/)
  assert.match(html, /&lt;script&gt;\n\u200b$/)
  assert.equal(highlightMentions('#未知音色', options), '#未知音色')
})

test('Backspace and Delete remove whole voice tokens without consuming surrounding text', () => {
  const text = '@小雨#小雨轻声说话'
  assert.deepEqual(mentionDeletionRange(text, 6, options, true), { start: 3, end: 6 })
  assert.deepEqual(mentionDeletionRange(text, 3, options, false), { start: 3, end: 6 })
  assert.equal(mentionDeletionRange(text, 5, options, true), null)
  assert.deepEqual(mentionDeletionRange(text, 3, options, true), { start: 0, end: 3 })
})

test('typing dialogue immediately after a voice name keeps the menu closed; longer names can still be searched', () => {
  const speech = '#小雨轻声说'
  assert.equal(activeMentionAt(speech, speech.length, options), null)
  assert.deepEqual(activeMentionAt('#小雨姐', 4, options), { start: 0, trigger: '#', query: '小雨姐' })
})

test('previously saved suffix tokens are highlighted and deleted as one mention', () => {
  assert.match(highlightMentions('#小雨音色说话', options), /mention-token-voice">#小雨音色<\/span>说话/)
  assert.deepEqual(mentionDeletionRange('#小雨音色说话', 5, options, true), { start: 0, end: 5 })
})
