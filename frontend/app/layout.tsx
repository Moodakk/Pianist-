import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Audio to MIDI Converter",
  description: "Upload audio, get an editable MIDI sketch back.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <header className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-500 flex items-center justify-center font-bold">
                A2M
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">
                  Audio to MIDI Converter
                </h1>
                <p className="text-xs text-zinc-400">
                  MP3 / WAV / FLAC / M4A → MIDI sketch
                </p>
              </div>
            </Link>
            <nav className="flex gap-2 text-sm">
              <Link className="btn btn-ghost" href="/">
                Convert
              </Link>
              <Link className="btn btn-ghost" href="/history">
                History
              </Link>
            </nav>
          </header>
          {children}
          <footer className="mt-12 text-xs text-zinc-500">
            Audio-to-MIDI transcription is approximate. Complex full songs may need
            manual cleanup in your DAW.
          </footer>
        </div>
      </body>
    </html>
  );
}
