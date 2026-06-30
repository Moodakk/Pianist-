"""ffmpeg normalization to WAV."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Optional, Tuple

from ..config import logger

TARGET_SR = 44100


def _ffmpeg_bin() -> str:
    binary = shutil.which("ffmpeg")
    if not binary:
        raise RuntimeError(
            "ffmpeg is not installed or not on PATH. "
            "Install ffmpeg before running conversions."
        )
    return binary


def to_wav(input_path: Path, output_path: Path, mono: bool = False) -> Path:
    """Convert an arbitrary audio file to 44.1 kHz WAV using ffmpeg."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        _ffmpeg_bin(),
        "-y",
        "-i",
        str(input_path),
        "-ar",
        str(TARGET_SR),
        "-ac",
        "1" if mono else "2",
        "-vn",
        str(output_path),
    ]
    logger.info("ffmpeg: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("ffmpeg stderr: %s", result.stderr)
        raise RuntimeError(f"ffmpeg failed: {result.stderr.strip()[-300:]}")
    return output_path


def estimate_tempo(wav_path: Path) -> Optional[float]:
    """Return an estimated BPM using librosa, or None on failure."""
    try:
        import librosa

        y, sr = librosa.load(str(wav_path), sr=None, mono=True)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo) if not hasattr(tempo, "__len__") else float(tempo[0])
        return round(bpm, 2)
    except Exception as exc:
        logger.warning("tempo estimation failed: %s", exc)
        return None


def duration_seconds(wav_path: Path) -> float:
    try:
        import soundfile as sf

        info = sf.info(str(wav_path))
        return float(info.frames) / float(info.samplerate)
    except Exception:
        return 0.0


def safe_filename(name: str) -> str:
    keep = "-_.()[]"
    cleaned = "".join(c if c.isalnum() or c in keep else "_" for c in name)
    return cleaned[:120] or "audio"


def split_basename(path: Path) -> Tuple[str, str]:
    return path.stem, path.suffix.lower()
