import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { ImportMidi } from './pages/ImportMidi'
import { Library } from './pages/Library'
import { Practice } from './pages/Practice'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { useLocalLibrary } from './hooks/useLocalLibrary'
import type { Song } from './types/song'

const nav = [
  { to: '/', label: 'Home / Dashboard' },
  { to: '/library', label: 'Song Library' },
  { to: '/import', label: 'Import MIDI' },
  { to: '/practice', label: 'Practice Player' },
  { to: '/progress', label: 'Progress' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  const library = useLocalLibrary()
  const [practiceSong, setPracticeSong] = useState<Song | null>(library.importedSongs[0] ?? null)

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 p-4 lg:flex-row">
        <aside className="w-full rounded-2xl border border-violet-800/40 bg-slate-900/60 p-4 lg:w-64 lg:self-start lg:sticky lg:top-4">
          <h2 className="mb-4 text-lg font-bold text-violet-300">Anime Piano Trainer</h2>
          <nav className="space-y-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `block rounded px-3 py-2 text-sm ${isActive ? 'bg-violet-700/50 text-violet-100' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <Routes>
            <Route path="/" element={<Dashboard songs={library.songs} />} />
            <Route path="/library" element={<Library songs={library.songs} onFavorite={library.toggleFavorite} onSetPracticeSong={setPracticeSong} />} />
            <Route path="/import" element={<ImportMidi onSave={(song) => {
              library.upsertImportedSong(song)
              setPracticeSong(song)
            }} />} />
            <Route path="/practice" element={<Practice song={practiceSong} onSessionComplete={library.addSession} />} />
            <Route path="/progress" element={<Progress songs={library.songs} sessions={library.sessions} />} />
            <Route path="/settings" element={<Settings settings={library.settings} onChange={library.setSettings} onReset={library.resetAllData} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
