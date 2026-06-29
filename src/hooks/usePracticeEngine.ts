import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import type { MidiNote } from '../types/midi'

export type PracticeMode = 'watch' | 'practice' | 'rhythm'
export type HandMode = 'right' | 'left' | 'both'

export function usePracticeEngine(notes: MidiNote[], onEnd?: () => void) {
  const [mode, setMode] = useState<PracticeMode>('practice')
  const [handMode, setHandMode] = useState<HandMode>('both')
  const [speed, setSpeed] = useState(1)
  const [running, setRunning] = useState(false)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [loop, setLoop] = useState<{ start: number; end: number } | null>(null)
  const [countIn, setCountIn] = useState(2)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)

  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const waitRef = useRef(false)
  const clickSynth = useRef<Tone.MembraneSynth | null>(null)
  const onEndRef = useRef(onEnd)
  useEffect(() => { onEndRef.current = onEnd }, [onEnd])

  const filteredNotes = useMemo(() => {
    if (handMode === 'both') return notes
    return notes.filter((n) => (handMode === 'right' ? n.track % 2 === 0 : n.track % 2 === 1))
  }, [handMode, notes])

  const duration = useMemo(() => {
    let max = 0
    for (const n of notes) max = Math.max(max, n.start + n.duration)
    return max
  }, [notes])
  const durationRef = useRef(duration)
  useEffect(() => { durationRef.current = duration }, [duration])

  const nextRequiredNote = useMemo(
    () => filteredNotes.find((note) => note.start >= currentTime && note.start - currentTime < 0.25),
    [filteredNotes, currentTime],
  )

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
        if (mode === 'practice' && waitRef.current) {
          return prev
        }
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
    waitRef.current = false
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
  }, [])

  const resume = useCallback(async () => {
    await Tone.start()
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
    waitRef.current = false
  }, [])

  const seek = useCallback((seconds: number) => {
    setCurrentTime(Math.max(0, seconds))
    waitRef.current = false
  }, [])

  const registerHit = (midi: number) => {
    if (!nextRequiredNote || mode !== 'practice') return
    if (nextRequiredNote.midi === midi) {
      waitRef.current = false
    }
  }

  useEffect(() => {
    if (mode !== 'practice') {
      waitRef.current = false
      return
    }
    waitRef.current = Boolean(nextRequiredNote && currentTime >= nextRequiredNote.start)
  }, [currentTime, mode, nextRequiredNote])

  return {
    mode,
    setMode,
    handMode,
    setHandMode,
    speed,
    setSpeed,
    running,
    countdown,
    currentTime,
    duration,
    filteredNotes,
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
  }
}
