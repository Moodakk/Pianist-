import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backend = process.env.VITE_AUDIO2MIDI_BACKEND || 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Audio-to-MIDI backend (FastAPI in /backend) — see AUDIO2MIDI.md
      '/api': {
        target: backend,
        changeOrigin: true,
      },
    },
  },
})
