import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useMidiParser } from '../hooks/useMidiParser'
import type { TrackAssignment } from '../types/midi'
import type { Song } from '../types/song'
import { AUDIO_EXTENSIONS } from '../types/audioConvert'
import { backingAudioStore } from '../utils/backingAudioStore'

interface Props {
  onSave: (song: Song) => void
}

const assignments: TrackAssignment[] = ['right', 'left', 'both', 'ignore']

export function ImportMidi({ onSave }: Props) {
  const { parseFile } = useMidiParser()
  const navigate = useNavigate()
  const location = useLocation()
  const fileRef = useRef<HTMLInputElement>(null)
  const backingRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<Awaited<ReturnType<typeof parseFile>> | null>(null)
  const [trackAssignments, setTrackAssignments] = useState<Record<number, TrackAssignment>>({})
  const [backingFile, setBackingFile] = useState<File | null>(null)
  const [anime, setAnime] = useState('Tokyo Ghoul')
  const [opening, setOpening] = useState('OP1')
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate')
  const [sourceNote, setSourceNote] = useState('User imported legal MIDI file.')
  const [key, setKey] = useState('')

  const noteCount = useMemo(() => parsed?.tracks.reduce((sum, t) => sum + t.notes.length, 0) ?? 0, [parsed])

  const handleFile = async (file: File) => {
    if (!/\.midi?$/i.test(file.name)) {
      setError('Please upload a .mid or .midi file.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await parseFile(file)
      setParsed(result)
      setTrackAssignments(
        Object.fromEntries(result.tracks.map((track, index) => [track.index, index % 2 === 0 ? 'right' : 'left' as TrackAssignment])),
      )
    } catch {
      setError('Could not parse this MIDI file.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const state = location.state as { midiFile?: File; backingFile?: File } | null
    if (state?.midiFile) void handleFile(state.midiFile)
    if (state?.backingFile) setBackingFile(state.backingFile)
  }, [location.state])

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) await handleFile(file)
  }

  const saveSong = async () => {
    if (!parsed) return
    const songId = `imported-${Date.now()}`
    const song: Song = {
      id: songId,
      title: parsed.title,
      category: 'User Imported Songs',
      importedAt: Date.now(),
      midi: parsed,
      trackAssignments,
      tags: {
        anime,
        opening,
        difficulty,
        bpm: parsed.bpm,
        key: key || undefined,
        sourceNote,
      },
    }
    if (backingFile) {
      await backingAudioStore.put(songId, backingFile)
      song.backingAudio = {
        filename: backingFile.name,
        mimeType: backingFile.type || 'audio/mpeg',
      }
    }
    onSave(song)
    navigate('/practice')
  }

  return (
    <div className="space-y-6 p-8">
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
        <p className="text-sm text-[color:var(--text-2)]">
          Have an audio file instead? Convert it to MIDI first.
        </p>
        <Link to="/audio-to-midi" className="btn btn-primary">
          <Icon name="mic" size={14} /> Audio to MIDI
        </Link>
      </div>

      <div
        className="panel grid place-items-center border-dashed p-12 text-center transition hover:border-violet-400/50"
        style={{ borderStyle: 'dashed' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
          <Icon name="upload" size={28} />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Drop a MIDI file</h2>
        <p className="mt-1 text-sm text-[color:var(--text-2)]">
          Or click below to browse for .mid / .midi files
        </p>
        <button className="btn btn-primary mt-5" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={14} /> Select file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".mid,.midi"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        {loading ? <p className="mt-4 text-sm text-violet-300">Parsing MIDI…</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </div>

      {parsed ? (
        <div className="panel space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Title" value={parsed.title} />
            <Stat label="BPM" value={Math.round(parsed.bpm)} />
            <Stat label="Notes" value={noteCount} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <LabeledInput label="Anime" value={anime} onChange={setAnime} />
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
            <div className="md:col-span-2">
              <LabeledInput label="Source note" value={sourceNote} onChange={setSourceNote} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--text-2)]">
              Track assignment
            </h3>
            <div className="space-y-2">
              {parsed.tracks.map((track) => (
                <div key={track.index} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{track.name || `Track ${track.index + 1}`}</p>
                    <p className="text-xs text-[color:var(--text-2)]">{track.instrument}</p>
                  </div>
                  <span className="chip">{track.notes.length} notes</span>
                  <span className="chip violet">Track {track.index + 1}</span>
                  <select
                    className="input !w-32"
                    value={trackAssignments[track.index] ?? 'ignore'}
                    onChange={(e) => setTrackAssignments((prev) => ({ ...prev, [track.index]: e.target.value as TrackAssignment }))}
                  >
                    {assignments.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[color:var(--text-2)]">
              Backing track (minus)
            </h3>
            <p className="mb-3 text-sm text-[color:var(--text-2)]">
              Optional MP3/WAV to play in the background during Practice (original instrumental).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => backingRef.current?.click()}>
                <Icon name="mic" size={14} /> {backingFile ? 'Change audio' : 'Attach minus'}
              </button>
              {backingFile ? (
                <span className="chip violet">{backingFile.name}</span>
              ) : (
                <span className="text-xs text-[color:var(--text-2)]">No file selected</span>
              )}
            </div>
            <input
              ref={backingRef}
              type="file"
              accept={AUDIO_EXTENSIONS.join(',')}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setBackingFile(file)
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setParsed(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => void saveSong()}>
              <Icon name="check" size={14} /> Save & Practice
            </button>
          </div>
        </div>
      ) : null}
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

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wider text-[color:var(--text-2)]">{label}</p>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}