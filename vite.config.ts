import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

const backend = process.env.VITE_AUDIO2MIDI_BACKEND || 'http://localhost:8000'
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['electron'] },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['electron'] },
          },
        },
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Audio-to-MIDI backend (FastAPI in /backend) — see AUDIO2MIDI.md
      '/api': {
        target: backend,
        changeOrigin: true,
      },
    },
  },
}))
