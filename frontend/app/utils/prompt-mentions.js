export const mentionToken = option => `${option.trigger || '@'}${option.value}`

export function mentionEntries(options) {
  const seen = new Map()
  for (const option of options) {
    const token = mentionToken(option)
    if (option.value && !seen.has(token)) {
      seen.set(token, option.kind === 'voice' ? 'voice' : option.kind === 'scene' ? 'scene' : 'role')
    }
  }
  // Legacy saved voice tokens remain highlighted/deletable; new insertions use #Name.
  for (const option of options) {
    for (const alias of option.aliases || []) {
      const token = `${option.trigger || '@'}${alias}`
      if (!seen.has(token)) seen.set(token, option.kind === 'voice' ? 'voice' : 'role')
    }
  }
  return [...seen.entries()].sort((a, b) => b[0].length - a[0].length)
}

export function activeMentionAt(text, position, options) {
  const match = text.slice(0, position).match(/([@#])([^\s@#]{0,100})$/)
  // Chinese dialogue follows a token without spaces: #林小雨轻声说. Do not reopen
  // the dropdown while typing the dialogue, but allow searching for a longer name.
  if (match && options && mentionEntries(options).some(([token]) => match[0].startsWith(token)) &&
      !options.some(option => (option.trigger || '@') === match[1] && String(option.value).toLowerCase().includes(match[2].toLowerCase()))) return null
  return match ? { start: position - match[0].length, trigger: match[1], query: match[2] } : null
}

const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function highlightMentions(text, options) {
  const entries = mentionEntries(options)
  if (!entries.length) return escapeHtml(text) + (text.endsWith('\n') ? '\u200b' : '')
  const pattern = new RegExp(entries.map(([token]) => escapeRegExp(token)).join('|'), 'g')
  const styles = new Map(entries)
  let html = '', start = 0
  for (const match of text.matchAll(pattern)) {
    html += escapeHtml(text.slice(start, match.index))
    html += `<span class="mention-token mention-token-${styles.get(match[0])}">${escapeHtml(match[0])}</span>`
    start = match.index + match[0].length
  }
  return html + escapeHtml(text.slice(start)) + (text.endsWith('\n') ? '\u200b' : '')
}

export function mentionDeletionRange(text, position, options, backwards) {
  for (const [token] of mentionEntries(options)) {
    if (backwards && text.slice(0, position).endsWith(token)) return { start: position - token.length, end: position }
    if (!backwards && text.slice(position).startsWith(token)) return { start: position, end: position + token.length }
  }
  return null
}
