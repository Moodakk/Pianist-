import type { MidiDevice } from '../types/midi'

interface Props {
  devices: MidiDevice[]
  selectedDeviceId: string | null
  connect: () => void
  onSelect: (id: string) => void
  error: string | null
}

export function MidiDeviceSelector({ devices, selectedDeviceId, connect, onSelect, error }: Props) {
  return (
    <div className="rounded-xl border border-violet-700/40 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-300">MIDI Input</h3>
        <button className="rounded bg-violet-600 px-3 py-1 text-sm hover:bg-violet-500" onClick={connect}>
          Connect MIDI Keyboard
        </button>
      </div>
      {error && <p className="mb-2 text-sm text-rose-300">{error}</p>}
      <select
        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
        value={selectedDeviceId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        {devices.length === 0 ? <option value="">No MIDI device detected</option> : null}
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-400">Keyboard fallback: A W S E D F T G Y H U J K</p>
    </div>
  )
}
