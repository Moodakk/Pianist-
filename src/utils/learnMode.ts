import type { MidiNote } from '../types/midi'

const STEP_TOLERANCE_SEC = 0.055
const SIMPLIFY_CLUSTER_SEC = 0.09
const MIN_NOTE_DURATION = 0.07

/** One melody note per onset cluster — highest pitch wins. */
export function simplifyNotes(notes: MidiNote[]): MidiNote[] {
  if (!notes.length) return []
  const sorted = [...notes].sort((a, b) => a.start - b.start || b.midi - a.midi)
  const out: MidiNote[] = []

  for (const n of sorted) {
    const last = out[out.length - 1]
    if (last && n.start - last.start < SIMPLIFY_CLUSTER_SEC) {
      if (n.midi > last.midi) {
        out[out.length - 1] = {
          ...n,
          duration: Math.max(n.duration, last.duration, MIN_NOTE_DURATION),
        }
      }
      continue
    }
    out.push({ ...n, duration: Math.max(n.duration, MIN_NOTE_DURATION) })
  }

  return out
}

/** Group simultaneous notes into learn steps (indices into `notes`). */
export function groupNoteIndicesIntoSteps(notes: MidiNote[]): number[][] {
  if (!notes.length) return []

  const order = notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => a.note.start - b.note.start || a.note.midi - b.note.midi)

  const steps: number[][] = []
  let current: number[] = [order[0].index]
  let stepStart = order[0].note.start

  for (let i = 1; i < order.length; i++) {
    const { note, index } = order[i]
    if (note.start - stepStart <= STEP_TOLERANCE_SEC) {
      current.push(index)
    } else {
      steps.push(current)
      current = [index]
      stepStart = note.start
    }
  }
  steps.push(current)
  return steps
}

export function notesFromStepIndices(notes: MidiNote[], indices: number[]): MidiNote[] {
  return indices.map((i) => notes[i]).filter(Boolean)
}

export function stepNoteNames(notes: MidiNote[]): string {
  const unique = [...new Set(notes.map((n) => n.name))]
  return unique.join(' · ')
}

export function collectVisibleStepIndices(
  steps: number[][],
  fromStep: number,
  previewAhead = 2,
): Set<number> {
  const visible = new Set<number>()
  const end = Math.min(fromStep + previewAhead, steps.length - 1)
  for (let s = fromStep; s <= end; s++) {
    for (const idx of steps[s] ?? []) visible.add(idx)
  }
  return visible
}
