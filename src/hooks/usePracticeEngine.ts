import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import type { MidiNote } from '../types/midi'
import {
  collectVisibleStepIndices,
  groupNoteIndicesIntoSteps,
  notesFromStepIndices,
  simplifyNotes,
} from '../utils/learnMode'

export type PracticeMode = 'watch' | 'practice' | 'learn' | 'rhythm'
export type HandMode = 'right' | 'left' | 'both'

const LEARN_PREVIEW_STEPS = 2

export function usePracticeEngine(notes: MidiNote[], onEnd?: () => void) {
  const [mode, setMode] = useState<PracticeMode>('learn')
  const [handMode, setHandMode] = useState<HandMode>('both')
  const [simplified, setSimplified] = useState(true)
  const [speed, setSpeed] = useState(0.5)
  const [running, setRunning] = useState(false)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [loop, setLoop] = useState<{ start: number; end: number } | null>(null)
  const [countIn, setCountIn] = useState(2)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [learnStepIndex, setLearnStepIndex] = useState(0)
  const [waiting, setWaiting] = useState(false)

  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const waitRef = useRef(false)
  const learnStepHitsRef = useRef<Set<number>>(new Set())
  const learnStepIndexRef = useRef(0)
  const displayNotesRef = useRef<MidiNote[]>([])
  const clickSynth = useRef<Tone.MembraneSynth | null>(null)
  const onEndRef = useRef(onEnd)
  useEffect(() => { onEndRef.current = onEnd }, [onEnd])

  const handFilteredNotes = useMemo(() => {
    if (handMode === 'both') return notes
    return notes.filter((n) => (handMode === 'right' ? n.track % 2 === 0 : n.track % 2 === 1))
  }, [handMode, notes])

  const displayNotes = useMemo(
    () => (simplified ? simplifyNotes(handFilteredNotes) : handFilteredNotes),
    [handFilteredNotes, simplified],
  )
  useEffect(() => { displayNotesRef.current = displayNotes }, [displayNotes])
  useEffect(() => { learnStepIndexRef.current = learnStepIndex }, [learnStepIndex])

  const learnSteps = useMemo(() => groupNoteIndicesIntoSteps(displayNotes), [displayNotes])
  const learnStepsRef = useRef(learnSteps)
  useEffect(() => { learnStepsRef.current = learnSteps }, [learnSteps])

  const currentLearnStepIndices = learnSteps[learnStepIndex] ?? []
  const currentLearnStepNotes = useMemo(
    () => notesFromStepIndices(displayNotes, currentLearnStepIndices),
    [displayNotes, currentLearnStepIndices],
  )

  const learnVisibleIndices = useMemo(() => {
    if (mode !== 'learn') return null
    return collectVisibleStepIndices(learnSteps, learnStepIndex, LEARN_PREVIEW_STEPS)
  }, [mode, learnSteps, learnStepIndex])

  const duration = useMemo(() => {
    let max = 0
    for (const n of displayNotes) max = Math.max(max, n.start + n.duration)
    return max
  }, [displayNotes])
  const durationRef = useRef(duration)
  useEffect(() => { durationRef.current = duration }, [duration])

  const nextRequiredNote = useMemo(
    () => displayNotes.find((note) => note.start >= currentTime && note.start - currentTime < 0.25),
    [displayNotes, currentTime],
  )

  const resetLearnProgress = useCallback(() => {
    setLearnStepIndex(0)
    learnStepHitsRef.current.clear()
    waitRef.current = false
    setWaiting(false)
  }, [])

  useEffect(() => {
    clickSynth.current = new Tone.MembraneSynth({ volume: -16 }).toDestination()
    return () => {
      clickSynth.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
      return
    }

    const tick = (timestamp: number) => {
      if (lastRef.current == null) {
        lastRef.current = timestamp
      }
      const deltaSec = ((timestamp - lastRef.current) / 1000) * speed
      lastRef.current = timestamp

      let endReached = false
      setCurrentTime((prev) => {
        const shouldWait = (mode === 'practice' || mode === 'learn') && waitRef.current
        if (shouldWait) return prev

        let next = prev + deltaSec
        if (loop && next > loop.end) {
          next = loop.start
        }
        const dur = durationRef.current
        if (dur > 0 && next >= dur) {
          endReached = true
          next = dur
        }
        return next
      })

      if (endReached) {
        setRunning(false)
        const cb = onEndRef.current
        if (cb) cb()
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [running, speed, mode, loop])

  useEffect(() => {
    if (!metronomeOn || !running) return
    const id = Tone.Transport.scheduleRepeat((time) => {
      clickSynth.current?.triggerAttackRelease('C2', '16n', time)
    }, '4n')
    Tone.Transport.start()
    return () => {
      Tone.Transport.clear(id)
      Tone.Transport.stop()
    }
  }, [metronomeOn, running])

  const start = async () => {
    await Tone.start()
    setCurrentTime(0)
    resetLearnProgress()
    if (countIn > 0) {
      for (let i = countIn; i > 0; i--) {
        setCountdown(i)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      setCountdown(null)
    }
    setRunning(true)
  }

  const pause = useCallback(() => {
    setRunning(false)
    waitRef.current = false
    setWaiting(false)
  }, [])

  const resume = useCallback(async () => {
    await Tone.start()
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
    waitRef.current = false
    setWaiting(false)
  }, [])

  const seek = useCallback((seconds: number) => {
    setCurrentTime(Math.max(0, seconds))
    waitRef.current = false
    setWaiting(false)
    learnStepHitsRef.current.clear()
  }, [])

  const registerHit = useCallback(
    (midi: number) => {
      if (mode === 'learn') {
        const stepIndex = learnStepIndexRef.current
        const stepIndices = learnStepsRef.current[stepIndex]
        if (!stepIndices?.length) return

        const stepNotes = notesFromStepIndices(displayNotesRef.current, stepIndices)
        const requiredMidis = new Set(stepNotes.map((n) => n.midi))
        if (!requiredMidis.has(midi)) return

        learnStepHitsRef.current.add(midi)
        const allHit = [...requiredMidis].every((m) => learnStepHitsRef.current.has(m))
        if (allHit) {
          learnStepHitsRef.current.clear()
          const nextIndex = stepIndex + 1
          setLearnStepIndex(nextIndex)
          waitRef.current = false
          setWaiting(false)
        }
        return
      }

      if (!nextRequiredNote || mode !== 'practice') return
      if (nextRequiredNote.midi === midi) {
        waitRef.current = false
        setWaiting(false)
      }
    },
    [mode, nextRequiredNote],
  )

  useEffect(() => {
    if (mode === 'learn') {
      const stepIndices = learnSteps[learnStepIndex]
      if (!stepIndices?.length || !running) {
        waitRef.current = false
        setWaiting(false)
        return
      }
      const stepNotes = notesFromStepIndices(displayNotes, stepIndices)
      const stepStart = stepNotes[0]?.start ?? 0
      const requiredMidis = new Set(stepNotes.map((n) => n.midi))
      const hits = learnStepHitsRef.current
      const needsWait =
        currentTime >= stepStart && [...requiredMidis].some((m) => !hits.has(m))
      waitRef.current = needsWait
      setWaiting(needsWait)
      return
    }

    if (mode !== 'practice') {
      waitRef.current = false
      setWaiting(false)
      return
    }
    const needsWait = Boolean(nextRequiredNote && currentTime >= nextRequiredNote.start)
    waitRef.current = needsWait
    setWaiting(needsWait)
  }, [currentTime, mode, nextRequiredNote, learnStepIndex, learnSteps, displayNotes, running])

  useEffect(() => {
    if (mode === 'learn' && running && learnSteps.length > 0 && learnStepIndex >= learnSteps.length) {
      setRunning(false)
      waitRef.current = false
      setWaiting(false)
      const cb = onEndRef.current
      if (cb) cb()
    }
  }, [mode, running, learnStepIndex, learnSteps.length])

  useEffect(() => {
    resetLearnProgress()
  }, [simplified, handMode, resetLearnProgress])

  const handleSetMode = useCallback((next: PracticeMode) => {
    setMode(next)
    if (next === 'learn') {
      setSimplified(true)
      setSpeed((prev) => (prev > 0.75 ? 0.5 : prev))
    }
    resetLearnProgress()
  }, [resetLearnProgress])

  return {
    mode,
    setMode: handleSetMode,
    handMode,
    setHandMode,
    simplified,
    setSimplified,
    speed,
    setSpeed,
    running,
    waiting,
    countdown,
    currentTime,
    duration,
    filteredNotes: displayNotes,
    learnSteps,
    learnStepIndex,
    currentLearnStepNotes,
    learnVisibleIndices,
    metronomeOn,
    setMetronomeOn,
    loop,
    setLoop,
    countIn,
    setCountIn,
    start,
    pause,
    resume,
    stop,
    seek,
    registerHit,
    resetLearnProgress,
  }
}
