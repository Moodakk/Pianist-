import { Link } from 'react-router-dom'
import { AudioConvertPanel } from '../components/AudioConvertPanel'
import { Icon } from '../components/Icon'

interface Props {
  apiBaseUrl: string
  authToken?: string
}

export function AudioToMidi({ apiBaseUrl, authToken }: Props) {
  return (
    <div className="space-y-6 p-8">
      <div className="panel flex flex-wrap items-start gap-4 p-6">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
          <Icon name="mic" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Audio to MIDI</h2>
          <p className="mt-1 text-sm text-[color:var(--text-2)]">
            Upload an audio file and convert it to MIDI on the server. Download the result or import it into your library.
          </p>
        </div>
        <Link to="/import" className="btn btn-ghost shrink-0">
          <Icon name="midi" size={14} /> Import MIDI instead
        </Link>
      </div>

      <AudioConvertPanel apiBaseUrl={apiBaseUrl} authToken={authToken} />
    </div>
  )
}
