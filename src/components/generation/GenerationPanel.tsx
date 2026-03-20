/**
 * GenerationPanel — workflow-first track/clip generation experience.
 *
 * Replaces TrackGenerationWizard. The user's primary decision is how they
 * want to work (Quick / Guided / Explore), not which fields to fill in.
 *
 * Active workflows:
 *   - Quick Generate: sends prompt to agent → Ableton
 *   - Explore Ideas: candidate comparison via ExplorePanel
 *   - Refine with AI: intentional placeholder (M3)
 *
 * Migration note: this component is currently used only in SongView.
 * ChatView and other entry points retain their existing generation
 * surfaces until M2-M4 extend the new flow to all contexts.
 */

import { useState, useEffect, useCallback } from "react";
import { Wand2, Layers } from "lucide-react";
import type { Song, SongSection } from "@/types";
import { STYLE_WORLD_LABELS } from "@/types";
import { WorkflowPicker, type GenerationWorkflow } from "./WorkflowPicker";
import { GenerationControls, type ControlValues, type OutputTarget } from "./GenerationControls";
import { GenerationPromptBox } from "./GenerationPromptBox";
import { IntentSummary } from "./IntentSummary";
import { ExplorePanel } from "../ExplorePanel";
import type { ExploreSentSummary } from "../ExplorePanel";
import type { StyleSourceMode } from "./StyleSourceSelector";
import { getRoleFamily } from "./refinementSchemas";

// ── Props ──

interface GenerationPanelProps {
  section: SongSection | null;
  song: Song;
  onGenerate: (prompt: string) => void;
  disabled: boolean;
  onExploreComplete?: (summary?: ExploreSentSummary) => void;
}

// ── Default values ──

const DEFAULT_CONTROLS: ControlValues = {
  role: "",
  destination: "new_track",
  clipCount: 1,
  styleSourceMode: "song",
  customStyleWorld: "",
  // Shared
  groove: "",
  feel: "",
  density: "",
  energy: "",
  // Melodic
  motion: "",
  voicing: "",
  phraseBehavior: "",
  articulation: "",
  brightness: "",
  harmonicTension: "",
  // Drums
  pulse: "",
  kickBehavior: "",
  backbeat: "",
  hatCymbal: "",
  phraseEvolution: "",
  ornamentation: "",
  kitCharacter: "",
  // Shared advanced
  humanize: "",
};

// ── Prompt builder ──

function buildGenerationPrompt(
  workflow: GenerationWorkflow,
  controls: ControlValues,
  prompt: string,
  song: Song,
  section: SongSection | null,
  effectiveStyle: string | null,
): string {
  const parts: string[] = [];

  // Destination
  if (controls.destination === "new_track") {
    parts.push("Create a new track.");
  } else {
    parts.push(`Add to existing track "${controls.destination.trackName}" (track_id=${controls.destination.trackId}).`);
  }

  // Role
  if (controls.role) {
    parts.push(`Role: ${controls.role}.`);
  }

  // Clip count
  if (controls.clipCount > 1) {
    parts.push(`Generate ${controls.clipCount} clip variations (each in a separate scene slot on the same track).`);
  }

  // Style context — explicitly name the source
  if (effectiveStyle) {
    const label = STYLE_WORLD_LABELS[effectiveStyle] || effectiveStyle;
    const source =
      controls.styleSourceMode === "song" ? "song-level" :
      controls.styleSourceMode === "section" ? "section-level" :
      "custom";
    parts.push(`Style: ${label} (${source}).`);
  }

  // Refinements — role-appropriate language
  const family = getRoleFamily(controls.role);

  // Shared refinements
  if (controls.groove) parts.push(`Groove: ${controls.groove}.`);
  if (controls.feel) parts.push(`Feel: ${controls.feel}.`);
  if (controls.density) parts.push(`Density: ${controls.density}.`);
  if (controls.energy) parts.push(`Energy: ${controls.energy}.`);

  if (family === "drums") {
    // Drum-specific refinements
    if (controls.pulse) parts.push(`Pulse: ${controls.pulse}.`);
    if (controls.kickBehavior) parts.push(`Kick: ${controls.kickBehavior}.`);
    if (controls.backbeat) parts.push(`Backbeat: ${controls.backbeat}.`);
    if (controls.hatCymbal) parts.push(`Hats/cymbals: ${controls.hatCymbal.replace(/-/g, " ")}.`);
    // Drum advanced
    if (controls.phraseEvolution) parts.push(`Phrase evolution: ${controls.phraseEvolution.replace(/-/g, " ")}.`);
    if (controls.ornamentation) parts.push(`Ornamentation: ${controls.ornamentation.replace(/-/g, " ")}.`);
    if (controls.kitCharacter) parts.push(`Kit character: ${controls.kitCharacter}.`);
  } else {
    // Melodic/harmonic refinements
    if (controls.motion) parts.push(`Motion: ${controls.motion}.`);
    if (controls.voicing) parts.push(`Voicing: ${controls.voicing}.`);
    if (controls.phraseBehavior) parts.push(`Phrase: ${controls.phraseBehavior.replace("_", " & ")}.`);
    // Melodic advanced
    if (controls.articulation) parts.push(`Articulation: ${controls.articulation}.`);
    if (controls.brightness) parts.push(`Brightness: ${controls.brightness}.`);
    if (controls.harmonicTension) parts.push(`Harmonic tension: ${controls.harmonicTension}.`);
  }

  // Shared advanced
  if (controls.humanize && controls.humanize !== "none") parts.push(`Humanization: ${controls.humanize}.`);

  // User's freeform prompt — always last for emphasis
  if (prompt.trim()) {
    parts.push(`— ${prompt.trim()}`);
  }

  return parts.join(" ");
}

