"""Authenticated MIDI job endpoints backed by the database."""

from __future__ import annotations

import hmac
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user_id
from ..config import USE_BACKGROUND_TASKS, WORKER_SECRET
from ..db import get_db
from ..models.schemas import (
    MidiJobCallbackRequest,
    MidiJobCreateRequest,
    MidiJobCreateResponse,
    MidiJobResponse,
)
from ..services.midi_job_service import (
    create_midi_artifact,
    create_midi_job,
    get_midi_artifact,
    get_midi_job,
    update_midi_job,
)
from ..services.worker_dispatch import build_callback_url, dispatch_midi_job
from ..storage_paths import find_upload
from .convert import _find_upload, schedule_pipeline

router = APIRouter(prefix="/api/midi", tags=["midi"])


def _verify_worker_secret(x_worker_secret: str | None = Header(default=None)) -> None:
    if not x_worker_secret or not hmac.compare_digest(x_worker_secret, WORKER_SECRET):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid worker secret")


def _verify_worker_access(
    x_worker_secret: str | None = Header(default=None),
    worker_token: str | None = Query(default=None),
) -> None:
    secret = x_worker_secret or worker_token
    if not secret or not hmac.compare_digest(secret, WORKER_SECRET):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid worker secret")


def _require_owned_job(db: Session, job_id: uuid.UUID, user_id: str):
    job = get_midi_job(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job not found")
    if job.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return job


@router.post("/jobs", response_model=MidiJobCreateResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    req: MidiJobCreateRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> MidiJobCreateResponse:
    try:
        _find_upload(req.file_id, user_id=user_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    job = create_midi_job(db, user_id, req.file_id, req.model_dump())
    if USE_BACKGROUND_TASKS:
        schedule_pipeline(job.id, req)
    else:
        dispatch_midi_job(
            job.id,
            user_id,
            req.file_id,
            req,
            callback_url=build_callback_url(job.id),
        )
    return MidiJobCreateResponse(id=job.id, state=job.state)


@router.get("/jobs/{job_id}", response_model=MidiJobResponse)
def get_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> MidiJobResponse:
    job = _require_owned_job(db, job_id, user_id)
    return MidiJobResponse.model_validate(job)


@router.get("/jobs/{job_id}/input")
def download_job_input(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(_verify_worker_access),
):
    job = get_midi_job(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job not found")

    try:
        src = find_upload(job.file_id, user_id=job.user_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    original_name = src.name.split("__", 1)[-1]
    return FileResponse(path=src, filename=original_name)


@router.get("/jobs/{job_id}/artifacts/midi")
def download_midi_artifact(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    job = _require_owned_job(db, job_id, user_id)
    if job.state != "done":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="job not finished")

    artifact = get_midi_artifact(db, job_id, kind="midi")
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="midi artifact missing")

    midi_path = Path(artifact.file_path)
    if not midi_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="midi artifact missing")

    return FileResponse(
        path=midi_path,
        media_type="audio/midi",
        filename=artifact.filename,
    )


@router.post("/jobs/{job_id}/callback")
def job_callback(
    job_id: uuid.UUID,
    req: MidiJobCallbackRequest,
    db: Session = Depends(get_db),
    _: None = Depends(_verify_worker_secret),
) -> dict:
    job = get_midi_job(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job not found")

    update_midi_job(
        db,
        job_id,
        state=req.state,
        progress=req.progress,
        step=req.step,
        error=req.error,
        output_filename=req.output_filename or job.output_filename,
    )

    if req.state == "done" and req.artifact_path:
        midi_path = Path(req.artifact_path)
        if midi_path.exists():
            create_midi_artifact(
                db,
                job_id,
                file_path=midi_path,
                filename=req.output_filename or midi_path.name,
                kind="midi",
            )

    return {"ok": True, "job_id": str(job_id), "state": req.state}
