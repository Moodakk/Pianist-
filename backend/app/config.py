"""Application configuration and shared paths."""

from __future__ import annotations

import logging
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = Path(os.environ.get("AUDIO2MIDI_UPLOADS", BASE_DIR / "uploads"))
OUTPUT_DIR = Path(os.environ.get("AUDIO2MIDI_OUTPUTS", BASE_DIR / "outputs"))
JOBS_DIR = Path(os.environ.get("AUDIO2MIDI_JOBS", BASE_DIR / "jobs"))

for _d in (UPLOAD_DIR, OUTPUT_DIR, JOBS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a"}
MAX_UPLOAD_BYTES = int(os.environ.get("AUDIO2MIDI_MAX_UPLOAD_MB", "60")) * 1024 * 1024

logging.basicConfig(
    level=os.environ.get("AUDIO2MIDI_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("audio2midi")
