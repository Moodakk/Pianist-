"""FastAPI entry-point for the Audio-to-MIDI converter."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import logger
from .routes import convert, upload

app = FastAPI(title="Audio to MIDI Converter", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(convert.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.on_event("startup")
def _startup() -> None:
    logger.info("Audio-to-MIDI backend ready")
