import { useMemo } from 'react'
import type { MidiNote } from '../types/midi'
import { isBlackKey } from '../utils/midiHelpers'

interface Props {
  notes: MidiNote[]
  currentTime: number
  hitSet?: Set<number>
  missedSet?: Set<number>
  min?: number
  max?: number
  height?: number
  pxPerSec?: number
}

const DEFAULT_MIN = 36
const DEFAULT_MAX = 96

export function PianoRoll({
  notes,
  currentTime,
  hitSet,
  missedSet,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  height = 460,
  pxPerSec = 220,
}: Props) {
  const whiteCount = useMemo(() => {
    let c = 0
    for (let m = min; m <= max; m++) if (!isBlackKey(m)) c++
    return c
  }, [min, max])

  const whiteIndexFor = (midi: number) => {
    let idx = 0
    for (let m = min; m < midi; m++) if (!isBlackKey(m)) idx++
    return idx
  }

  const whiteWidthPct = 100 / whiteCount
  const hitLine = height - 24

  return (
    <div className="roll" style={{ height }}>
      <div className="grid-bg" />
      <div className="hit-line" style={{ top: hitLine }} />
      {notes.map((note, index) => {
        if (note.midi < min || note.midi > max) return null
        const distance = (note.start - currentTime) * pxPerSec
        const y = hitLine - distance - Math.max(10, note.duration * pxPerSec)
        const h = Math.max(10, note.duration * pxPerSec)
        if (y > height + 20 || y + h < -20) return null

        const isBlack = isBlackKey(note.midi)
        let left: number
        let width: number
        if (isBlack) {
          const whiteIdx = whiteIndexFor(note.midi)
          left = whiteIdx * whiteWidthPct - whiteWidthPct * 0.3
          width = whiteWidthPct * 0.6
        } else {
          left = whiteIndexFor(note.midi) * whiteWidthPct + whiteWidthPct * 0.08
          width = whiteWidthPct * 0.84
        }

        const isHit = hitSet?.has(index)
        const isMissed = missedSet?.has(index)
        const isLeftHand = note.track % 2 === 1
        const className = `roll-note ${isHit ? 'hit' : isMissed ? 'missed' : isLeftHand ? 'lh' : ''}`

        return (
          <div
            key={`${note.track}-${index}-${note.start}`}
            className={className}
            style={{ left: `${left}%`, width: `${width}%`, top: y, height: h }}
          />
        )
      })}
      {notes.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center text-center text-sm text-[color:var(--text-2)]">
          <div>
            <p className="text-base font-medium text-[color:var(--text-1)]">No notes loaded</p>
            <p className="mt-1">Import a MIDI file to see the falling notes here.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
