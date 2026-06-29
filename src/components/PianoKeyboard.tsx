import { isBlackKey } from '../utils/midiHelpers'

interface Props {
  activeNotes: number[]
  onPress?: (midi: number, on: boolean) => void
  min?: number
  max?: number
}

export function PianoKeyboard({ activeNotes, onPress, min = 48, max = 84 }: Props) {
  const notes = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="relative h-28 w-full overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-1">
      <div className="relative flex h-full min-w-max">
        {notes.map((midi) => {
          const active = activeNotes.includes(midi)
          const black = isBlackKey(midi)
          return (
            <button
              key={midi}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault()
                onPress?.(midi, true)
              }}
              onMouseUp={() => onPress?.(midi, false)}
              onMouseLeave={() => onPress?.(midi, false)}
              className={`relative h-full w-6 select-none border outline-none ${black ? 'mt-0 h-16 bg-slate-800' : 'bg-white'} ${active ? 'ring-2 ring-cyan-400' : ''}`}
            />
          )
        })}
      </div>
    </div>
  )
}
