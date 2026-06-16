interface Props {
  settings: {
    noteSpeed: number
    latencyMs: number
    theme: string
    metronomeVolume: number
    keyboardRange: string
    practiceDifficulty: string
  }
  onChange: (settings: Props['settings']) => void
  onReset: () => void
}

export function Settings({ settings, onChange, onReset }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-violet-200">Settings</h1>
      <div className="grid gap-3 rounded-xl bg-slate-900/70 p-4 md:grid-cols-2">
        <label className="text-sm">Note Speed
          <input className="mt-1 w-full rounded bg-slate-950 p-2" type="number" step="0.05" min="0.25" max="2" value={settings.noteSpeed} onChange={(e) => onChange({ ...settings, noteSpeed: Number(e.target.value) })} />
        </label>
        <label className="text-sm">Latency (ms)
          <input className="mt-1 w-full rounded bg-slate-950 p-2" type="number" value={settings.latencyMs} onChange={(e) => onChange({ ...settings, latencyMs: Number(e.target.value) })} />
        </label>
        <label className="text-sm">Visual Theme
          <select className="mt-1 w-full rounded bg-slate-950 p-2" value={settings.theme} onChange={(e) => onChange({ ...settings, theme: e.target.value })}>
            <option value="neon-dark">Neon Dark</option>
            <option value="synthwave">Synthwave</option>
          </select>
        </label>
        <label className="text-sm">Metronome Volume
          <input className="mt-1 w-full" type="range" min="0" max="100" value={settings.metronomeVolume} onChange={(e) => onChange({ ...settings, metronomeVolume: Number(e.target.value) })} />
        </label>
        <label className="text-sm">Keyboard Range
          <input className="mt-1 w-full rounded bg-slate-950 p-2" value={settings.keyboardRange} onChange={(e) => onChange({ ...settings, keyboardRange: e.target.value })} />
        </label>
        <label className="text-sm">Practice Difficulty
          <select className="mt-1 w-full rounded bg-slate-950 p-2" value={settings.practiceDifficulty} onChange={(e) => onChange({ ...settings, practiceDifficulty: e.target.value })}>
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </label>
      </div>
      <button onClick={onReset} className="rounded bg-rose-700 px-4 py-2">Reset Local Data</button>
    </div>
  )
}
