import { useMemo, useState } from 'react'
import type { Song } from '../types/song'
import type { PracticeSession } from '../types/scoring'
import { storage } from '../utils/storage'

const SONGS_KEY = 'anime-piano-trainer:songs'
const SESSIONS_KEY = 'anime-piano-trainer:sessions'
const SETTINGS_KEY = 'anime-piano-trainer:settings'

const placeholders: Song[] = [
  {
    id: 'tg-op1',
    title: 'Tokyo Ghoul Opening 1 - User MIDI Required',
    category: 'Tokyo Ghoul',
    isPlaceholder: true,
    tags: { anime: 'Tokyo Ghoul', opening: 'OP1', difficulty: 'Intermediate', sourceNote: 'Import your own legal MIDI.' },
  },
  {
    id: 'anime-pack-1',
    title: 'Anime Opening Pack - Import your own MIDI',
    category: 'Popular Anime Openings',
    isPlaceholder: true,
    tags: { anime: 'Multi-Anime', difficulty: 'Intermediate', sourceNote: 'No bundled copyrighted files.' },
  },
  {
    id: 'naruto-op',
    title: 'Naruto OP Placeholder - User MIDI Required',
    category: 'Popular Anime Openings',
    isPlaceholder: true,
    tags: { anime: 'Naruto', opening: 'OP', difficulty: 'Beginner' },
  },
  {
    id: 'aot-op',
    title: 'Attack on Titan OP Placeholder - User MIDI Required',
    category: 'Popular Anime Openings',
    isPlaceholder: true,
    tags: { anime: 'Attack on Titan', opening: 'OP', difficulty: 'Advanced' },
  },
  {
    id: 'demon-slayer-op',
    title: 'Demon Slayer OP Placeholder - User MIDI Required',
    category: 'Popular Anime Openings',
    isPlaceholder: true,
    tags: { anime: 'Demon Slayer', difficulty: 'Intermediate' },
  },
  {
    id: 'jjk-op',
    title: 'Jujutsu Kaisen OP Placeholder - User MIDI Required',
    category: 'Popular Anime Openings',
    isPlaceholder: true,
    tags: { anime: 'Jujutsu Kaisen', difficulty: 'Intermediate' },
  },
  {
    id: 'ylia-ed',
    title: 'Your Lie in April Theme Placeholder - User MIDI Required',
    category: 'Popular Anime Openings',
    isPlaceholder: true,
    tags: { anime: 'Your Lie in April', difficulty: 'Advanced' },
  },
]

export function useLocalLibrary() {
  const [songs, setSongs] = useState<Song[]>(() => {
    const imported = storage.get<Song[]>(SONGS_KEY, [])
    return [...placeholders, ...imported]
  })

  const [sessions, setSessions] = useState<PracticeSession[]>(storage.get<PracticeSession[]>(SESSIONS_KEY, []))
  const [settings, setSettingsState] = useState(
    storage.get(SETTINGS_KEY, {
      noteSpeed: 1,
      latencyMs: 0,
      theme: 'neon-dark',
      metronomeVolume: 70,
      keyboardRange: 'A0-C8',
      practiceDifficulty: 'Intermediate',
      apiBaseUrl: '',
      apiAuthToken: '',
    }),
  )

  const importedSongs = useMemo(() => songs.filter((song) => !song.isPlaceholder), [songs])

  const upsertImportedSong = (song: Song) => {
    setSongs((prev) => {
      const placeholdersOnly = prev.filter((s) => s.isPlaceholder)
      const imported = [...prev.filter((s) => !s.isPlaceholder && s.id !== song.id), song]
      storage.set(SONGS_KEY, imported)
      return [...placeholdersOnly, ...imported]
    })
  }

  const toggleFavorite = (id: string) => {
    setSongs((prev) => {
      const next = prev.map((song) => (song.id === id ? { ...song, favorite: !song.favorite } : song))
      storage.set(SONGS_KEY, next.filter((song) => !song.isPlaceholder))
      return next
    })
  }

  const addSession = (session: PracticeSession) => {
    setSessions((prev) => {
      const next = [session, ...prev].slice(0, 50)
      storage.set(SESSIONS_KEY, next)
      return next
    })
  }

  const setSettings = (next: typeof settings) => {
    setSettingsState(next)
    storage.set(SETTINGS_KEY, next)
  }

  const resetAllData = () => {
    storage.remove(SONGS_KEY)
    storage.remove(SESSIONS_KEY)
    storage.remove(SETTINGS_KEY)
    setSongs(placeholders)
    setSessions([])
  }

  return {
    songs,
    importedSongs,
    sessions,
    settings,
    upsertImportedSong,
    toggleFavorite,
    addSession,
    setSettings,
    resetAllData,
  }
}
