/**
 * GenerationPromptBox — single shared prompt textarea for all workflows.
 *
 * Placeholder text varies by selected workflow to guide the user.
 * Context badges below show inherited key, scale, tempo, style.
 */

import type { GenerationWorkflow } from "./WorkflowPicker";
import type { Song, SongSection } from "@/types";
import { STYLE_WORLD_LABELS } from "@/types";

const PLACEHOLDERS: Record<GenerationWorkflow, string> = {
  quick: "e.g. Driving deep house bassline with subtle syncopation",
  guided: "Start with a rough idea — I'll help refine it",
  explore: "Describe the direction and I'll generate 3 options",
};

interface GenerationPromptBoxProps {
  value: string;
  onChange: (value: string) => void;
  workflow: GenerationWorkflow;
  song: Song;
  section: SongSection | null;
  effectiveStyle: string | null;
}

export function GenerationPromptBox({
  value,
  onChange,
  workflow,
  song,
  section,
  effectiveStyle,
}: GenerationPromptBoxProps) {
  const contextParts: string[] = [];
  if (song.key) {
    contextParts.push(`${song.key}${song.scale ? ` ${song.scale.replace("_", " ")}` : ""}`);
  }
  if (song.tempo) contextParts.push(`${song.tempo} BPM`);
  if (effectiveStyle) {
    contextParts.push(STYLE_WORLD_LABELS[effectiveStyle] || effectiveStyle);
  }
  if (section?.chord_progression?.length) {
    const chords = section.chord_progression.map((c) => `${c.root}${c.quality}`).join(" → ");
    contextParts.push(chords);
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDERS[workflow]}
        rows={2}
        className="w-full bg-input border border-border rounded px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {contextParts.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">Context:</span>
          {contextParts.map((part, i) => (
            <span
              key={i}
              className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              {part}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
