"""In-process job registry + filesystem persistence."""

from __future__ import annotations

import json
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from .config import JOBS_DIR, logger

_lock = threading.Lock()
_jobs: Dict[str, Dict[str, Any]] = {}


def _path(job_id: str) -> Path:
    return JOBS_DIR / f"{job_id}.json"


def _persist(job: Dict[str, Any]) -> None:
    try:
        _path(job["job_id"]).write_text(json.dumps(job, indent=2))
    except Exception as exc:
        logger.warning("failed to persist job %s: %s", job["job_id"], exc)


def create_job(file_id: str, request: Dict[str, Any]) -> Dict[str, Any]:
    job_id = uuid.uuid4().hex
    now = time.time()
    job = {
        "job_id": job_id,
        "state": "queued",
        "progress": 0.0,
        "step": "queued",
        "error": None,
        "file_id": file_id,
        "request": request,
        "output_filename": None,
        "created_at": now,
        "updated_at": now,
    }
    with _lock:
        _jobs[job_id] = job
    _persist(job)
    return job


def update_job(job_id: str, **fields: Any) -> Optional[Dict[str, Any]]:
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return None
        job.update(fields)
        job["updated_at"] = time.time()
        _persist(job)
        return dict(job)


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        job = _jobs.get(job_id)
        if job:
            return dict(job)
    # try loading from disk (after restart)
    path = _path(job_id)
    if path.exists():
        try:
            data = json.loads(path.read_text())
            with _lock:
                _jobs[job_id] = data
            return dict(data)
        except Exception:
            return None
    return None


def list_jobs() -> list[Dict[str, Any]]:
    out = []
    for path in JOBS_DIR.glob("*.json"):
        try:
            out.append(json.loads(path.read_text()))
        except Exception:
            continue
    out.sort(key=lambda j: j.get("created_at", 0.0), reverse=True)
    return out
