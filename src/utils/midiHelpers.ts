const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const midiToName = (midi: number) => {
  const octave = Math.floor(midi / 12) - 1
  return `${names[midi % 12]}${octave}`
}

export const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12)

export const keyboardMap: Record<string, number> = {
  KeyA: 60,
  KeyW: 61,
  KeyS: 62,
  KeyE: 63,
  KeyD: 64,
  KeyF: 65,
  KeyT: 66,
  KeyG: 67,
  KeyY: 68,
  KeyH: 69,
  KeyU: 70,
  KeyJ: 71,
  KeyK: 72,
}