// ── Component ──

export function GenerationPanel({
  section,
  song,
  onGenerate,
  disabled,
  onExploreComplete,
}: GenerationPanelProps) {
  const [workflow, setWorkflow] = useState<GenerationWorkflow>("quick");
  const [prompt, setPrompt] = useState("");
  const [controls, setControls] = useState<ControlValues>({ ...DEFAULT_CONTROLS });
  const [showExplore, setShowExplore] = useState(false);

  // Auto-select style source mode based on available data
  useEffect(() => {
    if (section?.style_world && section.style_world !== song.style_world) {
      setControls((prev) => ({ ...prev, styleSourceMode: "section" as StyleSourceMode }));
    } else if (song.style_world) {
      setControls((prev) => ({ ...prev, styleSourceMode: "song" as StyleSourceMode }));
    }
  }, [song.style_world, section?.style_world]);

  const handleControlChange = useCallback((key: keyof ControlValues, value: any) => {
    setControls((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Resolve effective style based on source mode
  const effectiveStyle =
    controls.styleSourceMode === "custom"
      ? controls.customStyleWorld || null
      : controls.styleSourceMode === "section"
        ? section?.style_world || song.style_world
        : song.style_world;

  const fullPrompt = buildGenerationPrompt(
    workflow, controls, prompt, song, section, effectiveStyle,
  );

  const canGenerate = !disabled && (prompt.trim() || controls.role);

  const handleGenerate = () => {
    if (!canGenerate) return;
    if (workflow === "explore") {
      setShowExplore(true);
      return;
    }
    onGenerate(fullPrompt);
    setPrompt("");
  };

  const clearAll = () => {
    setControls({ ...DEFAULT_CONTROLS });
    setPrompt("");
  };

  const hasAnySelection = Object.entries(controls).some(
    ([key, val]) => key !== "destination" && key !== "styleSourceMode" && key !== "clipCount" && val !== "" && val !== "new_track"
  ) || controls.clipCount > 1;

  // Cmd+Enter shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (canGenerate) handleGenerate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canGenerate, workflow, fullPrompt]);

  // No section selected state
  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <Wand2 className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">Select a section to start generating</p>
      </div>
    );
  }

  // Explore Ideas — full-panel candidate comparison
  if (showExplore) {
    return (
      <ExplorePanel
        song={song}
        section={section}
        prompt={fullPrompt}
        role={controls.role || undefined}
        onClose={() => {
          setShowExplore(false);
          setPrompt("");
        }}
        onSent={(summary) => {
          // Report the send for clip list refresh, but keep explore panel open
          onExploreComplete?.(summary);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-xs font-semibold text-foreground">Generate</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {section.name} · {section.length_bars} bars
          {song.key ? ` · ${song.key}` : ""}
          {song.tempo ? ` · ${song.tempo} BPM` : ""}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Step 1: How do you want to work? */}
        <WorkflowPicker selected={workflow} onChange={setWorkflow} />

        {/* Step 2: Prompt */}
        <GenerationPromptBox
          value={prompt}
          onChange={setPrompt}
          workflow={workflow}
          song={song}
          section={section}
          effectiveStyle={effectiveStyle}
        />

        {/* Step 3: Controls (Basics / Refinements / Advanced) */}
        <GenerationControls
          song={song}
          section={section}
          values={controls}
          onChange={handleControlChange}
          workflow={workflow}
        />

        {/* Intent Summary */}
        <IntentSummary
          role={controls.role}
          section={section}
          destination={controls.destination}
          styleSourceMode={controls.styleSourceMode}
          effectiveStyle={effectiveStyle}
          groove={controls.groove}
          feel={controls.feel}
          density={controls.density}
          energy={controls.energy}
          motion={controls.motion}
          voicing={controls.voicing}
          phraseBehavior={controls.phraseBehavior}
          articulation={controls.articulation}
          brightness={controls.brightness}
          harmonicTension={controls.harmonicTension}
          pulse={controls.pulse}
          kickBehavior={controls.kickBehavior}
          backbeat={controls.backbeat}
          hatCymbal={controls.hatCymbal}
          phraseEvolution={controls.phraseEvolution}
          ornamentation={controls.ornamentation}
          kitCharacter={controls.kitCharacter}
          humanize={controls.humanize}
        />

      </div>

      {/* Generate button — pinned to bottom */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Generate (⌘Enter)"
        >
          {workflow === "explore" ? <Layers size={14} /> : <Wand2 size={14} />}
          {workflow === "explore" ? "Explore Ideas" : "Quick Generate"}
        </button>
        {(hasAnySelection || prompt) && (
          <button
            onClick={clearAll}
            className="w-full mt-1.5 text-[10px] text-muted-foreground hover:text-foreground text-center transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
