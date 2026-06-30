import type { MidiDevice } from '../types/midi'
import { Icon } from './Icon'

interface Props {
  devices: MidiDevice[]
  selectedDeviceId: string | null
  connect: () => void
  onSelect: (id: string) => void
  error: string | null
}

export function MidiDeviceSelector({ devices, selectedDeviceId, connect, onSelect, error }: Props) {
  const hasDevices = devices.length > 0
  return (
    <div className="panel flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-full ${hasDevices ? 'bg-emerald-500/15 text-emerald-300 pulse' : 'bg-white/5 text-[color:var(--text-2)]'}`}>
          <Icon name="midi" size={16} />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-2)]">MIDI Input</p>
          <p className="text-sm text-[color:var(--text-0)]">
            {hasDevices ? `${devices.length} device${devices.length > 1 ? 's' : ''} ready` : 'No device detected'}
          </p>
        </div>
      </div>

      {hasDevices ? (
        <select
          className="input !w-auto !py-2"
          value={selectedDeviceId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      ) : null}

      <button className="btn btn-ghost" onClick={connect}>
        <Icon name="midi" size={14} />
        {hasDevices ? 'Reconnect' : 'Connect MIDI'}
      </button>

      <span className="ml-auto text-xs text-[color:var(--text-2)]">
        Fallback keys: <span className="text-[color:var(--text-1)]">A W S E D F T G Y H U J K</span>
      </span>

      {error ? <p className="w-full text-xs text-rose-300">{error}</p> : null}
    </div>
  )
}
