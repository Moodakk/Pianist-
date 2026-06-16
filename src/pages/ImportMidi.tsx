import { useMemo, useState } from 'react'
import { useMidiParser } from '../hooks/useMidiParser'
import type { TrackAssignment } from '../types/midi'
import type { Song } from '../types/song'

interface Props {
  onSave: (song: Song) => void
}

const assignments: TrackAssignment[] = ['right', 'left', 'both', 'ignore']

export function ImportMidi({ onSave }: Props) {
  const { parseFile } = useMidiParser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<Awaited<ReturnType<typeof parseFile>> | null>(null)
  const [trackAssignments, setTrackAssignments] = useState<Record<number, TrackAssignment>>({})
  const [anime, setAnime] = useState('Tokyo Ghoul')
  const [opening, setOpening] = useState('OP1')
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate')
  const [sourceNote, setSourceNote] = useState('User imported legal MIDI file.')
  const [key, setKey] = useState('')

  const noteCount = useMemo(() => parsed?.tracks.reduce((sum, t) => sum + t.notes.length, 0) ?? 0, [parsed])

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
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

  const saveSong = () => {
    if (!parsed) return
    const song: Song = {
      id: `imported-${Date.now()}`,
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
    onSave(song)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-violet-200">Import MIDI</h1>
      <input type="file" accept=".mid,.midi" onChange={onUpload} className="block w-full rounded bg-slate-900 p-3" />
      {loading ? <p>Parsing MIDI...</p> : null}
      {error ? <p className="text-rose-300">{error}</p> : null}

      {parsed ? (
        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p>Title: <strong>{parsed.title}</strong></p>
            <p>BPM: <strong>{Math.round(parsed.bpm)}</strong></p>
            <p>Notes: <strong>{noteCount}</strong></p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <input value={anime} onChange={(e) => setAnime(e.target.value)} className="rounded bg-slate-950 p-2" placeholder="Anime" />
            <input value={opening} onChange={(e) => setOpening(e.target.value)} className="rounded bg-slate-950 p-2" placeholder="Opening/ED" />
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="rounded bg-slate-950 p-2">
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
            <input value={key} onChange={(e) => setKey(e.target.value)} className="rounded bg-slate-950 p-2" placeholder="Key (optional)" />
            <input value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} className="rounded bg-slate-950 p-2 md:col-span-2" placeholder="Source note" />
          </div>

          <h2 className="text-lg font-medium">Track Assignment</h2>
          <div className="space-y-2">
            {parsed.tracks.map((track) => (
              <div className="grid items-center gap-2 rounded bg-slate-950/80 p-2 md:grid-cols-4" key={track.index}>
                <p className="text-sm">{track.name}</p>
                <p className="text-xs text-slate-400">{track.instrument}</p>
                <p className="text-xs text-slate-400">{track.notes.length} notes</p>
                <select
                  className="rounded bg-slate-900 p-1"
                  value={trackAssignments[track.index] ?? 'ignore'}
                  onChange={(e) => setTrackAssignments((prev) => ({ ...prev, [track.index]: e.target.value as TrackAssignment }))}
                >
                  {assignments.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button className="rounded bg-emerald-600 px-4 py-2" onClick={saveSong}>Save to Local Library</button>
        </div>
      ) : null}
    </div>
  )
}
