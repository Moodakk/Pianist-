"""Conversion + status + download + preview endpoints."""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Union

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from ..config import JOBS_DIR, OUTPUT_DIR, logger
from ..db import SessionLocal
from ..jobs import create_job, get_job, list_jobs, update_job
from ..models.schemas import (
    ConvertRequest,
    ConvertResponse,
    HistoryEntry,
    HistoryResponse,
    JobStatus,
    NotePreview,
    PreviewResponse,
)
from ..services.audio import duration_seconds, estimate_tempo, to_wav
from ..services.basic_pitch_service import transcribe
from ..services.demucs_service import separate
from ..services.midi_job_service import create_midi_artifact, get_midi_job, update_midi_job
from ..services.midi_postprocess import CleanSettings, clean_midi, summarize_midi
from ..storage_paths import find_upload, job_dir

router = APIRouter(prefix="/api", tags=["convert"])

JobKey = Union[str, uuid.UUID]


def _find_upload(file_id: str, user_id: str | None = None) -> Path:
    return find_upload(file_id, user_id)


def _job_dir(job_id: JobKey, user_id: str | None = None) -> Path:
    return job_dir(job_id, user_id)


def _resolve_user_id(job_id: JobKey) -> str | None:
    if not isinstance(job_id, uuid.UUID):
        return None
    db = SessionLocal()
    try:
        job = get_midi_job(db, job_id)
        return job.user_id if job else None
    finally:
        db.close()


def _output_paths(job_id: JobKey, user_id: str | None = None) -> tuple[Path, Path, Path]:
    work_dir = _job_dir(job_id, user_id)
    work_dir.mkdir(parents=True, exist_ok=True)
    raw = work_dir / "raw.mid"
    cleaned = work_dir / "output.mid"
    return work_dir, raw, cleaned


def _sync_db_job(job_id: JobKey, **fields) -> None:
    if not isinstance(job_id, uuid.UUID):
        return
    db = SessionLocal()
    try:
        update_midi_job(db, job_id, **fields)
    finally:
        db.close()


def _persist_midi_artifact(job_id: JobKey, midi_path: Path, filename: str) -> None:
    if not isinstance(job_id, uuid.UUID):
        return
    db = SessionLocal()
    try:
        create_midi_artifact(
            db,
            job_id,
            file_path=midi_path,
            filename=filename,
            kind="midi",
        )
    finally:
        db.close()


def _update_job_state(job_id: JobKey, **fields) -> None:
    if isinstance(job_id, str):
        update_job(job_id, **fields)
    _sync_db_job(job_id, **fields)


def run_pipeline(job_id: JobKey, req: ConvertRequest) -> None:
    owner_id = _resolve_user_id(job_id)
    try:
        _update_job_state(job_id, state="running", step="loading audio", progress=0.05)
        src = _find_upload(req.file_id, user_id=owner_id)
        work_dir, raw_mid, clean_mid = _output_paths(job_id, user_id=owner_id)
        wav_path = work_dir / "input.wav"
        to_wav(src, wav_path, mono=False)

        target_audio = wav_path
        if req.use_demucs or req.mode == "stem":
            _update_job_state(job_id, step="running demucs (this can take a while)", progress=0.2)
            stems_dir = work_dir / "stems"
            stems = separate(wav_path, stems_dir)
            picked = req.selected_stem
            if picked == "original" or picked not in stems:
                picked = "other" if "other" in stems else next(iter(stems))
            target_audio = stems[picked]
            _update_job_state(job_id, step=f"demucs done, using stem '{picked}'", progress=0.5)

        _update_job_state(job_id, step="running Basic Pitch", progress=0.6)
        transcribe(target_audio, raw_mid)

        _update_job_state(job_id, step="post-processing MIDI", progress=0.85)
        bpm = estimate_tempo(target_audio) if req.estimate_tempo else None
        settings = CleanSettings(
            min_note_duration_ms=req.min_note_duration_ms,
            min_velocity=req.min_velocity,
            quantize=req.quantize,
            transpose=req.transpose,
            merge_close_notes=req.merge_close_notes,
            bpm_hint=bpm,
            mode=req.mode,
        )
        clean_midi(raw_mid, clean_mid, settings)

        original_name = src.name.split("__", 1)[-1]
        meta = {
            "original_filename": original_name,
            "bpm": bpm,
            "duration": duration_seconds(target_audio),
        }
        (work_dir / "meta.json").write_text(_json(meta))

        output_filename = Path(original_name).stem + ".mid"
        _update_job_state(
            job_id,
            state="done",
            step="finished",
            progress=1.0,
            output_filename=output_filename,
        )
        _persist_midi_artifact(job_id, clean_mid, output_filename)
    except Exception as exc:
        logger.exception("job %s failed", job_id)
        _update_job_state(
            job_id,
            state="error",
            error=f"{exc.__class__.__name__}: {exc}",
            step="failed",
        )


def _json(payload) -> str:
    import json

    return json.dumps(payload, indent=2, default=str)


@router.post("/convert", response_model=ConvertResponse)
def convert(req: ConvertRequest, background: BackgroundTasks) -> ConvertResponse:
    try:
        _find_upload(req.file_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    job = create_job(req.file_id, req.model_dump())
    background.add_task(run_pipeline, job["job_id"], req)
    return ConvertResponse(job_id=job["job_id"])


@router.get("/status/{job_id}", response_model=JobStatus)
def status(job_id: str) -> JobStatus:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return JobStatus(**{k: job.get(k) for k in JobStatus.model_fields})


@router.get("/download/{job_id}")
def download(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    if job.get("state") != "done":
        raise HTTPException(status_code=409, detail="job not finished")
    midi = _job_dir(job_id) / "output.mid"
    if not midi.exists():
        raise HTTPException(status_code=404, detail="output midi missing")
    return FileResponse(
        path=midi,
        media_type="audio/midi",
        filename=job.get("output_filename") or "output.mid",
    )


@router.get("/preview/{job_id}", response_model=PreviewResponse)
def preview(job_id: str) -> PreviewResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    if job.get("state") != "done":
        raise HTTPException(status_code=409, detail="job not finished")

    midi = _job_dir(job_id) / "output.mid"
    if not midi.exists():
        raise HTTPException(status_code=404, detail="output midi missing")

    duration, total, notes = summarize_midi(midi)
    bpm = None
    meta_path = _job_dir(job_id) / "meta.json"
    if meta_path.exists():
        try:
            import json

            bpm = json.loads(meta_path.read_text()).get("bpm")
        except Exception:
            bpm = None

    return PreviewResponse(
        job_id=job_id,
        duration=duration,
        note_count=total,
        estimated_bpm=bpm,
        notes=[NotePreview(**n) for n in notes],
    )


@router.get("/history", response_model=HistoryResponse)
def history() -> HistoryResponse:
    items: list[HistoryEntry] = []
    for job in list_jobs():
        if job.get("state") != "done":
            continue
        midi = _job_dir(job["job_id"]) / "output.mid"
        if not midi.exists():
            continue
        items.append(
            HistoryEntry(
                job_id=job["job_id"],
                filename=job.get("output_filename") or "output.mid",
                created_at=job.get("created_at", 0.0),
                size_bytes=midi.stat().st_size,
            )
        )
    return HistoryResponse(items=items)


@router.delete("/history/{job_id}")
def delete_job(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    out_dir = _job_dir(job_id)
    if out_dir.exists():
        shutil.rmtree(out_dir, ignore_errors=True)
    (JOBS_DIR / f"{job_id}.json").unlink(missing_ok=True)
    return {"deleted": job_id}
