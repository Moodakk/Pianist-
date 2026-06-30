import type { Song } from '../types/song'
import { Icon } from './Icon'

interface Props {
  song: Song
  onPractice?: (song: Song) => void
  onFavorite?: (id: string) => void
}

const palettes = [
  ['#7c5cff', '#f472b6'],
  ['#38bdf8', '#7c5cff'],
  ['#10b981', '#38bdf8'],
  ['#f59e0b', '#f43f5e'],
  ['#a78bfa', '#22d3ee'],
  ['#ec4899', '#8b5cf6'],
  ['#fde047', '#f97316'],
  ['#22d3ee', '#10b981'],
]

function paletteFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return palettes[hash % palettes.length]
}

const difficultyToDots: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
}

export function SongCard({ song, onPractice, onFavorite }: Props) {
  const [c1, c2] = paletteFor(song.id || song.title)
  const dotsOn = difficultyToDots[song.tags.difficulty] ?? 2
  const placeholder = song.isPlaceholder

  return (
    <article className="tile group" onClick={() => onPractice?.(song)}>
      <div
        className="cover"
        style={{
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.7))]" />
        <div className="absolute left-4 top-4 right-4 flex items-start justify-between">
          <span className="chip" style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}>
            {song.tags.anime}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFavorite?.(song.id)
            }}
            className="grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
            aria-label="Toggle favorite"
          >
            <Icon name={song.favorite ? 'star-fill' : 'star'} size={14} className={song.favorite ? 'text-amber-300' : ''} />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="line-clamp-2 text-base font-semibold text-white drop-shadow">{song.title}</h3>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/80">
              <span className="difficulty-dots">
                <span className={dotsOn >= 1 ? 'on' : ''} />
                <span className={dotsOn >= 2 ? 'on' : ''} />
                <span className={dotsOn >= 3 ? 'on' : ''} />
              </span>
              <span>{song.tags.difficulty}</span>
              {song.tags.bpm ? <span>· {Math.round(song.tags.bpm)} BPM</span> : null}
            </div>
          </div>
        </div>

        <button
          className="play"
          onClick={(e) => {
            e.stopPropagation()
            onPractice?.(song)
          }}
          aria-label={placeholder ? 'Import MIDI' : 'Start practice'}
        >
          <Icon name={placeholder ? 'upload' : 'play'} size={20} className="text-white" />
        </button>
      </div>
    </article>
  )
}
