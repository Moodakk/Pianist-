"""Conversion + status + download + preview endpoints."""

from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from ..config import JOBS_DIR, OUTPUT_DIR, UPLOAD_DIR, logger
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
from ..services.midi_postprocess import CleanSettings, clean_midi, summarize_midi

router = APIRouter(prefix="/api", tags=["convert"])


def _find_upload(file_id: str) -> Path:
    matches = list(UPLOAD_DIR.glob(f"{file_id}__*"))
    if not matches:
        raise FileNotFoundError(f"upload {file_id} not found")
    return matches[0]


def _output_paths(job_id: str) -> tuple[Path, Path, Path]:
    work_dir = OUTPUT_DIR / job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    raw = work_dir / "raw.mid"
    cleaned = work_dir / "output.mid"
    return work_dir, raw, cleaned


def _run_pipeline(job_id: str, req: ConvertRequest) -> None:
    try:
        update_job(job_id, state="running", step="loading audio", progress=0.05)
        src = _find_upload(req.file_id)
        work_dir, raw_mid, clean_mid = _output_paths(job_id)
        wav_path = work_dir / "input.wav"
        to_wav(src, wav_path, mono=False)

        target_audio = wav_path
        if req.use_demucs or req.mode == "stem":
            update_job(job_id, step="running demucs (this can take a while)", progress=0.2)
            stems_dir = work_dir / "stems"
            stems = separate(wav_path, stems_dir)
            picked = req.selected_stem
            if picked == "original" or picked not in stems:
                picked = "other" if "other" in stems else next(iter(stems))
            target_audio = stems[picked]
            update_job(job_id, step=f"demucs done, using stem '{picked}'", progress=0.5)

        update_job(job_id, step="running Basic Pitch", progress=0.6)
        transcribe(target_audio, raw_mid)

        update_job(job_id, step="post-processing MIDI", progress=0.85)
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

        # Save the original filename for history/download naming.
        original_name = src.name.split("__", 1)[-1]
        meta = {
            "original_filename": original_name,
            "bpm": bpm,
            "duration": duration_seconds(target_audio),
        }
        (work_dir / "meta.json").write_text(_json(meta))

        output_filename = Path(original_name).stem + ".mid"
        update_job(
            job_id,
            state="done",
            step="finished",
            progress=1.0,
            output_filename=output_filename,
        )
    except Exception as exc:
        logger.exception("job %s failed", job_id)
        update_job(
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
    background.add_task(_run_pipeline, job["job_id"], req)
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
    midi = OUTPUT_DIR / job_id / "output.mid"
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

    midi = OUTPUT_DIR / job_id / "output.mid"
    if not midi.exists():
        raise HTTPException(status_code=404, detail="output midi missing")

    duration, total, notes = summarize_midi(midi)
    bpm = None
    meta_path = OUTPUT_DIR / job_id / "meta.json"
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
        midi = OUTPUT_DIR / job["job_id"] / "output.mid"
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
    out_dir = OUTPUT_DIR / job_id
    if out_dir.exists():
        shutil.rmtree(out_dir, ignore_errors=True)
    (JOBS_DIR / f"{job_id}.json").unlink(missing_ok=True)
    return {"deleted": job_id}
