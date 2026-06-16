export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const gradeFromScore = (score: number) => {
  if (score >= 95) return 'S'
  if (score >= 88) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}
