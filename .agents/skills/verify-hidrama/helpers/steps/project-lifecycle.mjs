/**
 * Proof: the project lifecycle, driven through the real UI.
 *
 *   node .agents/skills/verify-hidrama/helpers/drive.mjs \
 *        .agents/skills/verify-hidrama/helpers/steps/project-lifecycle.mjs
 *
 * Requires a fresh verification instance (`helpers/app.sh start`). No AI key is
 * needed: nothing here calls a provider.
 */
import fs from 'node:fs'
import path from 'node:path'

export default async ({ page, shot, log, evidence }) => {
  const title = `Verify ${new Date().toISOString().slice(11, 19)}`

  log('open the project list')
  await page.goto('/')
  await page.waitFor('.launcher-title')
  await page.sleep(1200) // the first-run walkthrough fires ~600ms after mount

  // A fresh database has not seen the walkthrough, so driver.js covers the page.
  if (await page.count('.driver-overlay')) {
    log('first-run walkthrough is up — dismissing it as a user would')
    await page.click('.driver-popover-close-btn')
    await page.waitForGone('.driver-overlay')
  }
  const emptyTitle = await page.text('.empty-title')
  await shot('01-project-list-empty')

  log('create a project')
  await page.click('.head-actions .btn-primary')
  await page.waitFor('.create-dialog')
  await shot('02-create-dialog')
  await page.type('.create-dialog input.input', title)

  // Pick the aspect ratio by its label text, so this step survives a UI language change.
  await page.click('.create-dialog .dialog-body label.field:nth-of-type(3) .base-select-trigger')
  await page.waitFor('.app-menu-item')
  const ratios = await page.evaluate(`return [...document.querySelectorAll('.app-menu-item')].map(e => e.textContent.trim())`)
  const portrait = ratios.find((r) => r.includes('9:16'))
  if (!portrait) throw new Error(`no 9:16 option in the aspect ratio list: ${ratios.join(' | ')}`)
  await page.clickText('.app-menu-item', portrait)
  log(`aspect ratio = ${portrait}`)
  await shot('03-create-dialog-filled')

  await page.click('.create-dialog button[type="submit"]')
  await page.waitFor('.page-title')
  await page.waitForGone('.create-dialog')
  const detailTitle = await page.text('.page-title')
  if (detailTitle !== title) throw new Error(`opened "${detailTitle}", expected "${title}"`)
  await shot('04-drama-detail')

  // Fixture, not a user action: an episode cannot be created until an image and a
  // video config exist (routes/episodes.ts refuses with 400). These rows use the
  // same endpoint the Settings page calls, with a key that no provider will accept.
  log('fixture: one image config and one video config (no valid key)')
  const seeded = await page.evaluate(`
    const post = (body) => fetch('/api/v1/ai-configs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then(r => r.json())
    return Promise.all([
      post({ service_type: 'image', provider: 'openai', name: 'verify image', base_url: 'http://127.0.0.1:1', api_key: 'verify-placeholder', model: ['gpt-image-2'], priority: 90 }),
      post({ service_type: 'video', provider: 'minimax', name: 'verify video', base_url: 'http://127.0.0.1:1', api_key: 'verify-placeholder', model: ['mini-max-video'], priority: 90 }),
    ]).then(rs => rs.map(r => r.code))
  `)
  if (seeded.some((code) => code !== 201)) throw new Error(`config fixture failed: ${JSON.stringify(seeded)}`)

  log('add an episode')
  await page.click('.head-action')
  await page.waitFor('.ep-dialog')
  await shot('05-add-episode-dialog')
  await page.click('.ep-dialog .btn-primary')
  await page.waitFor('.ep-card')
  await shot('06-episode-created')

  log('back to the project list')
  await page.goto('/')
  await page.waitFor('.project-card')
  await shot('07-project-list-with-project')

  // Side effects, read from the API rather than from the screen.
  const state = await page.evaluate(`
    return fetch('/api/v1/dramas').then(r => r.json()).then(list => {
      const drama = (list.data.items || []).find(d => d.title === ${JSON.stringify(title)})
      if (!drama) return { drama: null }
      return { drama }
    })
  `)
  const drama = state.drama
  if (!drama) throw new Error('the project is not in GET /api/v1/dramas')
  if (drama.aspect_ratio !== '9:16') throw new Error(`aspect_ratio is ${drama.aspect_ratio}, expected 9:16`)
  if ((drama.episodes || []).length !== 1) throw new Error(`episode rows: ${(drama.episodes || []).length}, expected 1`)
  const episode = drama.episodes[0]

  const errors = page.errors()
  const report = {
    at: new Date().toISOString(),
    emptyStateBefore: emptyTitle,
    created: { id: drama.id, title: drama.title, aspect_ratio: drama.aspect_ratio, status: drama.status, style: drama.style },
    episode: { id: episode.id, episode_number: episode.episode_number, title: episode.title, resolution: episode.resolution },
    pageErrors: errors,
  }
  fs.writeFileSync(path.join(evidence, 'project-lifecycle.json'), `${JSON.stringify(report, null, 2)}\n`)
  log(`evidence: project-lifecycle.json (drama #${drama.id}, episode #${episode.id})`)

  if (errors.length) throw new Error(`page reported ${errors.length} error(s): ${errors[0].split('\n')[0]}`)
}
