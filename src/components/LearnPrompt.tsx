import type { MidiNote } from '../types/midi'
import { stepNoteNames } from '../utils/learnMode'
import { Icon } from './Icon'

interface Props {
  stepNumber: number
  totalSteps: number
  notes: MidiNote[]
  waiting: boolean
  simplified: boolean
}

export function LearnPrompt({ stepNumber, totalSteps, notes, waiting, simplified }: Props) {
  if (!notes.length) return null

  const hasLeft = notes.some((n) => n.track % 2 === 1)
  const hasRight = notes.some((n) => n.track % 2 === 0)
  const handHint =
    hasLeft && hasRight ? 'Both hands' : hasLeft ? 'Left hand' : hasRight ? 'Right hand' : 'Play'

  return (
    <div className="learn-prompt">
      <div className="learn-prompt-card">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          <Icon name="sparkles" size={14} />
          Learn mode
          {simplified ? <span className="chip violet !py-0.5 !text-[9px]">Simplified</span> : null}
        </div>
        <p className="mt-2 text-xs text-[color:var(--text-2)]">
          Step {Math.min(stepNumber + 1, totalSteps)} of {totalSteps}
        </p>
        <p className="mt-1 text-lg font-semibold text-white">{stepNoteNames(notes)}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-[color:var(--text-1)]">
          <Icon name="hand" size={16} />
          {handHint}
        </p>
        {waiting ? (
          <p className="mt-3 text-sm font-medium text-amber-200">Play the highlighted keys</p>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--text-2)]">Next notes approaching…</p>
        )}
      </div>
    </div>
  )
}
