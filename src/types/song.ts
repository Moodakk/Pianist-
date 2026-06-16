import type { ParsedMidiSong, TrackAssignment } from './midi'

export type SongDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export interface SongTag {
  anime: string
  opening?: string
  difficulty: SongDifficulty
  bpm?: number
  key?: string
  sourceNote?: string
}

export interface Song {
  id: string
  title: string
  category: string
  tags: SongTag
  isPlaceholder?: boolean
  favorite?: boolean
  importedAt?: number
  midi?: ParsedMidiSong
  trackAssignments?: Record<number, TrackAssignment>
}
