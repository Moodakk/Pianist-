"""DB helpers for MidiJob lifecycle."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from ..models.db_models import MidiArtifact, MidiJob


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_midi_job(db: Session, user_id: str, file_id: str, request: dict) -> MidiJob:
    job = MidiJob(user_id=user_id, file_id=file_id, request=request)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_midi_job(db: Session, job_id: uuid.UUID) -> MidiJob | None:
    return db.get(MidiJob, job_id)


def update_midi_job(db: Session, job_id: uuid.UUID, **fields) -> MidiJob | None:
    job = db.get(MidiJob, job_id)
    if not job:
        return None
    for key, value in fields.items():
        setattr(job, key, value)
    job.updated_at = _utcnow()
    db.commit()
    db.refresh(job)
    return job


def get_midi_artifact(db: Session, job_id: uuid.UUID, kind: str = "midi") -> MidiArtifact | None:
    return (
        db.query(MidiArtifact)
        .filter(MidiArtifact.job_id == job_id, MidiArtifact.kind == kind)
        .first()
    )


def create_midi_artifact(
    db: Session,
    job_id: uuid.UUID,
    *,
    file_path: Path,
    filename: str,
    kind: str = "midi",
) -> MidiArtifact:
    existing = get_midi_artifact(db, job_id, kind=kind)
    if existing:
        existing.file_path = str(file_path)
        existing.filename = filename
        existing.size_bytes = file_path.stat().st_size if file_path.exists() else 0
        db.commit()
        db.refresh(existing)
        return existing

    artifact = MidiArtifact(
        job_id=job_id,
        kind=kind,
        file_path=str(file_path),
        filename=filename,
        size_bytes=file_path.stat().st_size if file_path.exists() else 0,
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact
