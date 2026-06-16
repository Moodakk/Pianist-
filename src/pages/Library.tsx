import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SongCard } from '../components/SongCard'
import type { Song } from '../types/song'

interface Props {
  songs: Song[]
  onFavorite: (id: string) => void
  onSetPracticeSong: (song: Song) => void
}

const categoryOrder = ['Tokyo Ghoul', 'Popular Anime Openings', 'User Imported Songs', 'Beginner', 'Intermediate', 'Advanced']

export function Library({ songs, onFavorite, onSetPracticeSong }: Props) {
  const navigate = useNavigate()

  const grouped = useMemo(() => {
    const map: Record<string, Song[]> = {
      'Tokyo Ghoul': songs.filter((s) => s.category === 'Tokyo Ghoul'),
      'Popular Anime Openings': songs.filter((s) => s.category === 'Popular Anime Openings'),
      'User Imported Songs': songs.filter((s) => !s.isPlaceholder),
      Beginner: songs.filter((s) => s.tags.difficulty === 'Beginner'),
      Intermediate: songs.filter((s) => s.tags.difficulty === 'Intermediate'),
      Advanced: songs.filter((s) => s.tags.difficulty === 'Advanced'),
    }
    return map
  }, [songs])

  return (
    <div className="space-y-8">
      {categoryOrder.map((category) => (
        <section key={category}>
          <h2 className="mb-3 text-xl font-semibold text-violet-200">{category}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(grouped[category] ?? []).map((song) => (
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
      ))}
    </div>
  )
}
