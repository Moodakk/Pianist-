"""Upload artifacts to local storage or S3-compatible storage."""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path

from ..config import logger, settings
from ..schemas import ArtifactUploadConfig


@dataclass
class UploadResult:
    artifact_path: Path
    artifact_url: str | None
    size_bytes: int


def upload_artifact(
    source: Path,
    job_id: str,
    output_filename: str,
    config: ArtifactUploadConfig,
) -> UploadResult:
    """Copy or upload the MIDI artifact and return path + optional public URL."""
    if not source.exists():
        raise FileNotFoundError(f"artifact source missing: {source}")

    size_bytes = source.stat().st_size

    if config.storage_type == "s3":
        return _upload_s3(source, job_id, output_filename, config, size_bytes)

    dest_dir = Path(config.local_dir) if config.local_dir else settings.artifact_dir
    dest_dir = dest_dir / str(job_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / output_filename
    logger.info("upload local artifact: %s -> %s", source, dest)
    shutil.copy2(source, dest)

    artifact_url = None
    if config.public_base_url:
        base = config.public_base_url.rstrip("/")
        artifact_url = f"{base}/{job_id}/{output_filename}"

    return UploadResult(artifact_path=dest, artifact_url=artifact_url, size_bytes=size_bytes)


def _upload_s3(
    source: Path,
    job_id: str,
    output_filename: str,
    config: ArtifactUploadConfig,
    size_bytes: int,
) -> UploadResult:
    if not config.s3_bucket:
        raise ValueError("s3_bucket is required for S3 storage")

    import boto3

    prefix = (config.s3_prefix or "midi").strip("/")
    key = f"{prefix}/{job_id}/{output_filename}"

    client_kwargs: dict = {"region_name": settings.s3_region}
    if settings.s3_endpoint_url:
        client_kwargs["endpoint_url"] = settings.s3_endpoint_url
    if settings.s3_access_key and settings.s3_secret_key:
        client_kwargs["aws_access_key_id"] = settings.s3_access_key
        client_kwargs["aws_secret_access_key"] = settings.s3_secret_key

    client = boto3.client("s3", **client_kwargs)
    logger.info("upload s3 artifact: s3://%s/%s", config.s3_bucket, key)
    client.upload_file(str(source), config.s3_bucket, key)

    artifact_url = config.public_base_url
    if artifact_url:
        artifact_url = f"{artifact_url.rstrip('/')}/{key}"
    else:
        artifact_url = f"s3://{config.s3_bucket}/{key}"

    return UploadResult(
        artifact_path=source,
        artifact_url=artifact_url,
        size_bytes=size_bytes,
    )
