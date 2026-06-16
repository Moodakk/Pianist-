# Anime Piano Trainer

Anime Piano Trainer is an MVP browser app for learning piano using a connected MIDI keyboard, focused on anime opening/ending practice workflows.

## Important legal note
This project **does not bundle copyrighted songs, audio, lyrics, album art, or MIDI files**. It provides anime song placeholders and lets users import their own legally obtained `.mid/.midi` files.

## Tech stack
- React + TypeScript + Vite
- Tailwind CSS
- Web MIDI API
- `@tonejs/midi` for MIDI parsing
- Tone.js for metronome timing
- localStorage for local song/progress data

## Run locally
```bash
npm install
npm run dev
```

Open the URL shown by Vite in a Chromium-based browser for Web MIDI support.

## Available scripts
- `npm run dev`
- `npm run build`
- `npm run lint`

## MVP pages
- Home / Dashboard
- Song Library
- Import MIDI
- Practice Player
- Progress
- Settings

## Core MVP capabilities
- Connect/select MIDI device with keyboard fallback input
- Upload and parse `.mid/.midi` files
- Assign tracks to right/left/both/ignore
- Save imported songs locally
- Anime-focused category placeholders (Tokyo Ghoul + other anime)
- Synthesia-style piano roll + hit line
- Practice/watch/rhythm mode controls
- Speed controls (25/50/75/100)
- Metronome toggle + count-in
- Basic scoring and recommendation output
- Favorites and recent progress storage
