"""FastAPI entry-point for the Audio-to-MIDI converter."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import logger
from .db import init_db
from .routes import auth_route, convert, midi, upload
from .services.audio import resolve_ffmpeg_bin

app = FastAPI(title="Audio to MIDI Converter", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_route.router)
app.include_router(upload.router)
app.include_router(convert.router)
app.include_router(midi.router)


@app.get("/api/health")
def health() -> dict:
    try:
        ffmpeg = resolve_ffmpeg_bin()
        return {"status": "ok", "ffmpeg": ffmpeg}
    except RuntimeError as exc:
        return {"status": "degraded", "ffmpeg_error": str(exc)}


@app.on_event("startup")
def _startup() -> None:
    init_db()
    try:
        ffmpeg = resolve_ffmpeg_bin()
        logger.info("Audio-to-MIDI backend ready (ffmpeg: %s)", ffmpeg)
    except RuntimeError as exc:
        logger.error("Audio-to-MIDI backend started without ffmpeg: %s", exc)
