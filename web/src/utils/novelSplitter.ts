export interface SplitOptions {
  mode: 'chapter' | 'charCount'
  targetChars: number
}

export interface ChapterResult {
  title: string
  content: string
  charCount: number
}

const CHAPTER_REGEX = /^[ \t]*(第[零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟\d]+[章回节集卷部篇]|Chapter\s+\d+|CHAPTER\s+\d+)/m

export function splitNovel(text: string, options: SplitOptions): ChapterResult[] {
  const { mode, targetChars } = options
  let chapters: ChapterResult[]

  if (mode === 'chapter') {
    chapters = splitByChapterMarkers(text, targetChars)
  } else {
    chapters = splitByCharCount(text, targetChars)
  }

  return normalizeChapterSizes(chapters, targetChars)
}

export function splitByChapterMarkers(text: string, targetChars: number): ChapterResult[] {
  const matches = [...text.matchAll(new RegExp(CHAPTER_REGEX.source, 'gm'))]

  if (matches.length < 2) {
    return splitByCharCount(text, targetChars)
  }

  const chapters: ChapterResult[] = []

  // 第一个标记前的文字
  const preface = text.slice(0, matches[0].index!).trim()
  if (preface.length > 50) {
    chapters.push({ title: '序章', content: preface, charCount: preface.length })
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length
    const chunk = text.slice(start, end).trim()
    const marker = matches[i][1] // 捕获组：纯标记如"第一章"
    const newlineIdx = chunk.search(/\r?\n/)
    let title: string
    let content: string

    if (newlineIdx !== -1) {
      const firstLine = chunk.slice(0, newlineIdx).trim()
      if (firstLine.length <= 50) {
        // 首行较短，是正常的标题行（如"第一章 重生"）
        title = firstLine
        content = chunk.slice(newlineIdx).trim()
      } else {
        // 首行太长，标记后直接跟正文，只取标记作标题
        title = marker
        content = chunk.slice(marker.length).trim()
      }
    } else {
      if (chunk.length <= 50) {
        // 整个 chunk 很短，当作标题
        title = chunk
        content = ''
      } else {
        // 无换行且内容很长，标记作标题，其余作内容
        title = marker
        content = chunk.slice(marker.length).trim()
      }
    }

    chapters.push({
      title,
      content,
      charCount: content.length,
    })
  }

  return chapters
}

export function splitByCharCount(text: string, target: number): ChapterResult[] {
  const chapters: ChapterResult[] = []
  let remaining = text.trim()
  let index = 1

  while (remaining.length > 0) {
    if (remaining.length <= target * 1.67) {
      // 剩余不超过 5000，保留为一章
      chapters.push({
        title: `第${index}章`,
        content: remaining,
        charCount: remaining.length,
      })
      break
    }

    // 在 target 附近找段落边界或句子边界
    let cutPos = findBreakPoint(remaining, target)
    const chunk = remaining.slice(0, cutPos).trim()
    chapters.push({
      title: `第${index}章`,
      content: chunk,
      charCount: chunk.length,
    })
    remaining = remaining.slice(cutPos).trim()
    index++
  }

  return chapters
}

function findBreakPoint(text: string, target: number): number {
  // 在 target 前后 20% 范围内寻找断点
  const searchStart = Math.floor(target * 0.8)
  const searchEnd = Math.min(Math.floor(target * 1.2), text.length)
  const region = text.slice(searchStart, searchEnd)

  // 优先找段落边界
  const paraBreak = region.lastIndexOf('\n\n')
  if (paraBreak !== -1) return searchStart + paraBreak + 2

  // 其次找单换行
  const lineBreak = region.lastIndexOf('\n')
  if (lineBreak !== -1) return searchStart + lineBreak + 1

  // 最后找句子边界
  const sentenceEnd = region.search(/[。！？.!?][^。！？.!?]*$/)
  if (sentenceEnd !== -1) return searchStart + sentenceEnd + 1

  return target
}

export function normalizeChapterSizes(chapters: ChapterResult[], target: number): ChapterResult[] {
  const result: ChapterResult[] = []

  for (const ch of chapters) {
    if (ch.charCount > 5000) {
      // 递归再拆
      const sub = splitByCharCount(ch.content, target)
      // 保留原标题给第一个子章
      sub[0].title = ch.title
      for (let i = 1; i < sub.length; i++) {
        sub[i].title = `${ch.title}（续${i}）`
      }
      result.push(...sub)
    } else {
      result.push(ch)
    }
  }

  // 末尾短章合并
  if (result.length >= 2) {
    const last = result[result.length - 1]
    if (last.charCount <= 1500) {
      const prev = result[result.length - 2]
      prev.content = prev.content + '\n\n' + last.content
      prev.charCount = prev.content.length
      result.pop()
    }
  }

  return result
}
