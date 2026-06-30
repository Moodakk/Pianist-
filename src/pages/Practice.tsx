import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MidiDeviceSelector } from '../components/MidiDeviceSelector'
import { PianoKeyboard } from '../components/PianoKeyboard'
import { PianoRoll } from '../components/PianoRoll'
import { PracticeControls } from '../components/PracticeControls'
import { ScoreSummary } from '../components/ScoreSummary'
import { Icon } from '../components/Icon'
import { useMidiInput } from '../hooks/useMidiInput'
import { usePracticeEngine } from '../hooks/usePracticeEngine'
import { useScoring } from '../hooks/useScoring'
import type { PracticeSession } from '../types/scoring'
import type { Song } from '../types/song'

interface Props {
  song: Song | null
  onSessionComplete: (payload: PracticeSession) => void
}

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function Practice({ song, onSessionComplete }: Props) {
  const navigate = useNavigate()
  const notes = useMemo(() => song?.midi?.tracks.flatMap((track) => track.notes) ?? [], [song])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const finishedRef = useRef(false)
  const finishCbRef = useRef<() => void>(() => {})
  const engine = usePracticeEngine(notes, () => finishCbRef.current())
  const scoring = useScoring(engine.filteredNotes)

  const midiInput = useMidiInput((midi, on) => {
    if (!on) return
    scoring.onNoteInput(midi, engine.currentTime)
    engine.registerHit(midi)
  })

  const leftHandActive = useMemo(
    () =>
      midiInput.activeNotes.filter((m) =>
        engine.filteredNotes.some((n) => n.midi === m && n.track % 2 === 1),
      ),
    [midiInput.activeNotes, engine.filteredNotes],
  )

  const currentTimeRef = useRef(engine.currentTime)
  useEffect(() => { currentTimeRef.current = engine.currentTime })

  const onKeyboardPress = useCallback(
    (midi: number, on: boolean) => {
      if (on) scoring.onNoteInput(midi, currentTimeRef.current)
    },
    [scoring],
  )

  const handlePlay = () => {
    if (!hasStarted) {
      scoring.reset()
      setShowSummary(false)
      setStartedAt(Date.now())
      setHasStarted(true)
      void engine.start()
    } else {
      finishedRef.current = false
      void engine.resume()
    }
  }

  const handleRestart = () => {
    scoring.reset()
    setShowSummary(false)
    setStartedAt(Date.now())
    setHasStarted(true)
    finishedRef.current = false
    void engine.start()
  }

  const handleFinish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    engine.stop()
    setHasStarted(false)
    if (!song || startedAt === null) return
    onSessionComplete({
      id: `${song.id}-${Date.now()}`,
      songId: song.id,
      startedAt,
      endedAt: Date.now(),
      result: { ...scoring.result, practiceTimeSec: Math.round((Date.now() - startedAt) / 1000) },
    })
    setShowSummary(true)
  }
  useEffect(() => {
    finishCbRef.current = handleFinish
  })

  const totalDuration = engine.duration || 1
  const progress = Math.min(1, engine.currentTime / totalDuration)

  if (!song) {
    return (
      <div className="grid h-full place-items-center p-12">
        <div className="panel max-w-md p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
            <Icon name="piano" size={28} />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No song selected</h2>
          <p className="mt-2 text-sm text-[color:var(--text-1)]">
            Pick a song from the Library or import a MIDI file to start practising.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn btn-primary" onClick={() => navigate('/library')}>
              <Icon name="library" size={14} /> Open Library
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/import')}>
              <Icon name="upload" size={14} /> Import MIDI
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="practice-header">
        <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => navigate('/library')}>
          <Icon name="chevron-right" size={12} className="rotate-180" /> Library
        </button>
        <div className="leading-tight min-w-0">
          <h1 className="truncate text-lg font-semibold">{song.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="chip violet">{song.tags.anime}</span>
            <span className="chip cyan">{song.tags.difficulty}</span>
            {song.tags.bpm ? <span className="chip">{Math.round(song.tags.bpm)} BPM</span> : null}
            {engine.running ? <span className="chip emerald">● Playing</span> : null}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="numeric-block text-right">
            <div className="text-base text-[color:var(--text-0)]">{formatTime(engine.currentTime)}</div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--text-2)]">
              of {formatTime(totalDuration)}
            </div>
          </div>
          <div className="hit-block hidden text-right text-xs text-[color:var(--text-2)] md:block">
            <span>Hit </span>
            <span className="text-sm text-emerald-300">{scoring.hitSet.size}</span>
            <span> / </span>
            <span className="text-sm text-[color:var(--text-1)]">{engine.filteredNotes.length}</span>
          </div>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="space-y-3 px-6 pt-4">
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
          running={engine.running}
          canResume={hasStarted && !engine.running && engine.currentTime > 0}
          onMode={engine.setMode}
          onHandMode={engine.setHandMode}
          onSpeed={engine.setSpeed}
          onMetronome={engine.setMetronomeOn}
          onCountIn={engine.setCountIn}
          onPlay={handlePlay}
          onPause={engine.pause}
          onRestart={handleRestart}
        />
      </div>

      <div className="relative mt-4 flex-1 min-h-0 px-6">
        <PianoRoll
          notes={engine.filteredNotes}
          currentTime={engine.currentTime}
          hitSet={scoring.hitSet}
        />
        {engine.countdown !== null ? (
          <div className="countdown-overlay">
            <div className="countdown-number">{engine.countdown}</div>
          </div>
        ) : null}
        {!engine.running && engine.countdown === null && engine.currentTime === 0 && !hasStarted ? (
          <div className="play-prompt">
            <div className="play-prompt-card">
              <Icon name="play" size={42} className="text-violet-200" />
              <p className="mt-3 text-sm text-[color:var(--text-1)]">Press Play to start</p>
            </div>
          </div>
        ) : null}
      </div>

      <PianoKeyboard
        activeNotes={midiInput.activeNotes}
        leftHandNotes={leftHandActive}
        onPress={onKeyboardPress}
      />

      {showSummary ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur" onClick={() => setShowSummary(false)}>
          <div className="w-full max-w-2xl space-y-3 animate-pop" onClick={(e) => e.stopPropagation()}>
            <ScoreSummary result={scoring.result} />
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setShowSummary(false)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowSummary(false)
                  handleRestart()
                }}
              >
                <Icon name="play" size={14} /> Try Again
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
