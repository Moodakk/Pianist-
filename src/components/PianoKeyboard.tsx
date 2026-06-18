import { useMemo, useState } from 'react'
import { isBlackKey, midiToName } from '../utils/midiHelpers'

interface Props {
  activeNotes: number[]
  leftHandNotes?: number[]
  onPress?: (midi: number, on: boolean) => void
  min?: number
  max?: number
  showLabels?: boolean
}

const DEFAULT_MIN = 36
const DEFAULT_MAX = 96

export function PianoKeyboard({
  activeNotes,
  leftHandNotes = [],
  onPress,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  showLabels = true,
}: Props) {
  const [mouseDown, setMouseDown] = useState<number | null>(null)

  const { whiteKeys, blackKeys } = useMemo(() => {
    const whites: number[] = []
    const blacks: number[] = []
    for (let m = min; m <= max; m++) {
      if (isBlackKey(m)) blacks.push(m)
      else whites.push(m)
    }
    return { whiteKeys: whites, blackKeys: blacks }
  }, [min, max])

  const whiteIndexFor = (midi: number) => {
    let idx = 0
    for (let m = min; m < midi; m++) if (!isBlackKey(m)) idx++
    return idx
  }

  const whiteWidthPct = 100 / whiteKeys.length

  const isLeftHand = (m: number) => leftHandNotes.includes(m)
  const isActive = (m: number) =>
    activeNotes.includes(m) || leftHandNotes.includes(m) || mouseDown === m

  const press = (midi: number) => {
    setMouseDown(midi)
    onPress?.(midi, true)
  }
  const release = (midi: number) => {
    if (mouseDown !== midi) return
    setMouseDown(null)
    onPress?.(midi, false)
  }

  return (
    <div className="piano">
      <div className="white-row">
        {whiteKeys.map((midi) => (
          <button
            key={midi}
            tabIndex={-1}
            onPointerDown={(e) => {
              e.preventDefault()
              press(midi)
            }}
            onPointerUp={() => release(midi)}
            onPointerLeave={() => release(midi)}
            className={`key-white ${isActive(midi) ? (isLeftHand(midi) ? 'lh active' : 'active') : ''}`}
            aria-label={midiToName(midi)}
          >
            {showLabels && midi % 12 === 0 ? (
              <span className="key-label">{midiToName(midi)}</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="black-row">
        {blackKeys.map((midi) => {
          const whiteIdx = whiteIndexFor(midi)
          const left = whiteIdx * whiteWidthPct
          return (
            <button
              key={midi}
              tabIndex={-1}
              onPointerDown={(e) => {
                e.preventDefault()
                press(midi)
              }}
              onPointerUp={() => release(midi)}
              onPointerLeave={() => release(midi)}
              className={`key-black ${isActive(midi) ? (isLeftHand(midi) ? 'lh active' : 'active') : ''}`}
              style={{ left: `${left}%`, width: `${whiteWidthPct * 0.6}%` }}
              aria-label={midiToName(midi)}
            />
          )
        })}
      </div>
    </div>
  )
}
