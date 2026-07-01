"""Wrapper around Demucs source separation."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable

import numpy as np
import soundfile as sf
import torch
from demucs.apply import apply_model
from demucs.audio import AudioFile
from demucs.pretrained import get_model

from ..config import logger

STEM_NAMES = ("vocals", "drums", "bass", "other")
MINUS_STEMS = ("drums", "bass", "other")


def _save_wav(tensor: torch.Tensor, path: Path, sample_rate: int) -> None:
    """Write a Demucs source tensor to WAV without torchcodec."""
    path.parent.mkdir(parents=True, exist_ok=True)
    arr = tensor.detach().cpu().numpy()
    if arr.ndim == 2:
        arr = arr.T
    sf.write(str(path), arr, sample_rate)


def mix_stems(stems: Dict[str, Path], names: Iterable[str], output_path: Path) -> Path:
    """Sum selected stem WAVs into one file (e.g. karaoke minus = no vocals)."""
    mix: np.ndarray | None = None
    sample_rate: int | None = None
    used = 0
    for name in names:
        stem_path = stems.get(name)
        if not stem_path or not stem_path.is_file():
            continue
        data, rate = sf.read(str(stem_path), always_2d=True, dtype="float32")
        if mix is None:
            mix = np.zeros_like(data)
            sample_rate = rate
        elif rate != sample_rate:
            raise RuntimeError(f"stem sample rate mismatch for {name}")
        mix += data
        used += 1
    if mix is None or sample_rate is None or used == 0:
        raise RuntimeError("no stems available to mix")
    peak = float(np.max(np.abs(mix))) or 1.0
    if peak > 1.0:
        mix = mix / peak
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(output_path), mix, sample_rate)
    return output_path


def separate(input_wav: Path, work_dir: Path, model: str = "htdemucs") -> Dict[str, Path]:
    """Run Demucs in-process and return stem name -> wav path."""
    work_dir.mkdir(parents=True, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("demucs: loading model %s on %s", model, device)

    model_obj = get_model(model)
    model_obj.to(device)
    model_obj.eval()

    wav = AudioFile(input_wav).read(
        streams=0,
        samplerate=model_obj.samplerate,
        channels=model_obj.audio_channels,
    )
    ref = wav.mean(0)
    wav = (wav - ref.mean()) / max(float(ref.std()), 1e-8)

    logger.info("demucs: separating %s", input_wav.name)
    sources = apply_model(
        model_obj,
        wav[None],
        device=device,
        shifts=1,
        split=True,
        overlap=0.25,
        progress=False,
    )[0]
    sources = sources * ref.std() + ref.mean()

    track_name = input_wav.stem
    stems_dir = work_dir / model / track_name
    stems_dir.mkdir(parents=True, exist_ok=True)

    mapping: Dict[str, Path] = {}
    for name, source in zip(model_obj.sources, sources):
        out_path = stems_dir / f"{name}.wav"
        _save_wav(source, out_path, model_obj.samplerate)
        mapping[name] = out_path

    if not mapping:
        raise RuntimeError("demucs produced no stems")
    logger.info("demucs: wrote stems %s", list(mapping.keys()))
    return mapping
