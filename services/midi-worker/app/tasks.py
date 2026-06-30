"""Celery task orchestrating the audio-to-MIDI pipeline."""

from __future__ import annotations

import json
from pathlib import Path

from celery import Task

from .celery_app import celery_app
from .config import logger, settings
from .pipeline.callback import send_callback
from .pipeline.demucs import separate
from .pipeline.download import download_audio
from .pipeline.normalize import duration_seconds, estimate_tempo, to_wav
from .pipeline.postprocess import CleanSettings, clean_midi
from .pipeline.transcribe import transcribe
from .pipeline.upload import upload_artifact
from .schemas import CallbackPayload, JobPayload


def _work_dir(job_id: str) -> Path:
    path = settings.work_dir / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _notify(payload: JobPayload, *, task_id: str | None, **fields) -> None:
    callback = CallbackPayload(
        job_id=payload.job_id,
        task_id=task_id,
        **fields,
    )
    send_callback(payload.callback_url, callback)


def run_pipeline(payload: JobPayload, task_id: str | None = None) -> dict:
    """Execute pipeline steps sequentially."""
    job_id = str(payload.job_id)
    work_dir = _work_dir(job_id)
    options = payload.options

    try:
        _notify(
            payload,
            task_id=task_id,
            state="running",
            step="downloading audio",
            progress=0.05,
        )
        src = download_audio(
            audio_url=payload.audio_url,
            audio_path=payload.audio_path,
            dest_dir=work_dir,
        )

        _notify(payload, task_id=task_id, state="running", step="normalizing audio", progress=0.15)
        wav_path = work_dir / "input.wav"
        to_wav(src, wav_path, mono=False)

        target_audio = wav_path
        if options.use_demucs or options.mode == "stem":
            _notify(
                payload,
                task_id=task_id,
                state="running",
                step="running demucs (this can take a while)",
                progress=0.25,
            )
            stems_dir = work_dir / "stems"
            stems = separate(wav_path, stems_dir)
            picked = options.selected_stem
            if picked == "original" or picked not in stems:
                picked = "other" if "other" in stems else next(iter(stems))
            target_audio = stems[picked]
            _notify(
                payload,
                task_id=task_id,
                state="running",
                step=f"demucs done, using stem '{picked}'",
                progress=0.45,
            )

        _notify(payload, task_id=task_id, state="running", step="running Basic Pitch", progress=0.55)
        raw_mid = work_dir / "raw.mid"
        transcribe(target_audio, raw_mid)

        _notify(payload, task_id=task_id, state="running", step="post-processing MIDI", progress=0.75)
        bpm = estimate_tempo(target_audio) if options.estimate_tempo else None
        clean_settings = CleanSettings(
            min_note_duration_ms=options.min_note_duration_ms,
            min_velocity=options.min_velocity,
            quantize=options.quantize,
            transpose=options.transpose,
            merge_close_notes=options.merge_close_notes,
            bpm_hint=bpm,
            mode=options.mode,
        )
        clean_mid = work_dir / "output.mid"
        clean_midi(raw_mid, clean_mid, clean_settings)

        output_filename = src.stem + ".mid"
        meta = {
            "original_filename": src.name,
            "bpm": bpm,
            "duration": duration_seconds(target_audio),
        }
        (work_dir / "meta.json").write_text(json.dumps(meta, indent=2, default=str))

        _notify(payload, task_id=task_id, state="running", step="uploading artifact", progress=0.9)
        upload = upload_artifact(
            clean_mid,
            job_id,
            output_filename,
            payload.artifact_upload,
        )

        result = {
            "job_id": job_id,
            "output_filename": output_filename,
            "artifact_path": str(upload.artifact_path),
            "artifact_url": upload.artifact_url,
            "artifact_size_bytes": upload.size_bytes,
            "meta": meta,
        }

        _notify(
            payload,
            task_id=task_id,
            state="done",
            step="finished",
            progress=1.0,
            output_filename=output_filename,
            artifact_path=str(upload.artifact_path),
            artifact_url=upload.artifact_url,
            artifact_size_bytes=upload.size_bytes,
            meta=meta,
        )
        return result
    except Exception as exc:
        logger.exception("job %s failed", job_id)
        _notify(
            payload,
            task_id=task_id,
            state="error",
            step="failed",
            progress=1.0,
            error=f"{exc.__class__.__name__}: {exc}",
        )
        raise


@celery_app.task(bind=True, name="midi_worker.process_job")
def process_job(self: Task, payload_dict: dict) -> dict:
    payload = JobPayload.model_validate(payload_dict)
    return run_pipeline(payload, task_id=self.request.id)
