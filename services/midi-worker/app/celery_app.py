"""Celery application instance."""

from __future__ import annotations

from celery import Celery

from .config import settings

celery_app = Celery(
    "midi_worker",
    broker=settings.redis_url,
    backend=settings.resolved_result_backend(),
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
