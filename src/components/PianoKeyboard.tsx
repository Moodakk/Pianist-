import { memo, useMemo, useState } from 'react'
import { isBlackKey, midiToName } from '../utils/midiHelpers'

interface Props {
  activeNotes: number[]
  hitNotes?: number[]
  hitLeftHandNotes?: number[]
  guideNotes?: number[]
  guideLeftHandNotes?: number[]
  leftHandNotes?: number[]
  onPress?: (midi: number, on: boolean) => void
  min?: number
  max?: number
  showLabels?: boolean
}

const DEFAULT_MIN = 36
const DEFAULT_MAX = 96

function PianoKeyboardImpl({
  activeNotes,
  hitNotes = [],
  hitLeftHandNotes = [],
  guideNotes = [],
  guideLeftHandNotes = [],
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

  const isLeftHand = (m: number) =>
    leftHandNotes.includes(m) ||
    hitLeftHandNotes.includes(m) ||
    guideLeftHandNotes.includes(m)
  const isPressed = (m: number) =>
    activeNotes.includes(m) || leftHandNotes.includes(m) || mouseDown === m
  const isHit = (m: number) =>
    !isPressed(m) && (hitNotes.includes(m) || hitLeftHandNotes.includes(m))
  const isGuide = (m: number) =>
    !isPressed(m) && !isHit(m) && (guideNotes.includes(m) || guideLeftHandNotes.includes(m))
  const keyClass = (m: number) => {
    if (isPressed(m)) return isLeftHand(m) ? 'lh active' : 'active'
    if (isHit(m)) return isLeftHand(m) ? 'lh hit' : 'hit'
    if (isGuide(m)) return isLeftHand(m) ? 'lh guide' : 'guide'
    return ''
  }

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
          <div
            key={midi}
            role="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.preventDefault()
              press(midi)
            }}
            onPointerUp={() => release(midi)}
            onPointerLeave={() => release(midi)}
            className={`key-white ${keyClass(midi)}`}
            aria-label={midiToName(midi)}
          >
            {showLabels ? (
              <span className={`key-label ${midi % 12 === 0 ? 'c-label' : ''}`}>
                {midi % 12 === 0 ? midiToName(midi) : midiToName(midi).replace(/\d+$/, '')}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="black-row">
        {blackKeys.map((midi) => {
          const whiteIdx = whiteIndexFor(midi)
          const left = whiteIdx * whiteWidthPct
          return (
            <div
              key={midi}
              role="button"
              tabIndex={-1}
              onPointerDown={(e) => {
                e.preventDefault()
                press(midi)
              }}
              onPointerUp={() => release(midi)}
              onPointerLeave={() => release(midi)}
              className={`key-black ${keyClass(midi)}`}
              style={{ left: `${left}%`, width: `${whiteWidthPct * 0.6}%` }}
              aria-label={midiToName(midi)}
            >
              {showLabels ? (
                <span className="key-label-black">{midiToName(midi).replace(/\d+$/, '')}</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function arraysEqual(a: number[], b: number[]) {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export const PianoKeyboard = memo(PianoKeyboardImpl, (prev, next) => {
  return (
    arraysEqual(prev.activeNotes, next.activeNotes) &&
    arraysEqual(prev.hitNotes ?? [], next.hitNotes ?? []) &&
    arraysEqual(prev.hitLeftHandNotes ?? [], next.hitLeftHandNotes ?? []) &&
    arraysEqual(prev.guideNotes ?? [], next.guideNotes ?? []) &&
    arraysEqual(prev.guideLeftHandNotes ?? [], next.guideLeftHandNotes ?? []) &&
    arraysEqual(prev.leftHandNotes ?? [], next.leftHandNotes ?? []) &&
    prev.onPress === next.onPress &&
    prev.min === next.min &&
    prev.max === next.max &&
    prev.showLabels === next.showLabels
  )
})
