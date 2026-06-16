import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MidiDevice } from '../types/midi'
import { keyboardMap } from '../utils/midiHelpers'

interface MidiInputState {
  devices: MidiDevice[]
  selectedDeviceId: string | null
  activeNotes: number[]
  error: string | null
  connect: () => Promise<void>
  setSelectedDeviceId: (id: string) => void
}

export function useMidiInput(onNote: (midi: number, on: boolean, velocity?: number) => void): MidiInputState {
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const [devices, setDevices] = useState<MidiDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [activeSet, setActiveSet] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const refreshDevices = useCallback((midiAccess: MIDIAccess) => {
    const next = Array.from(midiAccess.inputs.values() as Iterable<MIDIInput>).map((input) => ({
      id: input.id,
      name: input.name ?? 'Unknown MIDI Device',
      manufacturer: input.manufacturer ?? undefined,
      connected: input.state === 'connected',
    }))
    setDevices(next)
    if (!selectedDeviceId && next.length) {
      setSelectedDeviceId(next[0].id)
    }
  }, [selectedDeviceId])

  const connect = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setError('Web MIDI API is not supported in this browser.')
      return
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess()
      setAccess(midiAccess)
      refreshDevices(midiAccess)
      midiAccess.onstatechange = () => refreshDevices(midiAccess)
      setError(null)
    } catch {
      setError('MIDI access was denied.')
    }
  }, [refreshDevices])

  useEffect(() => {
    if (!access) return

    const handle = (event: MIDIMessageEvent) => {
      if (!event.data) return
      const [status, note, velocity] = event.data
      const command = status & 0xf0
      const isOn = command === 0x90 && velocity > 0
      const isOff = command === 0x80 || (command === 0x90 && velocity === 0)
      if (!isOn && !isOff) return

      setActiveSet((prev) => {
        const next = new Set(prev)
        if (isOn) next.add(note)
        if (isOff) next.delete(note)
        return next
      })
      onNote(note, isOn, velocity / 127)
    }

    const selectedInput = selectedDeviceId ? access.inputs.get(selectedDeviceId) : null
    const inputs = selectedInput ? [selectedInput] : Array.from(access.inputs.values() as Iterable<MIDIInput>)

    inputs.forEach((input) => {
      input.onmidimessage = handle
    })

    return () => {
      inputs.forEach((input) => {
        input.onmidimessage = null
      })
    }
  }, [access, onNote, selectedDeviceId])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const midi = keyboardMap[event.key.toLowerCase()]
      if (!midi) return
      setActiveSet((prev) => {
        if (prev.has(midi)) return prev
        const next = new Set(prev)
        next.add(midi)
        return next
      })
      onNote(midi, true, 0.8)
    }

    const up = (event: KeyboardEvent) => {
      const midi = keyboardMap[event.key.toLowerCase()]
      if (!midi) return
      setActiveSet((prev) => {
        if (!prev.has(midi)) return prev
        const next = new Set(prev)
        next.delete(midi)
        return next
      })
      onNote(midi, false, 0)
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [onNote])

  return useMemo(
    () => ({
      devices,
      selectedDeviceId,
      activeNotes: Array.from(activeSet),
      error,
      connect,
      setSelectedDeviceId,
    }),
    [devices, selectedDeviceId, activeSet, error, connect],
  )
}
