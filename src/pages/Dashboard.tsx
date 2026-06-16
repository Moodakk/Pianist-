import { Link, useNavigate } from 'react-router-dom'
import { SongCard } from '../components/SongCard'
import { Icon } from '../components/Icon'
import type { Song } from '../types/song'

interface Props {
  songs: Song[]
  onPlay?: (song: Song) => void
}

export function Dashboard({ songs, onPlay }: Props) {
  const navigate = useNavigate()
  const favorites = songs.filter((song) => song.favorite)
  const imported = songs.filter((song) => !song.isPlaceholder)
  const recommended = songs.filter((s) => !s.isPlaceholder).slice(0, 6)
  const showcase = songs.slice(0, 4)

  return (
    <div className="p-8 space-y-10">
      <section className="panel relative overflow-hidden p-8">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="chip violet">
            <Icon name="sparkles" size={12} /> Easy Piano Desktop
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight">
            Learn anime piano with a <span className="bg-gradient-to-r from-violet-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">falling-notes</span> player.
          </h1>
          <p className="mt-3 max-w-xl text-[color:var(--text-1)]">
            Connect your MIDI keyboard, import legally obtained MIDI files and practice openings in
            watch, practice, or rhythm mode — with live scoring and progress tracking.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="btn btn-primary"
              onClick={() => {
                const first = recommended[0]
                if (first) {
                  onPlay?.(first)
                  navigate('/practice')
                } else {
                  navigate('/import')
                }
              }}
            >
              <Icon name="play" size={16} />
              {recommended[0] ? 'Quick Practice' : 'Import your first MIDI'}
            </button>
            <Link to="/library" className="btn btn-ghost">
              <Icon name="library" size={16} />
              Browse Library
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Songs" value={songs.length} accent="violet" icon="library" />
        <StatCard label="Imported" value={imported.length} accent="cyan" icon="upload" />
        <StatCard label="Favorites" value={favorites.length} accent="pink" icon="star-fill" />
        <StatCard label="MIDI Status" value="Ready" accent="emerald" icon="midi" />
      </section>

      <section>
        <SectionHeader title="Recommended for you" subtitle="Picked from your library" to="/library" />
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {(recommended.length ? recommended : showcase).map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onPractice={(s) => {
                if (s.isPlaceholder) navigate('/import')
                else {
                  onPlay?.(s)
                  navigate('/practice')
                }
              }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: string | number
  accent: 'violet' | 'cyan' | 'pink' | 'emerald'
  icon: Parameters<typeof Icon>[0]['name']
}) {
  const colors: Record<typeof accent, string> = {
    violet: 'text-violet-300 bg-violet-500/15',
    cyan: 'text-cyan-300 bg-cyan-500/15',
    pink: 'text-pink-300 bg-pink-500/15',
    emerald: 'text-emerald-300 bg-emerald-500/15',
  }
  return (
    <div className="stat-card flex items-center gap-4">
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${colors[accent]}`}>
        <Icon name={icon} size={20} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-[color:var(--text-2)]">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle ? <p className="text-sm text-[color:var(--text-2)]">{subtitle}</p> : null}
      </div>
      {to ? (
        <Link to={to} className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">
          See all <Icon name="chevron-right" size={14} />
        </Link>
      ) : null}
    </div>
  )
}
