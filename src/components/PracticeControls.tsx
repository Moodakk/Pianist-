import type { HandMode, PracticeMode } from '../hooks/usePracticeEngine'
import { Icon } from './Icon'

interface Props {
  mode: PracticeMode
  handMode: HandMode
  speed: number
  metronomeOn: boolean
  countIn: number
  running: boolean
  canResume: boolean
  onMode: (v: PracticeMode) => void
  onHandMode: (v: HandMode) => void
  onSpeed: (v: number) => void
  onMetronome: (v: boolean) => void
  onCountIn: (v: number) => void
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
}

const speeds = [0.25, 0.5, 0.75, 1]
const modes: { id: PracticeMode; label: string }[] = [
  { id: 'watch', label: 'Watch' },
  { id: 'practice', label: 'Practice' },
  { id: 'rhythm', label: 'Rhythm' },
]
const handModes: { id: HandMode; label: string }[] = [
  { id: 'both', label: 'Both' },
  { id: 'right', label: 'Right' },
  { id: 'left', label: 'Left' },
]

export function PracticeControls(props: Props) {
  return (
    <div className="panel flex flex-wrap items-center gap-3 px-4 py-3">
      <button
        className={`btn ${props.running ? 'btn-warning' : 'btn-primary'} !px-4`}
        onClick={props.running ? props.onPause : props.onPlay}
        aria-label={props.running ? 'Pause' : props.canResume ? 'Resume' : 'Play'}
      >
        <Icon name={props.running ? 'pause' : 'play'} size={18} />
        {props.running ? 'Pause' : props.canResume ? 'Resume' : 'Play'}
      </button>

      <button
        className="btn btn-ghost !px-3"
        onClick={props.onRestart}
        aria-label="Restart"
        title="Restart from beginning"
      >
        <Icon name="stop" size={14} />
      </button>

      <div className="mx-1 h-8 w-px bg-white/10" />

      <ControlGroup label="Mode" icon="sparkles">
        {modes.map((m) => (
          <SegBtn key={m.id} active={props.mode === m.id} onClick={() => props.onMode(m.id)}>
            {m.label}
          </SegBtn>
        ))}
      </ControlGroup>

      <ControlGroup label="Hands" icon="hand">
        {handModes.map((h) => (
          <SegBtn key={h.id} active={props.handMode === h.id} onClick={() => props.onHandMode(h.id)}>
            {h.label}
          </SegBtn>
        ))}
      </ControlGroup>

      <ControlGroup label="Speed" icon="speed">
        {speeds.map((v) => (
          <SegBtn key={v} active={props.speed === v} onClick={() => props.onSpeed(v)}>
            {Math.round(v * 100)}%
          </SegBtn>
        ))}
      </ControlGroup>

      <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[color:var(--text-1)]">
          Count-in
          <input
            type="number"
            min={0}
            max={8}
            value={props.countIn}
            onChange={(e) => props.onCountIn(Number(e.target.value))}
            className="input !w-16 !px-2 !py-1 text-center"
          />
        </label>

        <button
          className="flex items-center gap-2 text-xs text-[color:var(--text-1)] transition hover:text-white"
          onClick={() => props.onMetronome(!props.metronomeOn)}
        >
          <Icon name="metronome" size={14} />
          Metronome
          <span className={`toggle ${props.metronomeOn ? 'on' : ''}`} />
        </button>
      </div>
    </div>
  )
}

function ControlGroup({
  label,
  icon,
  children,
}: {
  label: string
  icon: 'sparkles' | 'hand' | 'speed'
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[color:var(--text-2)]">
        <Icon name={icon} size={12} />
        {label}
      </span>
      <div className="seg-group">{children}</div>
    </div>
  )
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button onClick={onClick} className={`seg-btn ${active ? 'active' : ''}`}>
      {children}
    </button>
  )
}
