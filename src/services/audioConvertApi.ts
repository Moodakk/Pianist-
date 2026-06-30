import { getApiBaseUrl } from '../config/api'
import type {
  ConvertOptions,
  ConvertResponse,
  JobStatus,
  MidiJobApiResponse,
  UploadResponse,
} from '../types/audioConvert'

function authHeaders(authToken?: string): HeadersInit {
  const token = authToken?.trim()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { detail?: string | { msg?: string }[] }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) {
      return body.detail.map((item) => item.msg ?? JSON.stringify(item)).join('; ')
    }
  } catch {
    // ignore JSON parse errors
  }
  return response.statusText || `Request failed (${response.status})`
}

async function apiFetch(
  apiBaseUrl: string,
  path: string,
  init?: RequestInit,
  authToken?: string,
): Promise<Response> {
  const base = getApiBaseUrl(apiBaseUrl)
  const headers = new Headers(init?.headers)
  for (const [key, value] of Object.entries(authHeaders(authToken))) {
    headers.set(key, value)
  }
  const response = await fetch(`${base}${path}`, { ...init, headers })
  if (!response.ok) throw new Error(await parseError(response))
  return response
}

function normalizeJobStatus(raw: JobStatus | MidiJobApiResponse): JobStatus {
  if ('job_id' in raw) return raw
  return {
    job_id: String(raw.id),
    state: raw.state,
    progress: raw.progress,
    step: raw.step,
    error: raw.error,
    file_id: raw.file_id,
    output_filename: raw.output_filename,
    created_at: new Date(raw.created_at).getTime() / 1000,
    updated_at: new Date(raw.updated_at).getTime() / 1000,
  }
}

export async function checkApiHealth(apiBaseUrl: string): Promise<boolean> {
  try {
    const response = await apiFetch(apiBaseUrl, '/api/health')
    const body = await response.json() as { status?: string }
    return body.status === 'ok'
  } catch {
    return false
  }
}

export async function uploadAudio(
  apiBaseUrl: string,
  file: File,
  authToken?: string,
): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const response = await apiFetch(apiBaseUrl, '/api/upload', { method: 'POST', body: form }, authToken)
  return response.json() as Promise<UploadResponse>
}

export async function startConvert(
  apiBaseUrl: string,
  fileId: string,
  options: ConvertOptions,
): Promise<ConvertResponse> {
  const response = await apiFetch(apiBaseUrl, '/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, ...options }),
  })
  return response.json() as Promise<ConvertResponse>
}

export async function startMidiJob(
  apiBaseUrl: string,
  fileId: string,
  options: ConvertOptions,
  authToken: string,
): Promise<ConvertResponse> {
  const response = await apiFetch(
    apiBaseUrl,
    '/api/midi/jobs',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, ...options }),
    },
    authToken,
  )
  const body = await response.json() as { id: string }
  return { job_id: body.id }
}

export async function getJobStatus(apiBaseUrl: string, jobId: string): Promise<JobStatus> {
  const response = await apiFetch(apiBaseUrl, `/api/status/${jobId}`)
  return response.json() as Promise<JobStatus>
}

export async function getMidiJobStatus(
  apiBaseUrl: string,
  jobId: string,
  authToken: string,
): Promise<JobStatus> {
  const response = await apiFetch(apiBaseUrl, `/api/midi/jobs/${jobId}`, undefined, authToken)
  const body = await response.json() as MidiJobApiResponse
  return normalizeJobStatus(body)
}

export async function downloadMidi(apiBaseUrl: string, jobId: string): Promise<Blob> {
  const response = await apiFetch(apiBaseUrl, `/api/download/${jobId}`)
  return response.blob()
}

export async function downloadMidiArtifact(
  apiBaseUrl: string,
  jobId: string,
  authToken: string,
): Promise<Blob> {
  const response = await apiFetch(
    apiBaseUrl,
    `/api/midi/jobs/${jobId}/artifacts/midi`,
    undefined,
    authToken,
  )
  return response.blob()
}

const POLL_MS = 1500

export async function convertAudioToMidi(
  apiBaseUrl: string,
  file: File,
  options: ConvertOptions,
  onStatus?: (status: JobStatus) => void,
  authToken?: string,
): Promise<File> {
  const upload = await uploadAudio(apiBaseUrl, file, authToken)
  const useAuth = Boolean(authToken?.trim())
  const { job_id: jobId } = useAuth
    ? await startMidiJob(apiBaseUrl, upload.file_id, options, authToken!.trim())
    : await startConvert(apiBaseUrl, upload.file_id, options)

  while (true) {
    const status = useAuth
      ? await getMidiJobStatus(apiBaseUrl, jobId, authToken!.trim())
      : await getJobStatus(apiBaseUrl, jobId)
    onStatus?.(status)

    if (status.state === 'done') {
      const blob = useAuth
        ? await downloadMidiArtifact(apiBaseUrl, jobId, authToken!.trim())
        : await downloadMidi(apiBaseUrl, jobId)
      const filename = status.output_filename ?? `${file.name.replace(/\.[^.]+$/, '')}.mid`
      return new File([blob], filename, { type: 'audio/midi' })
    }

    if (status.state === 'error') {
      throw new Error(status.error || 'Conversion failed')
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
}
