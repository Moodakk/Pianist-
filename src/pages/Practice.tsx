import { useMemo, useState } from 'react'
import { MidiDeviceSelector } from '../components/MidiDeviceSelector'
import { PianoKeyboard } from '../components/PianoKeyboard'
import { PianoRoll } from '../components/PianoRoll'
import { PracticeControls } from '../components/PracticeControls'
import { ScoreSummary } from '../components/ScoreSummary'
import { useMidiInput } from '../hooks/useMidiInput'
import { usePracticeEngine } from '../hooks/usePracticeEngine'
import { useScoring } from '../hooks/useScoring'
import type { PracticeSession } from '../types/scoring'
import type { Song } from '../types/song'

interface Props {
  song: Song | null
  onSessionComplete: (payload: PracticeSession) => void
}

export function Practice({ song, onSessionComplete }: Props) {
  const notes = useMemo(() => song?.midi?.tracks.flatMap((track) => track.notes) ?? [], [song])
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const engine = usePracticeEngine(notes)
  const scoring = useScoring(engine.filteredNotes)

  const midiInput = useMidiInput((midi, on) => {
    if (!on) return
    scoring.onNoteInput(midi, engine.currentTime)
    engine.registerHit(midi)
  })

  const finishRun = () => {
    engine.stop()
    if (!song || startedAt === null) return
    onSessionComplete({
      id: `${song.id}-${Date.now()}`,
      songId: song.id,
      startedAt,
      endedAt: Date.now(),
      result: { ...scoring.result, practiceTimeSec: Math.round((Date.now() - startedAt) / 1000) },
    })
  }

  if (!song) {
    return <p>Select a song from Library first.</p>
  }

  return (
    <div className="space-y-4">
      <header className="rounded-xl bg-slate-900/70 p-4">
        <h1 className="text-2xl font-semibold text-violet-200">{song.title}</h1>
        <p className="text-sm text-slate-300">{song.tags.anime} • {song.tags.difficulty} • BPM {Math.round(song.tags.bpm ?? 120)}</p>
      </header>

      <MidiDeviceSelector
        devices={midiInput.devices}
        selectedDeviceId={midiInput.selectedDeviceId}
        connect={midiInput.connect}
        onSelect={midiInput.setSelectedDeviceId}
        error={midiInput.error}
      />

      <PracticeControls
        mode={engine.mode}
        handMode={engine.handMode}
        speed={engine.speed}
        metronomeOn={engine.metronomeOn}
        countIn={engine.countIn}
        onMode={engine.setMode}
        onHandMode={engine.setHandMode}
        onSpeed={engine.setSpeed}
        onMetronome={engine.setMetronomeOn}
        onCountIn={engine.setCountIn}
        onStart={() => {
          scoring.reset()
          setStartedAt(Date.now())
          void engine.start()
        }}
        onStop={finishRun}
      />

      <PianoRoll notes={engine.filteredNotes} currentTime={engine.currentTime} hitSet={scoring.hitSet} />
      <PianoKeyboard activeNotes={midiInput.activeNotes} onPress={(midi, on) => on && scoring.onNoteInput(midi, engine.currentTime)} />
      <ScoreSummary result={scoring.result} />
    </div>
  )
}
