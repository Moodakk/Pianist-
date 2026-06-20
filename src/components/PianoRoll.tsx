import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MidiNote } from '../types/midi'
import { isBlackKey, midiToName } from '../utils/midiHelpers'

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

interface PositionedNote {
  index: number
  midi: number
  track: number
  top: number
  h: number
  left: number
  width: number
  isBlack: boolean
  isLeftHand: boolean
  name: string
  shortName: string
}

export function PianoRoll({
  notes,
  currentTime,
  hitSet,
  missedSet,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  height: heightProp,
  pxPerSec = 220,
}: Props) {
  const rollRef = useRef<HTMLDivElement>(null)
  const [measuredHeight, setMeasuredHeight] = useState<number>(heightProp ?? 360)

  useLayoutEffect(() => {
    if (heightProp !== undefined || !rollRef.current) return
    const el = rollRef.current
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (h && Math.abs(h - measuredHeight) > 1) setMeasuredHeight(h)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [heightProp, measuredHeight])

  const height = heightProp ?? measuredHeight
  const whiteCount = useMemo(() => {
    let c = 0
    for (let m = min; m <= max; m++) if (!isBlackKey(m)) c++
    return c
  }, [min, max])

  const whiteIndexFor = useMemo(() => {
    const lookup = new Map<number, number>()
    let idx = 0
    for (let m = min; m <= max; m++) {
      if (!isBlackKey(m)) {
        lookup.set(m, idx)
        idx++
      } else {
        lookup.set(m, idx - 0.5)
      }
    }
    return (midi: number) => lookup.get(midi) ?? 0
  }, [min, max])

  const whiteWidthPct = 100 / whiteCount
  const hitLine = height - 24

  const positioned = useMemo<PositionedNote[]>(() => {
    return notes
      .filter((note) => note.midi >= min && note.midi <= max)
      .map((note, originalIndex) => {
        const isBlack = isBlackKey(note.midi)
        const h = Math.max(10, note.duration * pxPerSec)
        const top = hitLine - note.start * pxPerSec - h

        let left: number
        let width: number
        const whiteIdx = whiteIndexFor(note.midi)
        if (isBlack) {
          left = whiteIdx * whiteWidthPct + whiteWidthPct * 0.5 - whiteWidthPct * 0.3
          width = whiteWidthPct * 0.6
        } else {
          left = whiteIdx * whiteWidthPct + whiteWidthPct * 0.08
          width = whiteWidthPct * 0.84
        }

        const name = midiToName(note.midi)
        return {
          index: originalIndex,
          midi: note.midi,
          track: note.track,
          top,
          h,
          left,
          width,
          isBlack,
          isLeftHand: note.track % 2 === 1,
          name,
          shortName: name.replace(/\d+$/, ''),
        }
      })
  }, [notes, hitLine, pxPerSec, whiteWidthPct, whiteIndexFor, min, max])

  const layerRef = useRef<HTMLDivElement>(null)

  // Drive the transform via ref so React doesn't reconcile note children every frame.
  useEffect(() => {
    const el = layerRef.current
    if (el) el.style.transform = `translate3d(0, ${currentTime * pxPerSec}px, 0)`
  }, [currentTime, pxPerSec])

  return (
    <div
      ref={rollRef}
      className="roll"
      style={heightProp !== undefined ? { height: heightProp } : { height: '100%' }}
    >
      <div className="grid-bg" />
      <div className="hit-line" style={{ top: hitLine }} />
      <div className="hit-glow" style={{ top: hitLine - 2 }} />

      <NotesLayer
        innerRef={layerRef}
        positioned={positioned}
        hitSet={hitSet}
        missedSet={missedSet}
      />

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

interface LayerProps {
  innerRef: React.RefObject<HTMLDivElement | null>
  positioned: PositionedNote[]
  hitSet?: Set<number>
  missedSet?: Set<number>
}

const NotesLayer = memo(function NotesLayer({ innerRef, positioned, hitSet, missedSet }: LayerProps) {
  return (
    <div ref={innerRef} className="roll-layer">
      {positioned.map((n) => {
        const isHit = hitSet?.has(n.index)
        const isMissed = missedSet?.has(n.index)
        const cls = `roll-note ${n.isBlack ? 'black' : 'white'} ${
          isHit ? 'hit' : isMissed ? 'missed' : n.isLeftHand ? 'lh' : ''
        }`
        const showLabel = n.h >= 22
        const label = n.h >= 60 ? n.name : n.shortName
        return (
          <div
            key={n.index}
            className={cls}
            style={{
              left: `${n.left}%`,
              width: `${n.width}%`,
              top: n.top,
              height: n.h,
            }}
          >
            {showLabel ? <span className="note-label">{label}</span> : null}
          </div>
        )
      })}
    </div>
  )
})
