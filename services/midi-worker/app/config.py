"""Worker configuration from environment variables."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MIDI_WORKER_", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"
    work_dir: Path = Path("/tmp/midi-worker/work")
    artifact_dir: Path = Path("/tmp/midi-worker/artifacts")
    worker_secret: str = "dev-worker-secret"
    api_key: str = ""  # optional; if set, POST /jobs requires X-API-Key
    log_level: str = "INFO"
    celery_result_backend: str | None = None  # defaults to redis_url

    # S3 (optional)
    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "us-east-1"

    def resolved_result_backend(self) -> str:
        return self.celery_result_backend or self.redis_url


settings = Settings()

settings.work_dir.mkdir(parents=True, exist_ok=True)
settings.artifact_dir.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("midi-worker")
