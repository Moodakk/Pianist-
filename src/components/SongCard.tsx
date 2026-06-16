import type { Song } from '../types/song'

interface Props {
  song: Song
  onPractice?: (song: Song) => void
  onFavorite?: (id: string) => void
}

export function SongCard({ song, onPractice, onFavorite }: Props) {
  return (
    <article className="rounded-xl border border-violet-800/50 bg-slate-900/70 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-violet-200">{song.title}</h3>
        <button onClick={() => onFavorite?.(song.id)} className="text-lg" title="Toggle favorite">
          {song.favorite ? '★' : '☆'}
        </button>
      </div>
      <p className="text-xs text-slate-400">{song.category}</p>
      <p className="mt-2 text-sm text-slate-300">{song.tags.anime} • {song.tags.difficulty}</p>
      {song.tags.sourceNote ? <p className="mt-1 text-xs text-slate-400">{song.tags.sourceNote}</p> : null}
      <button
        className="mt-4 w-full rounded bg-cyan-600 px-3 py-2 text-sm font-medium hover:bg-cyan-500"
        onClick={() => onPractice?.(song)}
      >
        {song.isPlaceholder ? 'Import MIDI for this song' : 'Start Practice'}
      </button>
    </article>
  )
}
