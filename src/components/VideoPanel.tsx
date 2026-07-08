import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { buildEmbedUrl, extractYouTubeId, extractYouTubeStart } from '../utils/youtube'

const STORAGE_KEY = 'easy-piano:reference-video'
const SIZE_KEY = 'easy-piano:reference-video-size'

type Size = 'sm' | 'md' | 'lg'
const SIZE_PX: Record<Size, { w: number; h: number }> = {
  sm: { w: 260, h: 146 },
  md: { w: 360, h: 202 },
  lg: { w: 520, h: 293 },
}

const SIZE_ORDER: Size[] = ['sm', 'md', 'lg']

export function VideoPanel() {
  const [url, setUrl] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [input, setInput] = useState('')
  const [visible, setVisible] = useState(true)
  const [editing, setEditing] = useState(false)
  const [size, setSize] = useState<Size>(() => (localStorage.getItem(SIZE_KEY) as Size) ?? 'md')

  useEffect(() => {
    if (url) localStorage.setItem(STORAGE_KEY, url)
    else localStorage.removeItem(STORAGE_KEY)
  }, [url])

  useEffect(() => {
    localStorage.setItem(SIZE_KEY, size)
  }, [size])

  const videoId = extractYouTubeId(url)
  const start = extractYouTubeStart(url)
  const dims = SIZE_PX[size]

  const commit = () => {
    const id = extractYouTubeId(input)
    if (!id) return
    setUrl(input.trim())
    setEditing(false)
    setInput('')
  }

  const cycleSize = () => {
    const next = SIZE_ORDER[(SIZE_ORDER.indexOf(size) + 1) % SIZE_ORDER.length]
    setSize(next)
  }

  if (!visible) {
    return (
      <button
        className="video-fab"
        onClick={() => setVisible(true)}
        aria-label="Show reference video"
        title="Reference video"
      >
        <Icon name="play" size={16} />
      </button>
    )
  }

  return (
    <div className="video-panel" style={{ width: dims.w }}>
      <div className="video-panel-header">
        <Icon name="play" size={11} className="text-violet-300" />
        <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-2)]">
          Reference video
        </span>
        <div className="ml-auto flex items-center gap-1">
          {videoId && !editing ? (
            <>
              <button
                className="video-panel-btn"
                onClick={cycleSize}
                title={`Size: ${size}`}
                aria-label="Resize"
              >
                <span style={{ fontSize: 10 }}>{size === 'sm' ? 'S' : size === 'md' ? 'M' : 'L'}</span>
              </button>
              <button
                className="video-panel-btn"
                onClick={() => {
                  setInput(url)
                  setEditing(true)
                }}
                title="Change video"
                aria-label="Change"
              >
                <span style={{ fontSize: 12 }}>✎</span>
              </button>
            </>
          ) : null}
          <button
            className="video-panel-btn"
            onClick={() => setVisible(false)}
            aria-label="Hide"
            title="Hide"
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      </div>

      {videoId && !editing ? (
        <div className="video-embed" style={{ height: dims.h }}>
          <iframe
            key={`${videoId}-${start}`}
            src={buildEmbedUrl(videoId, start)}
            title="Reference video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="video-panel-empty">
          <p className="mb-2 text-xs text-[color:var(--text-1)]">
            Paste a YouTube link — for example a piano tutorial or Synthesia video — and practice
            alongside it.
          </p>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            className="input !py-2 !text-xs"
            placeholder="https://youtube.com/watch?v=..."
            autoFocus
          />
          {input && !extractYouTubeId(input) ? (
            <p className="mt-1 text-[10px] text-rose-300">Doesn't look like a YouTube URL</p>
          ) : null}
          <div className="mt-2 flex justify-end gap-1">
            {url ? (
              <button
                className="btn btn-ghost !py-1 !px-2 text-[11px]"
                onClick={() => {
                  setEditing(false)
                  setInput('')
                }}
              >
                Cancel
              </button>
            ) : null}
            <button
              className="btn btn-primary !py-1 !px-3 text-[11px]"
              onClick={commit}
              disabled={!extractYouTubeId(input)}
            >
              Load
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
