"""MIDI post-processing helpers built on top of pretty_midi."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from ..config import logger

QUANTIZE_GRID = {
    "none": None,
    "1/16": 0.25,   # in beats
    "1/8": 0.5,
    "1/4": 1.0,
}

PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


@dataclass
class CleanSettings:
    min_note_duration_ms: int = 80
    min_velocity: int = 20
    quantize: str = "none"
    transpose: int = 0
    merge_close_notes: bool = False
    bpm_hint: Optional[float] = None
    mode: str = "full"  # full|melody|bass|piano


def midi_note_name(pitch: int) -> str:
    return f"{PITCH_NAMES[pitch % 12]}{pitch // 12 - 1}"


def _filter_notes_by_mode(instruments, mode: str):
    if mode == "melody":
        for inst in instruments:
            if inst.notes:
                inst.notes.sort(key=lambda n: n.start)
                # keep highest concurrent note (rough monophonic)
                kept = []
                for note in inst.notes:
                    while kept and kept[-1].end > note.start and kept[-1].pitch < note.pitch:
                        kept.pop()
                    if not kept or kept[-1].end <= note.start or kept[-1].pitch <= note.pitch:
                        kept.append(note)
                inst.notes = kept
    elif mode == "bass":
        for inst in instruments:
            inst.notes = [n for n in inst.notes if 24 <= n.pitch <= 60]
    elif mode == "piano":
        for inst in instruments:
            inst.program = 0
            inst.is_drum = False


def _quantize_time(time_s: float, grid_s: float) -> float:
    if grid_s <= 0:
        return time_s
    return round(time_s / grid_s) * grid_s


def clean_midi(input_mid_path: Path, output_mid_path: Path, settings: CleanSettings) -> Path:
    """Apply cleanup rules and write the cleaned MIDI."""
    import pretty_midi

    pm = pretty_midi.PrettyMIDI(str(input_mid_path))

    min_dur_s = max(0.0, settings.min_note_duration_ms / 1000.0)
    grid_beats = QUANTIZE_GRID.get(settings.quantize)
    bpm = settings.bpm_hint
    if bpm is None or bpm <= 0:
        try:
            tempi = pm.get_tempo_changes()[1]
            bpm = float(tempi[0]) if len(tempi) else 120.0
        except Exception:
            bpm = 120.0
    grid_s = (60.0 / bpm) * grid_beats if grid_beats else 0.0

    for inst in pm.instruments:
        filtered = []
        for note in inst.notes:
            if note.velocity < settings.min_velocity:
                continue
            if (note.end - note.start) < min_dur_s:
                continue
            if settings.transpose:
                new_pitch = note.pitch + settings.transpose
                if 0 <= new_pitch <= 127:
                    note.pitch = new_pitch
                else:
                    continue
            if grid_s > 0:
                start_q = _quantize_time(note.start, grid_s)
                end_q = _quantize_time(note.end, grid_s)
                if end_q <= start_q:
                    end_q = start_q + grid_s
                note.start, note.end = start_q, end_q
            filtered.append(note)
        filtered.sort(key=lambda n: (n.start, n.pitch))

        if settings.merge_close_notes:
            merged = []
            for note in filtered:
                if (
                    merged
                    and merged[-1].pitch == note.pitch
                    and note.start - merged[-1].end < 0.03
                ):
                    merged[-1].end = max(merged[-1].end, note.end)
                else:
                    merged.append(note)
            filtered = merged

        inst.notes = filtered

    _filter_notes_by_mode(pm.instruments, settings.mode)

    pm.instruments = [inst for inst in pm.instruments if inst.notes]
    if not pm.instruments:
        logger.warning("clean_midi produced empty MIDI; writing empty file anyway")

    output_mid_path.parent.mkdir(parents=True, exist_ok=True)
    pm.write(str(output_mid_path))
    return output_mid_path


def summarize_midi(midi_path: Path, max_notes: int = 256):
    """Return (duration, note_count, notes_preview) for the preview endpoint."""
    import pretty_midi

    pm = pretty_midi.PrettyMIDI(str(midi_path))
    notes: List[dict] = []
    duration = 0.0
    for inst in pm.instruments:
        for note in inst.notes:
            duration = max(duration, note.end)
            if len(notes) < max_notes:
                notes.append(
                    {
                        "pitch": int(note.pitch),
                        "name": midi_note_name(int(note.pitch)),
                        "start": round(float(note.start), 4),
                        "end": round(float(note.end), 4),
                        "velocity": int(note.velocity),
                    }
                )
    total = sum(len(inst.notes) for inst in pm.instruments)
    notes.sort(key=lambda n: n["start"])
    return round(duration, 3), total, notes
