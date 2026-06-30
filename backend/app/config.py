"""Application configuration and shared paths."""

from __future__ import annotations

import logging
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = Path(os.environ.get("AUDIO2MIDI_UPLOADS", BASE_DIR / "uploads"))
OUTPUT_DIR = Path(os.environ.get("AUDIO2MIDI_OUTPUTS", BASE_DIR / "outputs"))
JOBS_DIR = Path(os.environ.get("AUDIO2MIDI_JOBS", BASE_DIR / "jobs"))
DATABASE_URL = os.environ.get("AUDIO2MIDI_DATABASE_URL", f"sqlite:///{BASE_DIR / 'pianist.db'}")
AUTH_SECRET = os.environ.get("AUDIO2MIDI_AUTH_SECRET", "dev-secret-change-me")
WORKER_SECRET = os.environ.get("AUDIO2MIDI_WORKER_SECRET", "dev-worker-secret")

WORKER_URL = os.environ.get("AUDIO2MIDI_WORKER_URL", "").rstrip("/")
WORKER_API_KEY = os.environ.get("AUDIO2MIDI_WORKER_API_KEY", "")
USE_BACKGROUND_TASKS = os.environ.get("AUDIO2MIDI_USE_BACKGROUND_TASKS", "true").lower() in (
    "1",
    "true",
    "yes",
)
PUBLIC_API_URL = os.environ.get("AUDIO2MIDI_PUBLIC_API_URL", "http://localhost:8000")

for _d in (UPLOAD_DIR, OUTPUT_DIR, JOBS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a"}
MAX_UPLOAD_BYTES = int(os.environ.get("AUDIO2MIDI_MAX_UPLOAD_MB", "60")) * 1024 * 1024

logging.basicConfig(
    level=os.environ.get("AUDIO2MIDI_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("audio2midi")
