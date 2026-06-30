"""Download audio from URL or copy from local path."""

from __future__ import annotations

import shutil
from pathlib import Path
from urllib.parse import urlparse

import httpx

from ..config import logger

DEFAULT_TIMEOUT = 120.0


def _guess_extension(url: str, content_type: str | None) -> str:
    path = urlparse(url).path
    if "." in path:
        ext = Path(path).suffix.lower()
        if ext in {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"}:
            return ext
    if content_type:
        mapping = {
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/flac": ".flac",
            "audio/mp4": ".m4a",
            "audio/aac": ".aac",
        }
        for key, ext in mapping.items():
            if key in content_type:
                return ext
    return ".wav"


def download_audio(
    *,
    audio_url: str | None,
    audio_path: str | None,
    dest_dir: Path,
    filename_stem: str = "input",
) -> Path:
    """Return path to downloaded or copied source audio."""
    dest_dir.mkdir(parents=True, exist_ok=True)

    if audio_path:
        src = Path(audio_path)
        if not src.exists():
            raise FileNotFoundError(f"audio_path not found: {audio_path}")
        ext = src.suffix or ".wav"
        dest = dest_dir / f"{filename_stem}{ext}"
        logger.info("copy local audio: %s -> %s", src, dest)
        shutil.copy2(src, dest)
        return dest

    if not audio_url:
        raise ValueError("Either audio_url or audio_path is required")

    logger.info("download audio: %s", audio_url)
    with httpx.Client(follow_redirects=True, timeout=DEFAULT_TIMEOUT) as client:
        response = client.get(audio_url)
        response.raise_for_status()
        ext = _guess_extension(audio_url, response.headers.get("content-type"))
        dest = dest_dir / f"{filename_stem}{ext}"
        dest.write_bytes(response.content)
        return dest
