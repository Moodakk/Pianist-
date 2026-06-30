// Thin client for the Audio-to-MIDI backend (FastAPI in /backend).
// Dev: Vite proxies /api/* to http://localhost:8000 (see vite.config.ts).
// Override the base by setting VITE_AUDIO2MIDI_API.

export type A2MMode = 'full' | 'melody' | 'bass' | 'stem' | 'piano'
export type A2MStem = 'vocals' | 'bass' | 'other' | 'drums' | 'original'
export type A2MQuantize = 'none' | '1/16' | '1/8' | '1/4'

export interface A2MConvertRequest {
  file_id: string
  mode: A2MMode
  use_demucs: boolean
  selected_stem: A2MStem
  quantize: A2MQuantize
  min_note_duration_ms: number
  min_velocity: number
  transpose: number
  estimate_tempo: boolean
  merge_close_notes: boolean
}

export interface A2MJobStatus {
  job_id: string
  state: 'queued' | 'running' | 'done' | 'error'
  progress: number
  step: string
  error: string | null
  file_id: string | null
  output_filename: string | null
  created_at: number
  updated_at: number
}

const BASE = (import.meta.env.VITE_AUDIO2MIDI_API as string | undefined)?.replace(/\/$/, '') || ''

const url = (p: string) => `${BASE}${p}`

async function unwrap<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let detail = `${r.status} ${r.statusText}`
    try {
      const body = await r.json()
      if (body?.detail) detail = String(body.detail)
    } catch {
      // ignore
    }
    throw new Error(detail)
  }
  return (await r.json()) as T
}

export async function a2mUpload(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(url('/api/upload'), { method: 'POST', body: fd })
  return unwrap<{ file_id: string; filename: string; size_bytes: number }>(r)
}

export async function a2mConvert(req: A2MConvertRequest) {
  const r = await fetch(url('/api/convert'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  return unwrap<{ job_id: string }>(r)
}

export async function a2mStatus(jobId: string) {
  const r = await fetch(url(`/api/status/${jobId}`))
  return unwrap<A2MJobStatus>(r)
}

export async function a2mDownloadFile(jobId: string, filename: string): Promise<File> {
  const r = await fetch(url(`/api/download/${jobId}`))
  if (!r.ok) {
    throw new Error(`Could not download MIDI (${r.status})`)
  }
  const blob = await r.blob()
  return new File([blob], filename, { type: 'audio/midi' })
}

export async function a2mHealth(): Promise<boolean> {
  try {
    const r = await fetch(url('/api/health'))
    return r.ok
  } catch {
    return false
  }
}
