"""Dispatch MIDI jobs to the external worker HTTP API."""

from __future__ import annotations

import uuid
from typing import Any

import httpx

from ..config import PUBLIC_API_URL, WORKER_API_KEY, WORKER_SECRET, WORKER_URL, logger
from ..db import SessionLocal
from ..models.schemas import ConvertRequest
from ..services.midi_job_service import update_midi_job


def build_callback_url(job_id: uuid.UUID) -> str:
    base = PUBLIC_API_URL.rstrip("/")
    return f"{base}/api/midi/jobs/{job_id}/callback"


def build_audio_url(job_id: uuid.UUID) -> str:
    """URL the worker fetches with a GET (auth via worker_token query param)."""
    base = PUBLIC_API_URL.rstrip("/")
    return f"{base}/api/midi/jobs/{job_id}/input?worker_token={WORKER_SECRET}"


def _options_payload(req: ConvertRequest) -> dict[str, Any]:
    return {
        "mode": req.mode,
        "use_demucs": req.use_demucs,
        "selected_stem": req.selected_stem,
        "quantize": req.quantize,
        "min_note_duration_ms": req.min_note_duration_ms,
        "min_velocity": req.min_velocity,
        "transpose": req.transpose,
        "estimate_tempo": req.estimate_tempo,
        "merge_close_notes": req.merge_close_notes,
    }


def _mark_dispatch_error(job_id: uuid.UUID, error: str) -> None:
    db = SessionLocal()
    try:
        update_midi_job(
            db,
            job_id,
            state="error",
            step="failed",
            error=error,
        )
    finally:
        db.close()


def dispatch_midi_job(
    job_id: uuid.UUID,
    user_id: str,
    file_id: str,
    options: ConvertRequest,
    callback_url: str | None = None,
) -> None:
    """POST job payload to the worker queue API."""
    del file_id  # audio is resolved by job_id via GET /api/midi/jobs/{id}/input

    if not WORKER_URL:
        _mark_dispatch_error(job_id, "Worker dispatch failed: AUDIO2MIDI_WORKER_URL not configured")
        return

    payload = {
        "job_id": str(job_id),
        "user_id": user_id,
        "audio_url": build_audio_url(job_id),
        "options": _options_payload(options),
        "callback_url": callback_url or build_callback_url(job_id),
        "artifact_upload": {"storage_type": "local"},
    }

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if WORKER_API_KEY:
        headers["X-API-Key"] = WORKER_API_KEY

    url = f"{WORKER_URL.rstrip('/')}/jobs"
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
        logger.info("dispatched job %s to worker at %s", job_id, url)
    except Exception as exc:
        logger.exception("failed to dispatch job %s to worker", job_id)
        _mark_dispatch_error(job_id, f"Worker dispatch failed: {exc.__class__.__name__}: {exc}")
