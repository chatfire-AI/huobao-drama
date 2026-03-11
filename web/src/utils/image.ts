type MediaLike = {
  local_path?: string
  image_url?: string
  video_url?: string
  url?: string
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function joinUrl(base: string, path: string): string {
  if (!base) return path
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

/**
 * Normalize an image or video URL from relative/absolute/local-storage paths.
 */
export function fixImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url

  // Already a static path served by backend.
  if (url.startsWith('/static/')) return url

  const base = import.meta.env.VITE_API_BASE_URL || ''
  return joinUrl(base, url)
}

/**
 * Get image URL, preferring local_path.
 */
export function getImageUrl(item: MediaLike | null | undefined): string {
  if (!item) return ''

  if (item.local_path) {
    if (item.local_path.startsWith('http')) return item.local_path
    const normalized = normalizePath(item.local_path)
    if (normalized.startsWith('static/')) {
      return `/${normalized}`
    }
    return `/static/${normalized}`
  }

  if (item.image_url) {
    return fixImageUrl(item.image_url)
  }

  return ''
}

export function hasImage(item: MediaLike | null | undefined): boolean {
  return !!(item?.local_path || item?.image_url)
}

/**
 * Get video URL, preferring local_path.
 */
export function getVideoUrl(item: MediaLike | null | undefined): string {
  if (!item) return ''

  if (item.local_path) {
    if (item.local_path.startsWith('http')) return item.local_path
    const normalized = normalizePath(item.local_path)
    if (normalized.startsWith('static/')) {
      return `/${normalized}`
    }
    return `/static/${normalized}`
  }

  if (item.video_url) {
    return fixImageUrl(item.video_url)
  }

  if (item.url) {
    return fixImageUrl(item.url)
  }

  return ''
}

export function hasVideo(item: MediaLike | null | undefined): boolean {
  return !!(item?.local_path || item?.video_url || item?.url)
}
