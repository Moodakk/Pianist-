"""Wrapper around Demucs source separation."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict

from ..config import logger

STEM_NAMES = ("vocals", "drums", "bass", "other")


def separate(input_wav: Path, work_dir: Path, model: str = "htdemucs") -> Dict[str, Path]:
    """Run demucs and return a map of stem name -> wav path.

    The result lives under ``work_dir/<model>/<track_name>/``.
    """
    work_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable, "-m", "demucs",
        "-n", model,
        "-o", str(work_dir),
        str(input_wav),
    ]
    if not shutil.which("ffmpeg"):
        # Demucs uses torchaudio/soundfile; just log a warning.
        logger.warning("ffmpeg not on PATH; demucs may fail on non-wav inputs")

    logger.info("demucs: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("demucs stderr: %s", result.stderr)
        raise RuntimeError(f"demucs failed: {result.stderr.strip()[-400:]}")

    track_name = input_wav.stem
    stems_dir = work_dir / model / track_name
    if not stems_dir.exists():
        raise RuntimeError(f"demucs output not found at {stems_dir}")

    mapping: Dict[str, Path] = {}
    for stem in STEM_NAMES:
        candidate = stems_dir / f"{stem}.wav"
        if candidate.exists():
            mapping[stem] = candidate
    if not mapping:
        raise RuntimeError("demucs produced no stems")
    return mapping
