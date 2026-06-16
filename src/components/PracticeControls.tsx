import type { HandMode, PracticeMode } from '../hooks/usePracticeEngine'

interface Props {
  mode: PracticeMode
  handMode: HandMode
  speed: number
  metronomeOn: boolean
  countIn: number
  onMode: (v: PracticeMode) => void
  onHandMode: (v: HandMode) => void
  onSpeed: (v: number) => void
  onMetronome: (v: boolean) => void
  onCountIn: (v: number) => void
  onStart: () => void
  onStop: () => void
}

const speeds = [0.25, 0.5, 0.75, 1]

export function PracticeControls(props: Props) {
  return (
    <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4 md:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">Mode
        <select className="mt-1 w-full rounded bg-slate-950 p-2" value={props.mode} onChange={(e) => props.onMode(e.target.value as PracticeMode)}>
          <option value="watch">Watch mode</option>
          <option value="practice">Practice mode</option>
          <option value="rhythm">Rhythm mode</option>
        </select>
      </label>
      <label className="text-sm">Hands
        <select className="mt-1 w-full rounded bg-slate-950 p-2" value={props.handMode} onChange={(e) => props.onHandMode(e.target.value as HandMode)}>
          <option value="both">Both hands</option>
          <option value="right">Right hand</option>
          <option value="left">Left hand</option>
        </select>
      </label>
      <label className="text-sm">Speed
        <select className="mt-1 w-full rounded bg-slate-950 p-2" value={props.speed} onChange={(e) => props.onSpeed(Number(e.target.value))}>
          {speeds.map((v) => <option key={v} value={v}>{v * 100}%</option>)}
        </select>
      </label>
      <label className="text-sm">Count-in
        <input className="mt-1 w-full rounded bg-slate-950 p-2" type="number" min={0} max={8} value={props.countIn} onChange={(e) => props.onCountIn(Number(e.target.value))} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={props.metronomeOn} onChange={(e) => props.onMetronome(e.target.checked)} />
        Metronome
      </label>
      <div className="flex gap-2">
        <button className="rounded bg-emerald-600 px-3 py-2 text-sm" onClick={props.onStart}>Start</button>
        <button className="rounded bg-rose-600 px-3 py-2 text-sm" onClick={props.onStop}>Stop</button>
      </div>
    </div>
  )
}
