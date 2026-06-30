import { useCallback, useRef, useState } from 'react'
import { convertAudioToMidi } from '../services/audioConvertApi'
import type { ConvertOptions, JobStatus } from '../types/audioConvert'
import { DEFAULT_CONVERT_OPTIONS } from '../types/audioConvert'

export type AudioConvertPhase = 'idle' | 'working' | 'done' | 'error'

export function useAudioConvert(apiBaseUrl: string, authToken?: string) {
  const [phase, setPhase] = useState<AudioConvertPhase>('idle')
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultFile, setResultFile] = useState<File | null>(null)
  const activeRef = useRef(false)

  const reset = useCallback(() => {
    activeRef.current = false
    setPhase('idle')
    setStatus(null)
    setError(null)
    setResultFile(null)
  }, [])

  const convert = useCallback(async (file: File, options: ConvertOptions = DEFAULT_CONVERT_OPTIONS) => {
    activeRef.current = true
    setPhase('working')
    setError(null)
    setStatus(null)
    setResultFile(null)

    try {
      const midiFile = await convertAudioToMidi(
        apiBaseUrl,
        file,
        options,
        (next) => {
          if (activeRef.current) setStatus(next)
        },
        authToken,
      )
      if (!activeRef.current) return null
      setResultFile(midiFile)
      setPhase('done')
      return midiFile
    } catch (err) {
      if (!activeRef.current) return null
      const message = err instanceof Error ? err.message : 'Conversion failed'
      setError(message)
      setPhase('error')
      return null
    }
  }, [apiBaseUrl, authToken])

  const downloadResult = useCallback(() => {
    if (!resultFile) return
    const url = URL.createObjectURL(resultFile)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = resultFile.name
    anchor.click()
    URL.revokeObjectURL(url)
  }, [resultFile])

  return { phase, status, error, resultFile, convert, reset, downloadResult }
}
