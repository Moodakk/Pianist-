# Audio-to-MIDI module

A practical module bolted onto Anime Piano Trainer that takes an audio file
(`.mp3`, `.wav`, `.flac`, `.m4a`) and produces a rough MIDI sketch, then loads
it straight into the trainer's local library so you can practice it.

It uses [Spotify Basic Pitch](https://github.com/spotify/basic-pitch) for note
detection, [Demucs](https://github.com/facebookresearch/demucs) (optional) for
stem separation, [pretty_midi](https://craffel.github.io/pretty-midi/) for
post-processing, and [librosa](https://librosa.org/) for tempo estimation.

> Audio-to-MIDI transcription is approximate. Complex full songs often need
> manual cleanup. For full mixes, enable Demucs and convert a single stem
> (bass, vocals, or "other") — that produces the cleanest results.

## How it fits in

The trainer is a single-page Vite/React app. This module adds:

- **`/audio-to-midi`** — a new page in the existing app shell (sidebar entry
  "Audio→MIDI"). Upload audio → backend runs Basic Pitch → resulting MIDI is
  parsed with the existing `useMidiParser` hook → the user picks track
  assignments and saves the song through the same `upsertImportedSong` flow as
  `ImportMidi`, so it shows up in **Library** and is selectable in **Practice**.
- **`/backend`** — a small FastAPI service that hosts the conversion pipeline.
  It's a separate process because Basic Pitch / Demucs are Python.
- **Vite dev proxy** — `/api/*` from the SPA is forwarded to the backend, so
  the frontend just calls `fetch('/api/upload')` etc. No CORS plumbing needed.

```
src/
  pages/AudioToMidi.tsx        ← new page (upload + status + parse + save)
  utils/audio2midi.ts          ← typed client for the backend
  App.tsx                      ← adds nav entry + route
  hooks/useMidiParser.ts       ← reused as-is on the returned .mid file
  hooks/useLocalLibrary.ts     ← reused to upsert the converted song

backend/                       ← FastAPI service
  app/
    main.py
    routes/{upload,convert}.py
    services/{audio,basic_pitch_service,demucs_service,midi_postprocess}.py
    models/schemas.py
    config.py
    jobs.py
  requirements.txt
  Dockerfile
  uploads/   outputs/   jobs/   ← runtime data (gitignored)
```

## Prerequisites

- **Node 18+** (for the Vite app)
- **Python 3.10 / 3.11** (Basic Pitch is happiest there)
- **ffmpeg** on PATH — used to normalize uploads to 44.1 kHz WAV

```bash
# linux
sudo apt install ffmpeg libsndfile1
# macOS
brew install ffmpeg
# windows: install from https://www.gyan.dev/ffmpeg/builds/ and add bin/ to PATH
```

## Install — backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

The first conversion downloads the Basic Pitch model (~20 MB) and, if you
enable stem separation, the Demucs weights (~2 GB) — give it network on the
first run.

## Install — frontend (the existing trainer)

```bash
npm install
```

## Run locally

Two terminals:

```bash
# terminal 1 — backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

```bash
# terminal 2 — frontend (Vite)
npm run dev
```

Open the URL Vite prints (default <http://localhost:5173>) and click the
**Audio→MIDI** entry in the sidebar.

To point the SPA at a different backend (e.g. when serving the built app),
set `VITE_AUDIO2MIDI_API` at build time, or override the dev proxy target with
`VITE_AUDIO2MIDI_BACKEND` (see `vite.config.ts`).

## Run the backend in Docker

```bash
docker compose up --build backend
```

(The Vite app stays on `npm run dev` for hot reload; `docker-compose.yml`
only ships the Python backend.)

## REST API

| Method | Path                       | Purpose                              |
|--------|----------------------------|--------------------------------------|
| GET    | `/api/health`              | health probe                         |
| POST   | `/api/upload`              | multipart upload, returns `file_id`  |
| POST   | `/api/convert`             | start a conversion job               |
| GET    | `/api/status/{job_id}`     | poll job state + progress            |
| GET    | `/api/preview/{job_id}`    | JSON notes/metadata of the result    |
| GET    | `/api/download/{job_id}`   | download the cleaned `.mid`          |
| GET    | `/api/history`             | list completed conversions           |
| DELETE | `/api/history/{job_id}`    | remove a stored conversion           |

Example `POST /api/convert` body:

```json
{
  "file_id": "abc...",
  "mode": "full",
  "use_demucs": false,
  "selected_stem": "original",
  "quantize": "1/16",
  "min_note_duration_ms": 80,
  "min_velocity": 20,
  "transpose": 0,
  "estimate_tempo": true,
  "merge_close_notes": false
}
```

## User flow inside the app

1. Open the trainer, click **Audio→MIDI** in the left rail.
2. Drag in an audio file (or use **Select audio**).
3. Pick a mode in the sidebar:
   - **Full rough MIDI** — transcribe everything Basic Pitch hears.
   - **Melody only** — keeps the highest concurrent line (rough monophonic).
   - **Bass only** — keeps only low pitches (E1–C4).
   - **Piano / instrumental** — same as full, but flagged as piano (program 0).
   - **Separate stems first** — runs Demucs, then transcribes the chosen stem.
4. Optionally tweak quantize grid, min note length, min velocity, transpose.
5. The job runs in the background; status & progress are polled.
6. When done, the resulting MIDI is parsed automatically and you see the same
   track-assignment UI as the regular **Import MIDI** page. Save it and the
   song goes into your library; the app jumps to **Practice** with it loaded.

## Minimal test workflow

1. Start backend + frontend.
2. Use a short clean recording first — 10–20 s of solo piano or a single
   melodic instrument. Complex full mixes give noisy MIDI without Demucs.
3. Upload, leave the defaults, **Select audio** → wait for "finished".
4. Hit **Save & Practice** and try the practice player.
5. For a full song, re-run with Demucs enabled and convert just the **bass**
   stem — that's the cleanest place to start.

Smoke-test the backend without the UI:

```bash
curl -F "file=@my_clip.wav" http://localhost:8000/api/upload
# -> {"file_id":"...","filename":"my_clip.wav","size_bytes":...}

curl -X POST http://localhost:8000/api/convert \
  -H 'content-type: application/json' \
  -d '{"file_id":"<FILE_ID>","mode":"full","quantize":"1/16"}'
# -> {"job_id":"..."}

curl http://localhost:8000/api/status/<JOB_ID>
curl -OJ http://localhost:8000/api/download/<JOB_ID>
```

## Implementation notes

- Long-running conversions run as FastAPI `BackgroundTasks`; `/api/convert`
  returns a `job_id` immediately. The frontend polls `/api/status/{id}`.
- Jobs are mirrored to `backend/jobs/<job_id>.json` so status survives backend
  restarts.
- `clean_midi(input_mid_path, output_mid_path, settings)` in
  `app/services/midi_postprocess.py` is the post-processing entry-point: it
  filters by note duration / velocity, quantizes start/end to the chosen grid
  (using the librosa-estimated BPM), optionally transposes, optionally merges
  consecutive same-pitch notes, and shapes results to the chosen mode.
- The Audio→MIDI page reuses the existing `useMidiParser` hook (Tone.js MIDI)
  to convert the returned `.mid` blob into the same `ParsedMidiSong` shape the
  rest of the trainer already understands.
