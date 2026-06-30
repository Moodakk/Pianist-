"use client";

import type { Mode, Quantize, StemName } from "@/lib/api";

export interface SettingsState {
  mode: Mode;
  use_demucs: boolean;
  selected_stem: StemName;
  quantize: Quantize;
  min_note_duration_ms: number;
  min_velocity: number;
  transpose: number;
  estimate_tempo: boolean;
  merge_close_notes: boolean;
}

export const defaultSettings: SettingsState = {
  mode: "full",
  use_demucs: false,
  selected_stem: "original",
  quantize: "none",
  min_note_duration_ms: 80,
  min_velocity: 20,
  transpose: 0,
  estimate_tempo: true,
  merge_close_notes: false,
};

interface Props {
  value: SettingsState;
  onChange: (v: SettingsState) => void;
  disabled?: boolean;
}

export function SettingsPanel({ value, onChange, disabled }: Props) {
  const set = <K extends keyof SettingsState>(k: K, v: SettingsState[K]) =>
    onChange({ ...value, [k]: v });

  const stemDisabled = !value.use_demucs && value.mode !== "stem";

  return (
    <aside className="card p-5 space-y-4 sticky top-4">
      <h2 className="text-lg font-semibold">Conversion settings</h2>

      <div>
        <div className="field-label">Mode</div>
        <select
          className="select"
          value={value.mode}
          disabled={disabled}
          onChange={(e) => set("mode", e.target.value as Mode)}
        >
          <option value="full">Full rough MIDI</option>
          <option value="melody">Melody only</option>
          <option value="bass">Bass only</option>
          <option value="piano">Piano / instrumental</option>
          <option value="stem">Separate stems first</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.use_demucs || value.mode === "stem"}
          disabled={disabled || value.mode === "stem"}
          onChange={(e) => set("use_demucs", e.target.checked)}
        />
        Run Demucs stem separation
      </label>

      <div>
        <div className="field-label">Selected stem</div>
        <select
          className="select"
          value={value.selected_stem}
          disabled={disabled || stemDisabled}
          onChange={(e) => set("selected_stem", e.target.value as StemName)}
        >
          <option value="original">Original</option>
          <option value="vocals">Vocals</option>
          <option value="bass">Bass</option>
          <option value="drums">Drums</option>
          <option value="other">Other (instruments)</option>
        </select>
      </div>

      <div>
        <div className="field-label">Quantize</div>
        <select
          className="select"
          value={value.quantize}
          disabled={disabled}
          onChange={(e) => set("quantize", e.target.value as Quantize)}
        >
          <option value="none">None</option>
          <option value="1/16">1/16</option>
          <option value="1/8">1/8</option>
          <option value="1/4">1/4</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="field-label">Min note (ms)</div>
          <input
            className="input"
            type="number"
            min={0}
            max={2000}
            disabled={disabled}
            value={value.min_note_duration_ms}
            onChange={(e) =>
              set("min_note_duration_ms", Number(e.target.value) || 0)
            }
          />
        </div>
        <div>
          <div className="field-label">Min velocity</div>
          <input
            className="input"
            type="number"
            min={0}
            max={127}
            disabled={disabled}
            value={value.min_velocity}
            onChange={(e) => set("min_velocity", Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <div className="field-label">Transpose (semitones)</div>
          <input
            className="input"
            type="number"
            min={-24}
            max={24}
            disabled={disabled}
            value={value.transpose}
            onChange={(e) => set("transpose", Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.estimate_tempo}
          disabled={disabled}
          onChange={(e) => set("estimate_tempo", e.target.checked)}
        />
        Estimate tempo (librosa)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.merge_close_notes}
          disabled={disabled}
          onChange={(e) => set("merge_close_notes", e.target.checked)}
        />
        Merge close repeated notes
      </label>
    </aside>
  );
}
