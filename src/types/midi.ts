export interface MidiDevice {
  id: string
  name: string
  manufacturer?: string
  connected: boolean
}

export interface MidiNote {
  midi: number
  name: string
  velocity: number
  start: number
  duration: number
  end: number
  track: number
}

export interface MidiTrackData {
  index: number
  name: string
  instrument: string
  notes: MidiNote[]
}

export type TrackAssignment = 'right' | 'left' | 'both' | 'ignore'

export interface ParsedMidiSong {
  title: string
  bpm: number
  ppq: number
  tracks: MidiTrackData[]
  duration: number
}
