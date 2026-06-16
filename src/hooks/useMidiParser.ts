import { useCallback } from 'react'
import { Midi } from '@tonejs/midi'
import type { ParsedMidiSong } from '../types/midi'

export function useMidiParser() {
  const parseFile = useCallback(async (file: File): Promise<ParsedMidiSong> => {
    const buffer = await file.arrayBuffer()
    const midi = new Midi(buffer)

    const tracks = midi.tracks
      .map((track, index) => ({
        index,
        name: track.name || `Track ${index + 1}`,
        instrument: track.instrument.name,
        notes: track.notes.map((note) => ({
          midi: note.midi,
          name: note.name,
          velocity: note.velocity,
          start: note.time,
          duration: note.duration,
          end: note.time + note.duration,
          track: index,
        })),
      }))
      .filter((track) => track.notes.length > 0)

    return {
      title: file.name.replace(/\.(mid|midi)$/i, ''),
      bpm: midi.header.tempos[0]?.bpm ?? 120,
      ppq: midi.header.ppq,
      tracks,
      duration: midi.duration,
    }
  }, [])

  return { parseFile }
}
