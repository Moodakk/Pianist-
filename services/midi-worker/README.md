# MIDI Worker — FastAPI + Celery microservice for audio-to-MIDI conversion.

Standalone worker that runs the conversion pipeline (download → ffmpeg → Basic Pitch → postprocess → upload) and reports status back to the main Pianist backend via webhook.

## Architecture

```
Main backend                    MIDI worker
─────────────                   ───────────
POST /api/midi/jobs  ──►  (optional) enqueue via POST /jobs
                                │
                                ▼
                           Celery + Redis
                                │
                     download → normalize → transcribe
                     → postprocess → upload
                                │
                                ▼
POST /api/midi/jobs/{id}/callback  ◄── webhook (X-Worker-Secret)
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MIDI_WORKER_REDIS_URL` | `redis://localhost:6379/0` | Celery broker + result backend |
| `MIDI_WORKER_WORK_DIR` | `/tmp/midi-worker/work` | Scratch space per job |
| `MIDI_WORKER_ARTIFACT_DIR` | `/tmp/midi-worker/artifacts` | Local artifact storage |
| `MIDI_WORKER_WORKER_SECRET` | `dev-worker-secret` | Sent as `X-Worker-Secret` on callbacks |
| `MIDI_WORKER_API_KEY` | *(empty)* | If set, `POST /jobs` requires `X-API-Key` |
| `MIDI_WORKER_LOG_LEVEL` | `INFO` | Logging level |
| `MIDI_WORKER_S3_ENDPOINT_URL` | — | Optional S3-compatible endpoint |
| `MIDI_WORKER_S3_ACCESS_KEY` | — | S3 access key |
| `MIDI_WORKER_S3_SECRET_KEY` | — | S3 secret key |
| `MIDI_WORKER_S3_REGION` | `us-east-1` | S3 region |

Main backend must set matching secret:

```
AUDIO2MIDI_WORKER_SECRET=dev-worker-secret
```

## Run with Docker Compose

From this directory:

```bash
docker compose up --build
```

- API: http://localhost:8100/health
- Redis: localhost:6379

Start the Celery worker in a second terminal (without Docker):

```bash
cd services/midi-worker
pip install -r requirements.txt
export MIDI_WORKER_REDIS_URL=redis://localhost:6379/0
celery -A app.celery_app.celery_app worker --loglevel=info
```

## Run locally (dev)

```bash
cd services/midi-worker
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Terminal 1 — Redis (or use docker run -p 6379:6379 redis:7-alpine)
# Terminal 2 — API
uvicorn app.main:app --reload --port 8100
# Terminal 3 — Worker
celery -A app.celery_app.celery_app worker --loglevel=info
```

## API

### `GET /health`

Returns `{"status": "ok", "service": "midi-worker"}`.

### `POST /jobs`

Enqueue a conversion job. Returns `202` with `task_id` and `job_id`.

Example payload:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123",
  "audio_url": "https://example.com/song.mp3",
  "options": {
    "mode": "full",
    "quantize": "1/16",
    "use_demucs": false
  },
  "callback_url": "http://localhost:8000/api/midi/jobs/550e8400-e29b-41d4-a716-446655440000/callback",
  "artifact_upload": {
    "storage_type": "local",
    "public_base_url": "http://localhost:8100/artifacts"
  }
}
```

Use `audio_path` instead of `audio_url` when the worker can read a shared filesystem path.

### `GET /jobs/{task_id}/status`

Poll Celery task state (`PENDING`, `STARTED`, `SUCCESS`, `FAILURE`).

## Callback contract

Worker `POST`s to `callback_url` with header `X-Worker-Secret: <MIDI_WORKER_WORKER_SECRET>`.

Body (JSON):

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "task_id": "celery-task-uuid",
  "state": "running",
  "progress": 0.55,
  "step": "running Basic Pitch",
  "error": null,
  "output_filename": "song.mid",
  "artifact_url": "http://localhost:8100/artifacts/550e8400.../song.mid",
  "artifact_path": "/data/artifacts/550e8400.../song.mid",
  "artifact_size_bytes": 12345,
  "meta": { "bpm": 120.0, "duration": 180.5 }
}
```

`state` is one of `running`, `done`, `error`. The main backend endpoint is `POST /api/midi/jobs/{job_id}/callback`.

When using Docker Compose with the main backend, mount the same `midi_worker_data` volume (or a shared `artifacts` path) so `artifact_path` is readable by the main app.

## Tests

```bash
cd services/midi-worker
pytest
```
