import type { MidiNote } from '../types/midi'
import { isBlackKey } from '../utils/midiHelpers'

interface Props {
  notes: MidiNote[]
  currentTime: number
  hitSet?: Set<number>
}

const HIT_LINE = 280

export function PianoRoll({ notes, currentTime, hitSet }: Props) {
  return (
    <div className="relative h-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <div className="absolute inset-x-0 z-10 border-t-2 border-cyan-400" style={{ top: HIT_LINE }} />
      {notes.map((note, index) => {
        const y = (note.start - currentTime) * 120 + HIT_LINE
        const h = Math.max(8, note.duration * 120)
        if (y < -60 || y > 360) return null
        return (
          <div
            key={`${note.track}-${index}-${note.start}`}
            className={`absolute rounded ${hitSet?.has(index) ? 'bg-emerald-400' : note.track % 2 === 0 ? 'bg-violet-500' : 'bg-fuchsia-500'} ${isBlackKey(note.midi) ? 'opacity-85' : ''}`}
            style={{
              left: `${((note.midi - 36) / 60) * 100}%`,
              width: '1.4%',
              top: y,
              height: h,
            }}
          />
        )
      })}
    </div>
  )
}
