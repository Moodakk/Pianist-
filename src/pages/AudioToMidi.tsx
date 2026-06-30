import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMidiParser } from '../hooks/useMidiParser'
import { Icon } from '../components/Icon'
import type { ParsedMidiSong, TrackAssignment } from '../types/midi'
import type { Song } from '../types/song'
import {
  a2mConvert,
  a2mDownloadFile,
  a2mHealth,
  a2mStatus,
  a2mUpload,
  type A2MJobStatus,
  type A2MMode,
  type A2MQuantize,
  type A2MStem,
} from '../utils/audio2midi'

interface Props {
  onSave: (song: Song) => void
}

const AUDIO_EXTENSIONS = /\.(mp3|wav|flac|m4a)$/i
const assignments: TrackAssignment[] = ['right', 'left', 'both', 'ignore']

export function AudioToMidi({ onSave }: Props) {
  const navigate = useNavigate()
  const { parseFile } = useMidiParser()
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // backend health
  const [backendUp, setBackendUp] = useState<boolean | null>(null)

  // job state
  const [audioName, setAudioName] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<A2MJobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // post-conversion parsed midi
  const [parsed, setParsed] = useState<ParsedMidiSong | null>(null)
  const [trackAssignments, setTrackAssignments] = useState<Record<number, TrackAssignment>>({})

  // metadata form (reusing the same shape as ImportMidi)
  const [anime, setAnime] = useState('Audio transcription')
  const [opening, setOpening] = useState('')
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate')
  const [key, setKey] = useState('')

  // conversion settings
  const [mode, setMode] = useState<A2MMode>('full')
  const [useDemucs, setUseDemucs] = useState(false)
  const [stem, setStem] = useState<A2MStem>('original')
  const [quantize, setQuantize] = useState<A2MQuantize>('none')
  const [minNoteMs, setMinNoteMs] = useState(80)
  const [minVelocity, setMinVelocity] = useState(20)
  const [transpose, setTranspose] = useState(0)
  const [estimateTempo, setEstimateTempo] = useState(true)
  const [mergeClose, setMergeClose] = useState(false)

  const noteCount = useMemo(
    () => parsed?.tracks.reduce((sum, t) => sum + t.notes.length, 0) ?? 0,
    [parsed],
  )

  useEffect(() => {
    void a2mHealth().then(setBackendUp)
  }, [])

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])

  const resetJob = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setJobId(null)
    setStatus(null)
    setParsed(null)
    setError(null)
    setAudioName(null)
  }

  const handleAudio = async (file: File) => {
    if (!AUDIO_EXTENSIONS.test(file.name)) {
      setError('Please upload an .mp3, .wav, .flac, or .m4a file.')
      return
    }
    resetJob()
    setAudioName(file.name)
    try {
      const { file_id } = await a2mUpload(file)
      const { job_id } = await a2mConvert({
        file_id,
        mode,
        use_demucs: useDemucs || mode === 'stem',
        selected_stem: stem,
        quantize,
        min_note_duration_ms: minNoteMs,
        min_velocity: minVelocity,
        transpose,
        estimate_tempo: estimateTempo,
        merge_close_notes: mergeClose,
      })
      setJobId(job_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setAudioName(null)
    }
  }

  // poll job status
  useEffect(() => {
    if (!jobId) return
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const s = await a2mStatus(jobId)
        setStatus(s)
        if (s.state === 'done') {
          if (pollRef.current) clearInterval(pollRef.current)
          const filename = s.output_filename || `${audioName?.replace(/\.[^.]+$/, '') ?? 'audio'}.mid`
          const midiFile = await a2mDownloadFile(jobId, filename)
          const result = await parseFile(midiFile)
          setParsed(result)
          setTrackAssignments(
            Object.fromEntries(
              result.tracks.map((track, idx) => [
                track.index,
                idx % 2 === 0 ? ('right' as TrackAssignment) : ('left' as TrackAssignment),
              ]),
            ),
          )
        } else if (s.state === 'error') {
          if (pollRef.current) clearInterval(pollRef.current)
          setError(s.error || 'Conversion failed.')
        }
      } catch (e) {
        console.warn('status poll failed', e)
      }
    }, 1500)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [jobId, audioName, parseFile])

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) await handleAudio(file)
  }

  const saveSong = () => {
    if (!parsed) return
    const song: Song = {
      id: `a2m-${Date.now()}`,
      title: parsed.title,
      category: 'Audio → MIDI',
      importedAt: Date.now(),
      midi: parsed,
      trackAssignments,
      tags: {
        anime,
        opening: opening || undefined,
        difficulty,
        bpm: parsed.bpm,
        key: key || undefined,
        sourceNote: `Auto-transcribed from ${audioName ?? 'audio'} via Basic Pitch.`,
      },
    }
    onSave(song)
    navigate('/practice')
  }

  const busy = !!audioName && (!status || status.state === 'queued' || status.state === 'running') && !parsed
  const progress = status ? Math.round(status.progress * 100) : audioName ? 5 : 0

  return (
    <div className="space-y-6 p-8">
      {backendUp === false && (
        <div className="panel border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          Audio-to-MIDI backend is not reachable. Start it with{' '}
          <code className="rounded bg-black/30 px-1.5 py-0.5">
            cd backend &amp;&amp; uvicorn app.main:app --port 8000
          </code>{' '}
          (or <code className="rounded bg-black/30 px-1.5 py-0.5">docker compose up backend</code>).
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
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
              Or click below to browse for .mp3 / .wav / .flac / .m4a — we'll transcribe
              it to a rough MIDI sketch you can practice in this app.
            </p>
            <button
              className="btn btn-primary mt-5"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Icon name="upload" size={14} /> Select audio
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".mp3,.wav,.flac,.m4a"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleAudio(file)
              }}
            />
            {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          </div>

          {audioName && (
            <div className="panel p-5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{audioName}</p>
                  <p className="text-xs text-[color:var(--text-2)]">
                    {status?.step || 'Uploading…'}
                  </p>
                </div>
                <span
                  className={
                    'chip ' +
                    (status?.state === 'done'
                      ? 'violet'
                      : status?.state === 'error'
                        ? ''
                        : '')
                  }
                >
                  {status?.state ?? 'queued'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {parsed && (
            <div className="panel space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Title" value={parsed.title} />
                <Stat label="BPM" value={Math.round(parsed.bpm)} />
                <Stat label="Notes" value={noteCount} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <LabeledInput label="Anime / source" value={anime} onChange={setAnime} />
                <LabeledInput label="Opening / ED" value={opening} onChange={setOpening} />
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-[color:var(--text-2)]">Difficulty</p>
                  <select
                    className="input"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <LabeledInput label="Key (optional)" value={key} onChange={setKey} />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--text-2)]">
                  Track assignment
                </h3>
                <div className="space-y-2">
                  {parsed.tracks.map((track) => (
                    <div
                      key={track.index}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {track.name || `Track ${track.index + 1}`}
                        </p>
                        <p className="text-xs text-[color:var(--text-2)]">{track.instrument}</p>
                      </div>
                      <span className="chip">{track.notes.length} notes</span>
                      <span className="chip violet">Track {track.index + 1}</span>
                      <select
                        className="input !w-32"
                        value={trackAssignments[track.index] ?? 'ignore'}
                        onChange={(e) =>
                          setTrackAssignments((prev) => ({
                            ...prev,
                            [track.index]: e.target.value as TrackAssignment,
                          }))
                        }
                      >
                        {assignments.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost" onClick={resetJob}>
                  Discard
                </button>
                <button className="btn btn-primary" onClick={saveSong}>
                  <Icon name="check" size={14} /> Save &amp; Practice
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-[color:var(--text-2)]">
            Audio-to-MIDI transcription is approximate. Complex full songs may need manual
            cleanup. Tip: for full mixes, enable Demucs and convert just one stem (bass or
            vocals) for cleaner results.
          </p>
        </div>

        <aside className="panel space-y-4 p-5 lg:sticky lg:top-4 lg:self-start">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--text-2)]">
            Conversion settings
          </h3>

          <Field label="Mode">
            <select
              className="input"
              value={mode}
              disabled={busy}
              onChange={(e) => setMode(e.target.value as A2MMode)}
            >
              <option value="full">Full rough MIDI</option>
              <option value="melody">Melody only</option>
              <option value="bass">Bass only</option>
              <option value="piano">Piano / instrumental</option>
              <option value="stem">Separate stems first</option>
            </select>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useDemucs || mode === 'stem'}
              disabled={busy || mode === 'stem'}
              onChange={(e) => setUseDemucs(e.target.checked)}
            />
            Run Demucs stem separation
          </label>

          <Field label="Selected stem">
            <select
              className="input"
              value={stem}
              disabled={busy || (!useDemucs && mode !== 'stem')}
              onChange={(e) => setStem(e.target.value as A2MStem)}
            >
              <option value="original">Original</option>
              <option value="vocals">Vocals</option>
              <option value="bass">Bass</option>
              <option value="drums">Drums</option>
              <option value="other">Other (instruments)</option>
            </select>
          </Field>

          <Field label="Quantize">
            <select
              className="input"
              value={quantize}
              disabled={busy}
              onChange={(e) => setQuantize(e.target.value as A2MQuantize)}
            >
              <option value="none">None</option>
              <option value="1/16">1/16</option>
              <option value="1/8">1/8</option>
              <option value="1/4">1/4</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min note (ms)">
              <input
                type="number"
                className="input"
                min={0}
                max={2000}
                disabled={busy}
                value={minNoteMs}
                onChange={(e) => setMinNoteMs(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Min velocity">
              <input
                type="number"
                className="input"
                min={0}
                max={127}
                disabled={busy}
                value={minVelocity}
                onChange={(e) => setMinVelocity(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Transpose (st)">
              <input
                type="number"
                className="input"
                min={-24}
                max={24}
                disabled={busy}
                value={transpose}
                onChange={(e) => setTranspose(Number(e.target.value) || 0)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={estimateTempo}
              disabled={busy}
              onChange={(e) => setEstimateTempo(e.target.checked)}
            />
            Estimate tempo (librosa)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mergeClose}
              disabled={busy}
              onChange={(e) => setMergeClose(e.target.checked)}
            />
            Merge close repeated notes
          </label>
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-xs uppercase tracking-wider text-[color:var(--text-2)]">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wider text-[color:var(--text-2)]">{label}</p>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wider text-[color:var(--text-2)]">{label}</p>
      {children}
    </div>
  )
}
