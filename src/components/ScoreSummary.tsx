import type { ScoreResult } from '../types/scoring'

const gradeColor: Record<string, string> = {
  S: 'from-amber-300 to-rose-400',
  A: 'from-emerald-300 to-cyan-400',
  B: 'from-cyan-300 to-violet-400',
  C: 'from-violet-300 to-fuchsia-400',
  D: 'from-slate-400 to-slate-600',
}

export function ScoreSummary({ result }: { result: ScoreResult }) {
  const grade = result.grade ?? 'D'
  return (
    <div className="panel grid gap-4 p-5 md:grid-cols-[160px_1fr]">
      <div className={`grid place-items-center rounded-2xl bg-gradient-to-br ${gradeColor[grade] ?? gradeColor.D} text-white`}>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest opacity-80">Grade</p>
          <p className="text-6xl font-black leading-none">{grade}</p>
          <p className="mt-1 text-sm font-semibold opacity-90">{result.finalScorePct}%</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Accuracy" value={`${result.noteAccuracyPct}%`} />
        <Stat label="Timing" value={`${result.timingAccuracyMs} ms`} />
        <Stat label="Missed Notes" value={result.missedNotes} />
        <Stat label="Wrong Notes" value={result.wrongNotes} />
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wider text-[color:var(--text-2)]">Recommendation</p>
          <p className="mt-1 text-sm text-[color:var(--text-0)]">{result.recommendation}</p>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-2)]">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}
