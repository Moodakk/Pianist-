import { useEffect, useRef, useState } from 'react'
import type { Song } from '../types/song'
import { backingAudioStore } from '../utils/backingAudioStore'

interface Options {
  currentTime: number
  running: boolean
  speed: number
  countdown: number | null
}

export function useBackingTrack(song: Song | null, { currentTime, running, speed, countdown }: Options) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const [hasBacking, setHasBacking] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [volume, setVolume] = useState(0.75)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    const load = async () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
      audio.pause()
      audio.removeAttribute('src')
      setHasBacking(false)
      setLoadError(null)

      if (!song?.backingAudio) return
      try {
        const blob = await backingAudioStore.get(song.id)
        if (cancelled || !blob) return
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        audio.src = url
        setHasBacking(true)
      } catch {
        if (!cancelled) setLoadError('Could not load backing track.')
      }
    }

    void load()
    return () => {
      cancelled = true
      audio.pause()
      audio.removeAttribute('src')
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
      audioRef.current = null
    }
  }, [song?.id, song?.backingAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = Math.min(1, Math.max(0, volume))
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !hasBacking || !enabled) return
    audio.playbackRate = Math.max(0.25, speed)

    if (running && countdown === null) {
      void audio.play().catch(() => {
        setLoadError('Click Play to start minus (browser blocked autoplay).')
      })
    } else {
      audio.pause()
    }
  }, [running, speed, countdown, enabled, hasBacking])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !hasBacking || !enabled || !running || countdown !== null) return
    const drift = Math.abs(audio.currentTime - currentTime)
    if (drift > 0.35) {
      audio.currentTime = currentTime
    }
  }, [currentTime, running, countdown, enabled, hasBacking])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !hasBacking) return
    if (currentTime === 0 && !running) {
      audio.currentTime = 0
    }
  }, [currentTime, running, hasBacking])

  return {
    hasBacking,
    enabled,
    setEnabled,
    volume,
    setVolume,
    loadError,
    backingLabel: song?.backingAudio?.filename,
  }
}
