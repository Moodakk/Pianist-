"use client";

import { useCallback, useRef, useState } from "react";

const ACCEPT = ".mp3,.wav,.flac,.m4a";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFile, disabled }: Props) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFile(files[0]);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={
        "card cursor-pointer flex flex-col items-center justify-center text-center p-10 transition border-dashed " +
        (hover ? "border-accent-500 bg-ink-700/60" : "") +
        (disabled ? " opacity-50 pointer-events-none" : "")
      }
      style={{ borderWidth: 2, borderStyle: "dashed" }}
    >
      <div className="text-3xl mb-2">↥</div>
      <div className="font-medium">Drop audio file here, or click to choose</div>
      <div className="text-sm text-zinc-400 mt-1">
        Accepted: .mp3 .wav .flac .m4a
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
