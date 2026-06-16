import { Icon } from '../components/Icon'
import type { Song } from '../types/song'
import type { PracticeSession } from '../types/scoring'

export function Progress({ songs, sessions }: { songs: Song[]; sessions: PracticeSession[] }) {
  const recentSessions = sessions.slice(0, 12)
  const recentIds = new Set(recentSessions.map((s) => s.songId))
  const recentSongs = songs.filter((song) => recentIds.has(song.id))
  const favorites = songs.filter((song) => song.favorite)

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((acc, s) => acc + (s.result?.finalScorePct ?? 0), 0) / sessions.length)
    : 0
  const totalMinutes = Math.round(
    sessions.reduce((acc, s) => acc + (s.result?.practiceTimeSec ?? 0), 0) / 60,
  )

  return (
    <div className="space-y-6 p-8">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Sessions" value={sessions.length} icon="progress" />
        <Metric label="Practice time" value={`${totalMinutes} min`} icon="speed" />
        <Metric label="Avg score" value={`${avgScore}%`} icon="sparkles" />
        <Metric label="Favorites" value={favorites.length} icon="star-fill" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel lg:col-span-2 p-6">
          <h2 className="text-base font-semibold">Recent sessions</h2>
          <p className="text-xs text-[color:var(--text-2)]">Last 12 practice runs</p>
          <div className="mt-4 space-y-2">
            {recentSessions.length === 0 ? (
              <Empty text="Complete a practice run to see results here." />
            ) : (
              recentSessions.map((session) => {
                const song = songs.find((s) => s.id === session.songId)
                const score = session.result?.finalScorePct ?? 0
                const grade = session.result?.grade ?? 'D'
                return (
                  <div key={session.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-300 font-bold">
                      {grade}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{song?.title ?? session.songId}</p>
                      <p className="text-xs text-[color:var(--text-2)]">
                        {new Date(session.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-violet-400 to-cyan-400"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-sm">{score}%</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-base font-semibold">Frequently played</h2>
          <p className="text-xs text-[color:var(--text-2)]">Songs you keep coming back to</p>
          <ul className="mt-4 space-y-2">
            {recentSongs.length === 0 ? (
              <Empty text="No songs practiced yet." />
            ) : (
              recentSongs.map((song) => (
                <li key={song.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <Icon name="piano" size={16} className="text-violet-300" />
                  <span className="text-sm">{song.title}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: Parameters<typeof Icon>[0]['name']
}) {
  return (
    <div className="stat-card flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
        <Icon name={icon} size={18} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-[color:var(--text-2)]">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-[color:var(--text-2)]">{text}</p>
}
