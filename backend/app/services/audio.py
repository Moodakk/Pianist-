"""Audio I/O helpers: ffmpeg conversion + librosa analysis."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional, Tuple

from ..config import logger

TARGET_SR = 44100


def _winget_ffmpeg_candidates() -> list[Path]:
    """Common install locations when winget adds ffmpeg but PATH is stale."""
    local = os.environ.get("LOCALAPPDATA")
    if not local:
        return []
    roots = [
        Path(local) / "Microsoft" / "WinGet" / "Links" / "ffmpeg.exe",
        Path(local) / "Microsoft" / "WinGet" / "Packages",
    ]
    candidates: list[Path] = []
    links = roots[0]
    if links.is_file():
        candidates.append(links)
    packages = roots[1]
    if packages.is_dir():
        candidates.extend(sorted(packages.glob("Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe")))
    return candidates


def _ffmpeg_bin() -> str:
    env_bin = os.environ.get("AUDIO2MIDI_FFMPEG") or os.environ.get("FFMPEG_PATH")
    if env_bin and Path(env_bin).is_file():
        return env_bin

    binary = shutil.which("ffmpeg")
    if binary:
        return binary

    if sys.platform == "win32":
        for candidate in _winget_ffmpeg_candidates():
            if candidate.is_file():
                logger.info("using ffmpeg from %s", candidate)
                return str(candidate)

    raise RuntimeError(
        "ffmpeg is not installed or not on PATH. "
        "Install ffmpeg before running conversions."
    )


def to_wav(input_path: Path, output_path: Path, mono: bool = False) -> Path:
    """Convert an arbitrary audio file to 44.1 kHz WAV using ffmpeg."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        _ffmpeg_bin(),
        "-y",
        "-i", str(input_path),
        "-ar", str(TARGET_SR),
        "-ac", "1" if mono else "2",
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
        import librosa  # local import — heavy

        y, sr = librosa.load(str(wav_path), sr=None, mono=True)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo) if not hasattr(tempo, "__len__") else float(tempo[0])
        return round(bpm, 2)
    except Exception as exc:  # pragma: no cover - librosa edge cases
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
