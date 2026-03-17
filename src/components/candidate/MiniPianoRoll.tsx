/**
 * MiniPianoRoll — compact SVG piano roll visualization for MIDI candidates.
 *
 * Shared between ExplorePanel and IndividualExplorePanel.
 */

import { memo } from "react";
import type { CandidateNote } from "@/types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export const LABEL_SVG_COLORS: Record<string, string> = {
  A: "#3b82f6",
  B: "#f59e0b",
  C: "#10b981",
};

export const LABEL_COLORS: Record<string, string> = {
  A: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  B: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  C: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export const LABEL_BG: Record<string, string> = {
  A: "border-blue-500/20",
  B: "border-amber-500/20",
  C: "border-emerald-500/20",
};

interface MiniPianoRollProps {
  notes: CandidateNote[];
  clipLengthBars: number;
  label: string;
  playheadBeat: number; // -1 = no playhead
}

export const MiniPianoRoll = memo(function MiniPianoRoll({
  notes,
  clipLengthBars,
  label,
  playheadBeat,
}: MiniPianoRollProps) {
  if (notes.length === 0) return null;

  const totalBeats = clipLengthBars * 4;
  const pitches = notes.map((n) => n.pitch);
  const minPitch = Math.min(...pitches) - 2;
  const maxPitch = Math.max(...pitches) + 2;
  const pitchRange = Math.max(maxPitch - minPitch, 12);

  const w = 240;
  const h = 56;
  const color = LABEL_SVG_COLORS[label] || "#3b82f6";

  const lowLabel = midiToNoteName(Math.min(...pitches));
  const highLabel = midiToNoteName(Math.max(...pitches));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14 rounded bg-background/50">
        {/* Bar lines */}
        {Array.from({ length: clipLengthBars + 1 }, (_, i) => (
          <line
            key={`bar-${i}`}
            x1={(i * 4 / totalBeats) * w}
            y1={0}
            x2={(i * 4 / totalBeats) * w}
            y2={h}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={0.5}
          />
        ))}
        {/* Beat lines (non-bar) */}
        {Array.from({ length: totalBeats }, (_, i) => {
          if (i % 4 === 0) return null;
          return (
            <line
              key={`beat-${i}`}
              x1={(i / totalBeats) * w}
              y1={0}
              x2={(i / totalBeats) * w}
              y2={h}
              stroke="currentColor"
              strokeOpacity={0.05}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Notes */}
        {notes.map((n, i) => {
          const x = (n.time / totalBeats) * w;
          const nw = Math.max((n.duration / totalBeats) * w, 1.5);
          const y = h - ((n.pitch - minPitch) / pitchRange) * h;
          const nh = Math.max(h / pitchRange, 2);
          const opacity = 0.35 + (n.velocity / 127) * 0.65;
          const isActive =
            playheadBeat >= 0 &&
            playheadBeat >= n.time &&
            playheadBeat < n.time + n.duration;
          return (
            <rect
              key={i}
              x={x}
              y={y - nh / 2}
              width={nw}
              height={nh}
              rx={0.75}
              fill={color}
              opacity={isActive ? 1 : opacity}
              stroke={isActive ? "#fff" : "none"}
              strokeWidth={isActive ? 0.5 : 0}
            />
          );
        })}

        {/* Playhead */}
        {playheadBeat >= 0 && playheadBeat <= totalBeats && (
          <line
            x1={(playheadBeat / totalBeats) * w}
            y1={0}
            x2={(playheadBeat / totalBeats) * w}
            y2={h}
            stroke="#fff"
            strokeOpacity={0.7}
            strokeWidth={1}
          />
        )}

        {/* Pitch labels */}
        <text x={2} y={h - 3} fill="currentColor" opacity={0.3} fontSize={7} fontFamily="monospace">{lowLabel}</text>
        <text x={2} y={9} fill="currentColor" opacity={0.3} fontSize={7} fontFamily="monospace">{highLabel}</text>
      </svg>

      {/* Bar numbers */}
      <div className="flex justify-between px-0.5 -mt-0.5">
        {Array.from({ length: clipLengthBars }, (_, i) => (
          <span key={i} className="text-[7px] text-muted-foreground/30 font-mono">{i + 1}</span>
        ))}
      </div>
    </div>
  );
});
