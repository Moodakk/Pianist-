import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SongCard } from '../components/SongCard'
import { Icon } from '../components/Icon'
import type { Song } from '../types/song'

interface Props {
  songs: Song[]
  onFavorite: (id: string) => void
  onSetPracticeSong: (song: Song) => void
}

const filters = ['All', 'Favorites', 'Imported', 'Beginner', 'Intermediate', 'Advanced'] as const
type Filter = (typeof filters)[number]

export function Library({ songs, onFavorite, onSetPracticeSong }: Props) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return songs.filter((song) => {
      if (q && !`${song.title} ${song.tags.anime}`.toLowerCase().includes(q)) return false
      switch (filter) {
        case 'Favorites':
          return song.favorite
        case 'Imported':
          return !song.isPlaceholder
        case 'Beginner':
          return song.tags.difficulty === 'Beginner'
        case 'Intermediate':
          return song.tags.difficulty === 'Intermediate'
        case 'Advanced':
          return song.tags.difficulty === 'Advanced'
        default:
          return true
      }
    })
  }, [songs, filter, query])

  const groups = useMemo(() => {
    const byCategory = new Map<string, Song[]>()
    for (const song of filtered) {
      const key = song.isPlaceholder ? song.category : 'User Imported Songs'
      if (!byCategory.has(key)) byCategory.set(key, [])
      byCategory.get(key)!.push(song)
    }
    const order = ['User Imported Songs', 'Tokyo Ghoul', 'Popular Anime Openings']
    return Array.from(byCategory.entries()).sort(
      (a, b) => (order.indexOf(a[0]) === -1 ? 99 : order.indexOf(a[0])) - (order.indexOf(b[0]) === -1 ? 99 : order.indexOf(b[0])),
    )
  }, [filtered])

  return (
    <div className="space-y-6 p-8">
      <div className="panel flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="search-box flex-1 !min-w-0">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, anime, openings…"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'} !py-1.5 !px-3 text-xs`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel grid place-items-center p-16 text-center">
          <Icon name="library" size={36} className="text-violet-300" />
          <p className="mt-3 text-lg font-semibold">No songs found</p>
          <p className="text-sm text-[color:var(--text-2)]">Try a different filter or import a MIDI file.</p>
        </div>
      ) : (
        groups.map(([category, list]) => (
          <section key={category}>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{category}</h2>
              <span className="text-xs text-[color:var(--text-2)]">{list.length} songs</span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {list.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onFavorite={onFavorite}
                  onPractice={(selected) => {
                    if (selected.isPlaceholder) {
                      navigate('/import')
                      return
                    }
                    onSetPracticeSong(selected)
                    navigate('/practice')
                  }}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
