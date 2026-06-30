# Audio to MIDI Converter (MVP)

A practical MVP that takes an audio file (`.mp3`, `.wav`, `.flac`, `.m4a`) and
returns an approximate MIDI sketch you can clean up in any DAW. It uses
[Spotify Basic Pitch](https://github.com/spotify/basic-pitch) for note
detection, [Demucs](https://github.com/facebookresearch/demucs) (optional) for
stem separation, [pretty_midi](https://craffel.github.io/pretty-midi/) for
post-processing, and [librosa](https://librosa.org/) for tempo estimation.

> Audio-to-MIDI transcription is approximate. Complex full songs often need
> manual cleanup in your DAW. Try Demucs stem separation and pick a single
> stem (bass, vocals, "other") for cleaner results.

## Repository layout

```
backend/        FastAPI Python backend
  app/
    main.py
    routes/{upload,convert}.py
    services/{audio,basic_pitch_service,demucs_service,midi_postprocess}.py
    models/schemas.py
    config.py
    jobs.py
  requirements.txt
  Dockerfile
  uploads/      # raw uploads (gitignored)
  outputs/      # generated MIDI + work dirs (gitignored)
  jobs/         # per-job state JSON (gitignored)

frontend/       Next.js 14 + Tailwind frontend
  app/
    layout.tsx
    page.tsx          # upload + convert UI
    history/page.tsx  # list previous conversions
  components/{DropZone,SettingsPanel,StatusCard,ResultCard,PianoRoll}.tsx
  lib/api.ts
  package.json
  Dockerfile

docker-compose.yml  # backend + frontend together
```

## Prerequisites

- **Python 3.10–3.11** (Basic Pitch is happiest there)
- **Node.js 18+**
- **ffmpeg** on `PATH` (used to normalize uploads to 44.1 kHz WAV)

On Linux: `sudo apt install ffmpeg libsndfile1`
On macOS:  `brew install ffmpeg`
On Windows: install ffmpeg from <https://www.gyan.dev/ffmpeg/builds/> and add
the `bin` folder to your PATH.

## Install — backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
```

The first conversion downloads the Basic Pitch model and (if you enable
stem separation) the Demucs weights — give it network access on the first run.

## Install — frontend

```bash
cd frontend
npm install
```

## Run locally

Two terminals:

```bash
# terminal 1 — backend
cd backend
uvicorn app.main:app --reload --port 8000
```

```bash
# terminal 2 — frontend
cd frontend
npm run dev
```

Open <http://localhost:3000>. The frontend proxies `/api/*` to the backend
through Next.js `rewrites`, so you don't need to configure CORS for local
development. To point at a different backend, set
`NEXT_PUBLIC_API_BASE=http://host:8000` before `npm run dev`.

## Run with Docker

```bash
docker compose up --build
```

Frontend on <http://localhost:3000>, backend on <http://localhost:8000>.

## User flow

1. Open the web app.
2. Drag an audio file onto the drop area (or click to choose).
3. Pick a mode in the sidebar:
   - **Full rough MIDI** — transcribe everything Basic Pitch can hear.
   - **Melody only** — keep the highest concurrent line (rough monophonic).
   - **Bass only** — keep only low pitches (E1–C4).
   - **Piano / instrumental** — same as full, but flagged as piano (program 0).
   - **Separate stems first** — runs Demucs, then transcribes the chosen stem.
4. Optionally tweak quantize grid, min note length, min velocity, transpose.
5. The job runs in the background; status & progress are polled.
6. When done you get a piano-roll preview, BPM estimate, note count, and a
   **Download MIDI** button.
7. The `/history` page lists all completed conversions stored under
   `backend/outputs/`.

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

## Minimal test workflow

1. Start backend + frontend.
2. Use a short clean recording first — e.g. 10–20 s of solo piano or a single
   melodic instrument. Complex full mixes give noisy MIDI without stem
   separation.
3. Upload, leave the defaults, hit convert.
4. When you see "finished", click **Download MIDI** and load the `.mid` into
   your DAW (Reaper, Logic, Ableton, MuseScore, etc.).
5. For a full song, re-run with Demucs enabled and convert just the **bass**
   stem — that is the cleanest place to start.

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

- Long-running conversions run as FastAPI `BackgroundTasks` so the request
  thread returns immediately with a `job_id`.
- Jobs are tracked in-memory and mirrored to `backend/jobs/<job_id>.json` so
  status survives restarts.
- `clean_midi(input_mid_path, output_mid_path, settings)` in
  `app/services/midi_postprocess.py` is the post-processing entry-point and
  does: short-note removal, velocity filter, quantization to the selected
  grid (using estimated BPM), optional transpose, optional close-note merge,
  and mode-specific filtering (melody/bass/piano).
- The first time Basic Pitch runs it downloads the bundled model (~20 MB).
- Demucs needs ~2 GB of weights and quite a bit of RAM. It is opt-in.
