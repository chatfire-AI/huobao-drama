import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (path) => readFileSync(new URL(path, appRoot), 'utf8')

const episodePage = readApp('views/drama/episode.vue')
const dramaPage = readApp('views/drama/detail.vue')
const settingsPage = readApp('pages/settings.vue')
const useApi = readApp('composables/useApi.ts')

test('frontend API client no longer exposes TTS or voice endpoints', () => {
  assert.doesNotMatch(useApi, /generateTTS/)
  assert.doesNotMatch(useApi, /voiceSample/)
  assert.doesNotMatch(useApi, /voicesAPI/)
  assert.doesNotMatch(useApi, /ai-voices/)
  assert.doesNotMatch(useApi, /generate-voice-sample/)
  assert.doesNotMatch(useApi, /generate-tts/)
})

test('uploaded character voices do not restore AI voice assignment or TTS controls', () => {
  assert.doesNotMatch(episodePage, /voice_assigner/)
  assert.doesNotMatch(episodePage, /AI 匹配声音/)
  assert.doesNotMatch(episodePage, /批量试听/)
  assert.doesNotMatch(episodePage, /已配音色/)
  assert.doesNotMatch(episodePage, /待音色/)
  assert.doesNotMatch(episodePage, /updateCharVoice/)
  assert.doesNotMatch(episodePage, /previewVoiceSample/)
  assert.doesNotMatch(episodePage, /voiceProfiles/)
  assert.doesNotMatch(episodePage, /audioConfigs/)
  assert.doesNotMatch(episodePage, /voicesAPI/)
})

test('project and settings pages remove audio service configuration', () => {
  assert.doesNotMatch(dramaPage, /audio_config_id/)
  assert.doesNotMatch(dramaPage, /audioConfigs/)
  assert.doesNotMatch(dramaPage, /音频/)
  assert.doesNotMatch(settingsPage, /voice_assigner/)
  assert.doesNotMatch(settingsPage, /音色分配/)
  assert.doesNotMatch(settingsPage, /serviceTypes[\s\S]*audio/)
  assert.doesNotMatch(settingsPage, /音频/)
  assert.doesNotMatch(settingsPage, /speech-2\.8-hd/)
})
