"""FastAPI entry-point — enqueue jobs and health checks."""

from __future__ import annotations

import hmac

from celery.result import AsyncResult
from fastapi import Depends, FastAPI, Header, HTTPException, status

from .celery_app import celery_app
from .config import logger, settings
from .schemas import JobEnqueueResponse, JobPayload, JobStatusResponse
from .tasks import process_job

app = FastAPI(title="MIDI Worker", version="0.1.0")


def _verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if settings.api_key and (
        not x_api_key or not hmac.compare_digest(x_api_key, settings.api_key)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid api key")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "midi-worker"}


@app.post("/jobs", response_model=JobEnqueueResponse, status_code=status.HTTP_202_ACCEPTED)
def enqueue_job(
    payload: JobPayload,
    _: None = Depends(_verify_api_key),
) -> JobEnqueueResponse:
    task = process_job.delay(payload.model_dump(mode="json"))
    logger.info("enqueued job %s as task %s", payload.job_id, task.id)
    return JobEnqueueResponse(task_id=task.id, job_id=payload.job_id)


@app.get("/jobs/{task_id}/status", response_model=JobStatusResponse)
def job_status(task_id: str, _: None = Depends(_verify_api_key)) -> JobStatusResponse:
    result = AsyncResult(task_id, app=celery_app)
    state = result.state
    if state == "FAILURE":
        return JobStatusResponse(
            task_id=task_id,
            state=state,
            error=str(result.result) if result.result else "task failed",
        )
    if state == "SUCCESS":
        return JobStatusResponse(task_id=task_id, state=state, result=result.result)
    return JobStatusResponse(task_id=task_id, state=state)
