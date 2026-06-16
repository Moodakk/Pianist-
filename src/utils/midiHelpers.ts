const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const midiToName = (midi: number) => {
  const octave = Math.floor(midi / 12) - 1
  return `${names[midi % 12]}${octave}`
}

export const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12)

export const keyboardMap: Record<string, number> = {
  a: 60,
  w: 61,
  s: 62,
  e: 63,
  d: 64,
  f: 65,
  t: 66,
  g: 67,
  y: 68,
  h: 69,
  u: 70,
  j: 71,
  k: 72,
}
