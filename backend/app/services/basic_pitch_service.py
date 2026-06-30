"""Wrapper around Spotify Basic Pitch."""

from __future__ import annotations

from pathlib import Path

from ..config import logger


def transcribe(input_audio: Path, output_midi: Path) -> Path:
    """Run Basic Pitch on the given audio file and write the raw MIDI."""
    output_midi.parent.mkdir(parents=True, exist_ok=True)
    logger.info("basic_pitch: %s -> %s", input_audio, output_midi)

    # Lazy import — basic_pitch pulls TensorFlow which is heavy.
    from basic_pitch.inference import predict
    from basic_pitch import ICASSP_2022_MODEL_PATH

    _model_output, midi_data, _note_events = predict(
        str(input_audio),
        ICASSP_2022_MODEL_PATH,
    )
    midi_data.write(str(output_midi))
    return output_midi
