import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

const backend = process.env.VITE_AUDIO2MIDI_BACKEND || 'http://localhost:8000'

const nodeExternals = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]

const electronBuildOptions = {
  outDir: 'dist-electron',
  rollupOptions: { external: ['electron', 'electron-updater', ...nodeExternals] },
  rolldownOptions: { external: ['electron', 'electron-updater', ...nodeExternals] },
}

const preloadBuildOptions = {
  outDir: 'dist-electron',
  rollupOptions: { external: ['electron', ...nodeExternals] },
  rolldownOptions: { external: ['electron', ...nodeExternals] },
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: electronBuildOptions,
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: preloadBuildOptions,
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
