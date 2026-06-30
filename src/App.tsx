import { useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AudioToMidi } from './pages/AudioToMidi'
import { Dashboard } from './pages/Dashboard'
import { ImportMidi } from './pages/ImportMidi'
import { Library } from './pages/Library'
import { Practice } from './pages/Practice'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { useLocalLibrary } from './hooks/useLocalLibrary'
import type { Song } from './types/song'
import { Icon, type IconName } from './components/Icon'

const nav: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/library', label: 'Library', icon: 'library' },
  { to: '/import', label: 'Import', icon: 'upload' },
  { to: '/audio-to-midi', label: 'Audio→MIDI', icon: 'mic' },
  { to: '/practice', label: 'Practice', icon: 'piano' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export default function App() {
  const library = useLocalLibrary()
  const [practiceSong, setPracticeSong] = useState<Song | null>(library.importedSongs[0] ?? null)
  const location = useLocation()
  const isPractice = location.pathname.startsWith('/practice')

  return (
    <div className="app-shell">
      <aside className="nav-rail">
        <div className="logo" title="Easy Piano">
          <Icon name="piano" size={22} />
        </div>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={item.label}
          >
            <Icon name={item.icon} size={22} />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="title-bar">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="ml-3 text-xs text-[color:var(--text-2)]">Easy Piano — Desktop</span>
          <span className="ml-auto text-xs text-[color:var(--text-2)]">v0.1 · MVP</span>
        </div>

        {!isPractice && (
          <div className="top-bar">
            <h1 className="text-lg font-semibold">
              {nav.find((n) => (n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)))?.label ?? 'Home'}
            </h1>
            <div className="search-box ml-6">
              <Icon name="search" size={16} />
              <input placeholder="Search songs, anime, openings…" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="chip violet">
                <Icon name="sparkles" size={12} /> MVP
              </span>
              <span className="chip">
                {library.songs.length} songs
              </span>
            </div>
          </div>
        )}

        <main className={`min-w-0 flex-1 ${isPractice ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <Routes>
            <Route path="/" element={<Dashboard songs={library.songs} onPlay={(song) => { setPracticeSong(song) }} />} />
            <Route
              path="/library"
              element={<Library songs={library.songs} onFavorite={library.toggleFavorite} onSetPracticeSong={setPracticeSong} />}
            />
            <Route
              path="/import"
              element={<ImportMidi onSave={(song) => { library.upsertImportedSong(song); setPracticeSong(song) }} />}
            />
            <Route
              path="/audio-to-midi"
              element={<AudioToMidi onSave={(song) => { library.upsertImportedSong(song); setPracticeSong(song) }} />}
            />
            <Route
              path="/practice"
              element={<Practice song={practiceSong} onSessionComplete={library.addSession} />}
            />
            <Route path="/progress" element={<Progress songs={library.songs} sessions={library.sessions} />} />
            <Route path="/settings" element={<Settings settings={library.settings} onChange={library.setSettings} onReset={library.resetAllData} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
