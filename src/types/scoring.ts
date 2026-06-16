export interface NoteHit {
  midi: number
  expectedTime: number
  actualTime: number
  deltaMs: number
  correct: boolean
}

export interface ScoreResult {
  correctNotes: number
  missedNotes: number
  wrongNotes: number
  combo: number
  bestCombo: number
  timingAccuracyMs: number
  noteAccuracyPct: number
  finalScorePct: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  practiceTimeSec: number
  recommendation: string
}

export interface PracticeSession {
  id: string
  songId: string
  startedAt: number
  endedAt: number
  result: ScoreResult
}
