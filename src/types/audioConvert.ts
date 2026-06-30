export type ConvertMode = 'full' | 'melody' | 'bass' | 'stem' | 'piano'
export type StemName = 'vocals' | 'bass' | 'other' | 'drums' | 'original'
export type Quantize = 'none' | '1/16' | '1/8' | '1/4'
export type JobState = 'queued' | 'running' | 'done' | 'error'

export interface UploadResponse {
  file_id: string
  filename: string
  size_bytes: number
}

export interface ConvertOptions {
  mode: ConvertMode
  use_demucs: boolean
  selected_stem: StemName
  quantize: Quantize
  min_note_duration_ms: number
  min_velocity: number
  transpose: number
  estimate_tempo: boolean
  merge_close_notes: boolean
}

export interface ConvertResponse {
  job_id: string
}

export interface JobStatus {
  job_id: string
  state: JobState
  progress: number
  step: string
  error?: string | null
  file_id?: string | null
  output_filename?: string | null
  created_at: number
  updated_at: number
}

export interface MidiJobApiResponse {
  id: string
  state: JobState
  progress: number
  step: string
  error?: string | null
  file_id: string
  output_filename?: string | null
  created_at: string
  updated_at: string
}

export const DEFAULT_CONVERT_OPTIONS: ConvertOptions = {
  mode: 'full',
  use_demucs: false,
  selected_stem: 'original',
  quantize: 'none',
  min_note_duration_ms: 80,
  min_velocity: 20,
  transpose: 0,
  estimate_tempo: true,
  merge_close_notes: false,
}

export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a'] as const
