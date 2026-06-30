import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MidiNote } from '../types/midi'
import type { ScoreResult } from '../types/scoring'
import { gradeFromScore } from '../utils/timing'

interface HitState {
  hit: Set<number>
  wrongNotes: number
  combo: number
  bestCombo: number
  deltas: number[]
}

const TOLERANCE_SEC = 0.2

export function useScoring(notes: MidiNote[]) {
  const [state, setState] = useState<HitState>({
    hit: new Set(),
    wrongNotes: 0,
    combo: 0,
    bestCombo: 0,
    deltas: [],
  })

  const notesRef = useRef(notes)
  useEffect(() => { notesRef.current = notes }, [notes])

  const onNoteInput = useCallback((midi: number, currentTime: number) => {
    setState((prev) => {
      const currentNotes = notesRef.current
      const candidates = currentNotes
        .map((note, index) => ({ note, index }))
        .filter(({ note, index }) => note.midi === midi && !prev.hit.has(index) && Math.abs(note.start - currentTime) <= TOLERANCE_SEC)

      if (!candidates.length) {
        return { ...prev, wrongNotes: prev.wrongNotes + 1, combo: 0 }
      }

      const best = candidates.sort((a, b) => Math.abs(a.note.start - currentTime) - Math.abs(b.note.start - currentTime))[0]
      const nextHit = new Set(prev.hit)
      nextHit.add(best.index)
      const delta = Math.abs(best.note.start - currentTime) * 1000
      const combo = prev.combo + 1
      return {
        ...prev,
        hit: nextHit,
        combo,
        bestCombo: Math.max(prev.bestCombo, combo),
        deltas: [...prev.deltas, delta],
      }
    })
  }, [])

  const reset = useCallback(() => {
    setState({ hit: new Set(), wrongNotes: 0, combo: 0, bestCombo: 0, deltas: [] })
  }, [])

  const result = useMemo<ScoreResult>(() => {
    const correctNotes = state.hit.size
    const missedNotes = Math.max(notes.length - correctNotes, 0)
    const timingAccuracyMs = state.deltas.length
      ? Math.round(state.deltas.reduce((sum, d) => sum + d, 0) / state.deltas.length)
      : 0
    const noteAccuracyPct = notes.length ? (correctNotes / notes.length) * 100 : 0
    const timingScore = Math.max(0, 100 - timingAccuracyMs / 3)
    const finalScorePct = noteAccuracyPct * 0.7 + timingScore * 0.3

    const recommendation =
      missedNotes > correctNotes * 0.3
        ? 'Practice left hand slower and loop short sections.'
        : state.wrongNotes > correctNotes * 0.2
          ? 'Focus on accuracy and keep a steady rhythm.'
          : 'Great run. Increase speed or try both hands.'

    return {
      correctNotes,
      missedNotes,
      wrongNotes: state.wrongNotes,
      combo: state.combo,
      bestCombo: state.bestCombo,
      timingAccuracyMs,
      noteAccuracyPct: Number(noteAccuracyPct.toFixed(1)),
      finalScorePct: Number(finalScorePct.toFixed(1)),
      grade: gradeFromScore(finalScorePct),
      practiceTimeSec: 0,
      recommendation,
    }
  }, [notes.length, state])

  return useMemo(
    () => ({ onNoteInput, reset, result, hitSet: state.hit }),
    [onNoteInput, reset, result, state.hit],
  )
}
