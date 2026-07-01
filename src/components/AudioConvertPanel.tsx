import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiBaseUrl } from '../config/api'
import { useAudioConvert } from '../hooks/useAudioConvert'
import { checkApiHealth } from '../services/audioConvertApi'
import type { ConvertMode, Quantize, StemName } from '../types/audioConvert'
import { AUDIO_EXTENSIONS, DEFAULT_CONVERT_OPTIONS } from '../types/audioConvert'
import { Icon } from './Icon'

interface Props {
  apiBaseUrl: string
  authToken?: string
  /** When set, auto-handoff the converted MIDI file (e.g. Import flow). */
  onMidiFile?: (file: File) => void
  /** Show link to import page after conversion. Default true when onMidiFile is absent. */
  showImportLink?: boolean
}

const AUDIO_ACCEPT = AUDIO_EXTENSIONS.join(',')

export function AudioConvertPanel({
  apiBaseUrl,
  authToken,
  onMidiFile,
  showImportLink = !onMidiFile,
}: Props) {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mode, setMode] = useState<ConvertMode>(DEFAULT_CONVERT_OPTIONS.mode)
  const [useDemucs, setUseDemucs] = useState(DEFAULT_CONVERT_OPTIONS.use_demucs)
  const [selectedStem, setSelectedStem] = useState<StemName>(DEFAULT_CONVERT_OPTIONS.selected_stem)
  const [quantize, setQuantize] = useState<Quantize>(DEFAULT_CONVERT_OPTIONS.quantize)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [invalidExt, setInvalidExt] = useState<string | null>(null)

  const resolvedUrl = getApiBaseUrl(apiBaseUrl)
  const { phase, status, error, resultFile, convert, reset, downloadResult } = useAudioConvert(
    apiBaseUrl,
    authToken,
  )
  const busy = phase === 'working'

  useEffect(() => {
    let cancelled = false
    void checkApiHealth(apiBaseUrl).then((ok) => {
      if (!cancelled) setBackendOk(ok)
    })
    return () => { cancelled = true }
  }, [apiBaseUrl, resolvedUrl])

  const isAudioFile = (file: File) =>
    AUDIO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))

  const pickFile = (file: File) => {
    if (!isAudioFile(file)) {
      setInvalidExt(file.name)
      return
    }
    setInvalidExt(null)
    reset()
    setSelectedFile(file)
  }

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) pickFile(file)
  }

  const startConvert = async () => {
    if (!selectedFile || busy) return
    const midiFile = await convert(selectedFile, {
      ...DEFAULT_CONVERT_OPTIONS,
      mode,
      use_demucs: useDemucs,
      selected_stem: selectedStem,
      quantize,
    })
    if (midiFile && onMidiFile) onMidiFile(midiFile)
  }

  const progress = Math.round((status?.progress ?? 0) * 100)
  const stateLabel =
    status?.state === 'queued'
      ? 'Queued'
      : status?.state === 'running'
        ? 'Processing'
        : status?.state === 'done'
          ? 'Complete'
          : status?.state === 'error'
            ? 'Failed'
            : 'Starting'

  return (
    <div className="space-y-4">
      {backendOk === false ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Cannot reach the converter API at <span className="font-mono">{resolvedUrl}</span>.
          {' '}Set the backend URL in <Link to="/settings" className="underline">Settings</Link> or
          {' '}via <span className="font-mono">VITE_API_BASE_URL</span> at build time.
        </div>
      ) : null}

      <div
        className="panel grid place-items-center border-dashed p-12 text-center transition hover:border-violet-400/50"
        style={{ borderStyle: 'dashed' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
          <Icon name="mic" size={28} />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Drop an audio file</h2>
        <p className="mt-1 text-sm text-[color:var(--text-2)]">
          Supports .mp3, .wav, .flac, .m4a — converted server-side to MIDI
        </p>
        <button
          className="btn btn-primary mt-5"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="upload" size={14} /> Select audio
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={AUDIO_ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) pickFile(file)
          }}
        />
        {selectedFile ? (
          <p className="mt-4 text-sm text-violet-300">
            Selected: <span className="font-medium">{selectedFile.name}</span>
            {' '}<span className="chip">{Math.round(selectedFile.size / 1024)} KB</span>
          </p>
        ) : null}
      </div>

      <div className="panel space-y-4 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--text-2)]">
          Conversion options
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Mode">
            <select className="input" value={mode} disabled={busy} onChange={(e) => setMode(e.target.value as ConvertMode)}>
              <option value="full">Full mix</option>
              <option value="melody">Melody</option>
              <option value="bass">Bass</option>
              <option value="piano">Piano</option>
              <option value="stem">Stem (Demucs)</option>
            </select>
          </Field>
          <Field label="Quantize">
            <select className="input" value={quantize} disabled={busy} onChange={(e) => setQuantize(e.target.value as Quantize)}>
              <option value="none">None</option>
              <option value="1/16">1/16</option>
              <option value="1/8">1/8</option>
              <option value="1/4">1/4</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useDemucs || mode === 'stem'}
            disabled={busy || mode === 'stem'}
            onChange={(e) => setUseDemucs(e.target.checked)}
          />
          Separate stems with Demucs (slower, better for mixed audio)
        </label>

        {useDemucs || mode === 'stem' ? (
          <Field label="Stem to transcribe">
            <select
              className="input"
              value={selectedStem}
              disabled={busy}
              onChange={(e) => setSelectedStem(e.target.value as StemName)}
            >
              <option value="minus">Minus (instrumental, no vocals)</option>
              <option value="original">Auto (other)</option>
              <option value="vocals">Vocals</option>
              <option value="bass">Bass</option>
              <option value="other">Other</option>
              <option value="drums">Drums</option>
            </select>
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-primary"
            disabled={!selectedFile || busy}
            onClick={() => void startConvert()}
          >
            <Icon name="sparkles" size={14} /> Convert to MIDI
          </button>
          {selectedFile && !busy ? (
            <button className="btn btn-ghost" onClick={() => { reset(); setSelectedFile(null) }}>
              Clear
            </button>
          ) : null}
        </div>

        {busy ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="chip violet">{stateLabel}</span>
              {status?.state === 'queued' ? (
                <span className="text-xs text-[color:var(--text-2)]">Waiting for worker…</span>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-sm text-violet-300">
              {status?.step || 'Starting…'} {progress > 0 ? `(${progress}%)` : ''}
            </p>
          </div>
        ) : null}

        {invalidExt ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            Unsupported file type. Use {AUDIO_EXTENSIONS.join(', ')}.
          </div>
        ) : null}

        {phase === 'done' && resultFile ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
            <Icon name="check" size={16} className="text-emerald-300" />
            <span className="text-sm text-emerald-100">
              Ready: <span className="font-medium">{resultFile.name}</span>
            </span>
            <button type="button" className="btn btn-primary ml-auto" onClick={downloadResult}>
              <Icon name="upload" size={14} /> Download MIDI
            </button>
            {showImportLink && selectedFile ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  navigate('/import', { state: { midiFile: resultFile, backingFile: selectedFile } })
                }}
              >
                Import with minus <Icon name="chevron-right" size={14} />
              </button>
            ) : null}
            {showImportLink && !selectedFile ? (
              <Link to="/import" className="btn btn-ghost">
                Import to library <Icon name="chevron-right" size={14} />
              </Link>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </div>
    </div>
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
