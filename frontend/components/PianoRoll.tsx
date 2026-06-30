"use client";

import { useMemo } from "react";
import type { NotePreview } from "@/lib/api";

interface Props {
  notes: NotePreview[];
  duration: number;
}

export function PianoRoll({ notes, duration }: Props) {
  const { minPitch, maxPitch, width } = useMemo(() => {
    if (!notes.length) return { minPitch: 48, maxPitch: 72, width: 600 };
    const pitches = notes.map((n) => n.pitch);
    return {
      minPitch: Math.max(0, Math.min(...pitches) - 2),
      maxPitch: Math.min(127, Math.max(...pitches) + 2),
      width: 600,
    };
  }, [notes]);

  const rows = maxPitch - minPitch + 1;
  const rowHeight = 6;
  const height = rows * rowHeight;
  const safeDuration = duration > 0 ? duration : 1;

  return (
    <div className="card p-3 overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
      >
        {Array.from({ length: rows }).map((_, i) => {
          const pitch = maxPitch - i;
          const isBlack = [1, 3, 6, 8, 10].includes(pitch % 12);
          return (
            <rect
              key={pitch}
              x={0}
              y={i * rowHeight}
              width={width}
              height={rowHeight}
              fill={isBlack ? "#11141b" : "#181c25"}
            />
          );
        })}
        {notes.map((n, idx) => {
          const x = (n.start / safeDuration) * width;
          const w = Math.max(2, ((n.end - n.start) / safeDuration) * width);
          const y = (maxPitch - n.pitch) * rowHeight;
          const opacity = 0.35 + (n.velocity / 127) * 0.65;
          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={w}
              height={rowHeight - 1}
              fill="#7c5cff"
              opacity={opacity}
              rx={1}
            />
          );
        })}
      </svg>
    </div>
  );
}
