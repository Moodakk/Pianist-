import type { Song } from '../types/song'
import type { PracticeSession } from '../types/scoring'

export function Progress({ songs, sessions }: { songs: Song[]; sessions: PracticeSession[] }) {
  const recentSessions = sessions.slice(0, 8)
  const recentIds = new Set(recentSessions.map((s) => s.songId))
  const recentSongs = songs.filter((song) => recentIds.has(song.id))
  const favorites = songs.filter((song) => song.favorite)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-violet-200">Progress</h1>
      <section className="rounded-xl bg-slate-900/70 p-4">
        <h2 className="mb-2 font-medium">Recently Practiced Songs</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {recentSongs.length === 0 ? <li>No sessions yet</li> : recentSongs.map((song) => <li key={song.id}>{song.title}</li>)}
        </ul>
      </section>
      <section className="rounded-xl bg-slate-900/70 p-4">
        <h2 className="mb-2 font-medium">Favorites</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {favorites.length === 0 ? <li>No favorites yet</li> : favorites.map((song) => <li key={song.id}>{song.title}</li>)}
        </ul>
      </section>
      <section className="rounded-xl bg-slate-900/70 p-4">
        <h2 className="mb-2 font-medium">Best Scores</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {recentSessions.length === 0
            ? <li>Complete a practice run to generate score history.</li>
            : recentSessions.map((session) => <li key={session.id}>{session.songId}: {session.result?.finalScorePct ?? 0}% ({session.result?.grade ?? 'D'})</li>)}
        </ul>
      </section>
    </div>
  )
}
