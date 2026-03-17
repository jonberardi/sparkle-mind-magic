/**
 * StyleSourceSelector — shows where generation style comes from and lets users override.
 *
 * Displays the active style inheritance chain (song → section → custom) and
 * allows the user to toggle between using inherited style or setting a custom one.
 */

import { Palette, ChevronDown } from "lucide-react";
import { STYLE_WORLD_LABELS } from "@/types";

export type StyleSourceMode = "song" | "section" | "custom";

interface StyleSourceSelectorProps {
  songStyleWorld: string | null;
  sectionStyleWorld: string | null;
  sourceMode: StyleSourceMode;
  customStyleWorld: string | null;
  onSourceModeChange: (mode: StyleSourceMode) => void;
  onCustomStyleChange: (style: string) => void;
}

const STYLE_OPTIONS = [
  "chicago_house", "detroit_techno", "bass_house", "funk",
  "house", "deep_house", "downtempo", "neo_soul",
  "lo_fi", "hip_hop", "drum_and_bass", "nu_disco",
] as const;

function getLabel(style: string | null): string {
  if (!style) return "None";
  return STYLE_WORLD_LABELS[style] || style;
}

export function StyleSourceSelector({
  songStyleWorld,
  sectionStyleWorld,
  sourceMode,
  customStyleWorld,
  onSourceModeChange,
  onCustomStyleChange,
}: StyleSourceSelectorProps) {
  // Determine the effective style for display
  const effectiveStyle =
    sourceMode === "custom"
      ? customStyleWorld
      : sourceMode === "section"
        ? sectionStyleWorld || songStyleWorld
        : songStyleWorld;

  // Only show source toggle when there is something to inherit
  const hasInheritedStyle = !!(songStyleWorld || sectionStyleWorld);
  const hasSectionOverride = !!(sectionStyleWorld && sectionStyleWorld !== songStyleWorld);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Palette size={10} className="text-muted-foreground/60" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Style</span>
      </div>

      {/* Source mode toggle */}
      <div className="flex gap-1">
        {songStyleWorld && (
          <button
            onClick={() => onSourceModeChange("song")}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
              sourceMode === "song"
                ? "bg-primary/15 text-primary font-medium"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            title={`Use the song-level style: ${getLabel(songStyleWorld)}. All generation inherits from this unless overridden.`}
          >
            Use Song Style: {getLabel(songStyleWorld)}
          </button>
        )}
        {hasSectionOverride && (
          <button
            onClick={() => onSourceModeChange("section")}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
              sourceMode === "section"
                ? "bg-primary/15 text-primary font-medium"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            title={`Use the section-level style override: ${getLabel(sectionStyleWorld)}. Overrides the song style for this section.`}
          >
            Use Section Style: {getLabel(sectionStyleWorld)}
          </button>
        )}
        <button
          onClick={() => onSourceModeChange("custom")}
          className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
            sourceMode === "custom"
              ? "bg-primary/15 text-primary font-medium"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
          title="Override the style for this generation only. Does not change the song or section style."
        >
          {sourceMode === "custom" && customStyleWorld
            ? `Custom: ${getLabel(customStyleWorld)}`
            : "Custom for this clip"}
        </button>
      </div>

      {/* Custom style selector — only when custom mode is active */}
      {sourceMode === "custom" && (
        <div className="relative">
          <select
            value={customStyleWorld || ""}
            onChange={(e) => onCustomStyleChange(e.target.value)}
            className="w-full bg-input border border-border rounded px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-6"
          >
            <option value="">Choose style...</option>
            {STYLE_OPTIONS.map((s) => (
              <option key={s} value={s}>{STYLE_WORLD_LABELS[s] || s}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {/* Effective style indicator when not in custom mode */}
      {sourceMode !== "custom" && !hasInheritedStyle && (
        <p className="text-[9px] text-muted-foreground/50 italic">
          No style set at song or section level
        </p>
      )}
    </div>
  );
}
