const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

const URL_PATTERNS: RegExp[] = [
  /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
]

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (ID_PATTERN.test(trimmed)) return trimmed
  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function extractYouTubeStart(input: string): number {
  const m = input.match(/[?&]t=(\d+)h?(\d+)?m?(\d+)?s?/)
  if (m) {
    const [, a, b, c] = m
    if (b !== undefined && c !== undefined) return +a * 3600 + +b * 60 + +c
    if (b !== undefined) return +a * 60 + +b
    return +a
  }
  const simple = input.match(/[?&]start=(\d+)/)
  return simple ? +simple[1] : 0
}

export function buildEmbedUrl(id: string, startSec = 0): string {
  const start = startSec > 0 ? `&start=${startSec}` : ''
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1${start}`
}
