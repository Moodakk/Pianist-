import type { ScoreResult } from '../types/scoring'

export function ScoreSummary({ result }: { result: ScoreResult }) {
  return (
    <div className="rounded-xl border border-cyan-700/40 bg-slate-900/70 p-4">
      <h3 className="mb-3 text-lg font-semibold text-cyan-300">Run Results</h3>
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <p>Accuracy: <strong>{result.noteAccuracyPct}%</strong></p>
        <p>Timing: <strong>{result.timingAccuracyMs} ms</strong></p>
        <p>Final: <strong>{result.finalScorePct}% ({result.grade})</strong></p>
        <p>Mistakes: <strong>{result.missedNotes + result.wrongNotes}</strong></p>
      </div>
      <p className="mt-2 text-sm text-slate-300">{result.recommendation}</p>
    </div>
  )
}
