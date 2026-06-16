import { Link } from 'react-router-dom'
import type { Song } from '../types/song'

interface Props {
  songs: Song[]
}

export function Dashboard({ songs }: Props) {
  const favorites = songs.filter((song) => song.favorite)
  const imported = songs.filter((song) => !song.isPlaceholder)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-violet-800/40 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-bold text-violet-200">Anime Piano Trainer</h1>
        <p className="mt-2 text-slate-300">Learn anime openings with your MIDI keyboard. Import legal MIDI files and practice with a Synthesia-style player.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="rounded bg-violet-600 px-4 py-2" to="/library">Browse Library</Link>
          <Link className="rounded bg-cyan-600 px-4 py-2" to="/import">Import MIDI</Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-900/60 p-4"><p className="text-sm text-slate-400">Total Songs</p><p className="text-2xl font-bold">{songs.length}</p></div>
        <div className="rounded-xl bg-slate-900/60 p-4"><p className="text-sm text-slate-400">Imported Songs</p><p className="text-2xl font-bold">{imported.length}</p></div>
        <div className="rounded-xl bg-slate-900/60 p-4"><p className="text-sm text-slate-400">Favorites</p><p className="text-2xl font-bold">{favorites.length}</p></div>
      </section>
    </div>
  )
}
