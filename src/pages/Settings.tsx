import { Icon } from '../components/Icon'

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
  const update = <K extends keyof Props['settings']>(key: K, value: Props['settings'][K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="space-y-6 p-8">
      <SectionCard
        icon="speed"
        title="Playback"
        description="Tune the visual flow of falling notes and input latency."
      >
        <Field label={`Note speed · ${settings.noteSpeed.toFixed(2)}x`}>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={settings.noteSpeed}
            onChange={(e) => update('noteSpeed', Number(e.target.value))}
            className="w-full accent-violet-400"
          />
        </Field>
        <Field label={`MIDI latency · ${settings.latencyMs} ms`}>
          <input
            type="range"
            min="-200"
            max="200"
            step="5"
            value={settings.latencyMs}
            onChange={(e) => update('latencyMs', Number(e.target.value))}
            className="w-full accent-violet-400"
          />
        </Field>
      </SectionCard>

      <SectionCard icon="metronome" title="Sound" description="Metronome and audio cues.">
        <Field label={`Metronome volume · ${settings.metronomeVolume}%`}>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.metronomeVolume}
            onChange={(e) => update('metronomeVolume', Number(e.target.value))}
            className="w-full accent-violet-400"
          />
        </Field>
      </SectionCard>

      <SectionCard icon="sparkles" title="Appearance" description="Choose how the app looks.">
        <Field label="Visual theme">
          <select
            className="input"
            value={settings.theme}
            onChange={(e) => update('theme', e.target.value)}
          >
            <option value="neon-dark">Neon Dark</option>
            <option value="synthwave">Synthwave</option>
          </select>
        </Field>
        <Field label="Keyboard range">
          <input
            className="input"
            value={settings.keyboardRange}
            onChange={(e) => update('keyboardRange', e.target.value)}
          />
        </Field>
      </SectionCard>

      <SectionCard icon="hand" title="Difficulty" description="Default difficulty preset.">
        <Field label="Practice difficulty">
          <select
            className="input"
            value={settings.practiceDifficulty}
            onChange={(e) => update('practiceDifficulty', e.target.value)}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </Field>
      </SectionCard>

      <SectionCard icon="close" title="Danger zone" description="Local data only — your imported MIDI files and progress.">
        <button onClick={onReset} className="btn btn-danger">
          Reset local data
        </button>
      </SectionCard>
    </div>
  )
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="panel grid gap-5 p-6 md:grid-cols-[260px_1fr]">
      <div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
          <Icon name={icon} size={18} />
        </div>
        <h2 className="mt-3 text-base font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-[color:var(--text-2)]">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--text-2)]">{label}</span>
      {children}
    </label>
  )
}
