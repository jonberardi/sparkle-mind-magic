/**
 * GenerationControls — three-tier progressive disclosure for musical parameters.
 *
 * Basics:       Role, Section, Destination, Style Source (always visible)
 * Refinements:  Groove, Motion, Harmony/Voicing, Phrase, Feel, Density, Energy (expandable)
 * Advanced:     Register, Articulation, Humanize, Brightness, Harmonic Tension (collapsed)
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import type { Song, SongSection } from "@/types";
import { TRACK_ROLES, HUMANIZE_PRESETS } from "@/types";
import type { GenerationWorkflow } from "./WorkflowPicker";
import { useSessionStore } from "@/stores/sessionStore";
import { StyleSourceSelector, type StyleSourceMode } from "./StyleSourceSelector";
import { API_BASE } from "@/lib/api";

// ── Option definitions ──

const ROLE_OPTIONS = TRACK_ROLES.map((r) => ({
  value: r,
  label: r === "arp" ? "Arp" : r.charAt(0).toUpperCase() + r.slice(1),
}));

const GROOVE_OPTIONS = [
  { value: "straight", label: "Straight" },
  { value: "syncopated", label: "Syncopated" },
  { value: "swung", label: "Swung" },
  { value: "broken", label: "Broken" },
] as const;

const MOTION_OPTIONS = [
  { value: "chordal", label: "Chordal" },
  { value: "stepwise", label: "Stepwise" },
  { value: "arpeggiated", label: "Arpeggiated" },
  { value: "static", label: "Static" },
  { value: "leaping", label: "Leaping" },
] as const;

const VOICING_OPTIONS = [
  { value: "close", label: "Close" },
  { value: "spread", label: "Spread" },
  { value: "drop2", label: "Drop 2" },
  { value: "shell", label: "Shell" },
  { value: "rootless", label: "Rootless" },
  { value: "open", label: "Open" },
] as const;

const PHRASE_OPTIONS = [
  { value: "repetitive", label: "Repetitive" },
  { value: "evolving", label: "Evolving" },
  { value: "call_response", label: "Call & Response" },
  { value: "building", label: "Building" },
] as const;

const FEEL_OPTIONS = [
  { value: "tight", label: "Tight" },
  { value: "natural", label: "Natural" },
  { value: "loose", label: "Loose" },
  { value: "soulful", label: "Soulful" },
] as const;

const DENSITY_OPTIONS = [
  { value: "sparse", label: "Sparse" },
  { value: "moderate", label: "Moderate" },
  { value: "busy", label: "Busy" },
  { value: "dense", label: "Dense" },
] as const;

const ENERGY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const BRIGHTNESS_OPTIONS = [
  { value: "dark", label: "Dark" },
  { value: "neutral", label: "Neutral" },
  { value: "bright", label: "Bright" },
] as const;

const TENSION_OPTIONS = [
  { value: "consonant", label: "Consonant" },
  { value: "moderate", label: "Moderate" },
  { value: "tense", label: "Tense" },
] as const;

const ARTICULATION_OPTIONS = [
  { value: "legato", label: "Legato" },
  { value: "staccato", label: "Staccato" },
  { value: "percussive", label: "Percussive" },
] as const;

// ── Tooltips ──

const TOOLTIPS: Record<string, string> = {
  // Groove
  straight: "Even, on-the-grid rhythm with no swing or syncopation.",
  syncopated: "Emphasizes off-beats for a more groove-driven, less straight feel.",
  swung: "Shifts notes slightly late for a triplet-influenced shuffle feel.",
  broken: "Irregular, fragmented rhythmic patterns with intentional gaps and surprises.",
  // Motion
  chordal: "Plays full chord shapes, moving them as blocks.",
  stepwise: "Notes move by small intervals — smooth, melodic motion.",
  arpeggiated: "Chord tones played one at a time in sequence.",
  static: "Stays on one note or chord — creates tension through repetition.",
  leaping: "Wide interval jumps between notes — more dramatic and angular.",
  // Voicing
  close: "Notes clustered within an octave — dense, focused sound.",
  spread: "Notes spaced across multiple octaves — wide, open feel.",
  drop2: "Second-highest note dropped an octave — common in jazz, warm and full.",
  shell: "Root plus 3rd and 7th only — lean, essential harmony.",
  rootless: "Omits the root for a lighter, jazzier feel. Lets bass define the root.",
  open: "Wide spacing between individual notes — airy, spacious voicings.",
  // Phrase
  repetitive: "Same pattern loops with minimal variation — hypnotic, driving.",
  evolving: "Gradually transforms across the phrase — keeps things moving.",
  call_response: "Two alternating musical ideas — conversational, dynamic.",
  building: "Increases in intensity, density, or motion across the phrase.",
  // Feel
  tight: "Precise timing, locked to the grid — mechanical, punchy.",
  natural: "Slight human variation in timing and velocity — organic.",
  loose: "Relaxed timing, notes sit slightly off-grid — laid-back.",
  soulful: "Expressive timing and velocity — notes sit behind the beat with feeling.",
  // Density
  sparse: "Few notes with lots of space — breathing room, minimal.",
  moderate: "Balanced note density — neither busy nor empty.",
  busy: "Active, many notes — keeps the ear engaged.",
  dense: "Saturated, continuous notes — thick, full texture.",
  // Energy
  low: "Calm, subdued energy — good for intros, breakdowns, ambient sections.",
  medium: "Balanced energy — works for verses, transitions.",
  high: "Intense, driving energy — choruses, drops, peak moments.",
  // Articulation
  legato: "Smooth, connected notes — flowing, sustained.",
  staccato: "Short, detached notes — punchy, rhythmic.",
  percussive: "Sharp attack on each note — aggressive, hits hard.",
  // Brightness
  dark: "Favors lower frequencies and mellower tones.",
  neutral: "Balanced frequency range — no strong bias.",
  bright: "Emphasizes higher frequencies — more presence and sparkle.",
  // Harmonic Tension
  consonant: "Stable, resolved harmonies — pleasant, settled.",
  // "moderate" already defined above for density — tension context handled by label
  tense: "Dissonant, unresolved harmonies — creates pull and suspense.",
  // Humanization
  none: "No timing or velocity variation — fully quantized.",
  // tight already defined above
  // natural already defined above
  // loose already defined above
  drunk: "Heavy timing drift — stumbling, unsteady feel.",
  // soulful already defined above
};

// ── Types ──

export type OutputTarget = "new_track" | { trackId: number; trackName: string };

export interface ControlValues {
  role: string;
  destination: OutputTarget;
  clipCount: number;
  styleSourceMode: StyleSourceMode;
  customStyleWorld: string;
  // Refinements
  groove: string;
  motion: string;
  voicing: string;
  phraseBehavior: string;
  feel: string;
  density: string;
  energy: string;
  // Advanced
  articulation: string;
  humanize: string;
  brightness: string;
  harmonicTension: string;
}

interface GenerationControlsProps {
  song: Song;
  section: SongSection | null;
  values: ControlValues;
  onChange: (key: keyof ControlValues, value: any) => void;
  workflow?: GenerationWorkflow;
}

// ── Chip selector helper ──

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? "" : opt.value)}
          title={TOOLTIPS[opt.value] || undefined}
          className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const CATEGORY_TOOLTIPS: Record<string, string> = {
  "Role": "What instrument or part this track plays in the arrangement.",
  "Groove": "How the rhythm is structured — straight, swung, syncopated, or broken.",
  "Motion": "How notes move from one to the next — by step, leap, chord, or arpeggio.",
  "Voicing": "How chord notes are spaced and arranged vertically.",
  "Phrase": "How the musical idea develops across bars — repeating, building, evolving.",
  "Feel": "How tight or loose the timing feels — from mechanical to expressive.",
  "Density": "How many notes fill the space — from sparse to saturated.",
  "Energy": "Overall intensity level of the generated part.",
  "Articulation": "How individual notes are attacked and sustained.",
  "Brightness": "Tonal character — dark and mellow vs bright and present.",
  "Harmonic Tension": "How stable or unresolved the harmonies feel.",
  "Humanization": "Amount of natural timing and velocity variation applied.",
};

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span
        className="text-[9px] text-muted-foreground/70 uppercase tracking-wider"
        title={CATEGORY_TOOLTIPS[label] || undefined}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// ── Component ──

export function GenerationControls({
  song,
  section,
  values,
  onChange,
  workflow,
}: GenerationControlsProps) {
  const [showRefinements, setShowRefinements] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const midiTracks = session?.tracks.filter((t) => t.type === "midi") ?? [];

  const refreshTracks = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/session/live`);
      if (res.ok) setSession(await res.json());
    } catch { /* silent */ }
    setRefreshing(false);
  };

  // Count active refinements for the toggle label
  const refinementCount = [
    values.groove, values.motion, values.voicing,
    values.phraseBehavior, values.feel, values.density, values.energy,
  ].filter(Boolean).length;

  const advancedCount = [
    values.articulation, values.humanize, values.brightness, values.harmonicTension,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* ── BASICS (always visible) ── */}

      {/* Role */}
      <ControlRow label="Role">
        <ChipGroup
          options={ROLE_OPTIONS}
          value={values.role}
          onChange={(v) => onChange("role", v)}
        />
      </ControlRow>

      {/* Section indicator */}
      {section && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-muted-foreground/70 uppercase tracking-wider text-[9px]">Section</span>
          <span className="text-foreground font-medium">{section.name}</span>
          <span className="text-muted-foreground">{section.length_bars} bars</span>
          {section.chord_progression && section.chord_progression.length > 0 && (
            <span className="text-primary/70 font-mono text-[9px] truncate">
              {section.chord_progression.map((c) => `${c.root}${c.quality}`).join(" → ")}
            </span>
          )}
        </div>
      )}

      {/* Destination */}
      <ControlRow label="Destination">
        <div className="flex items-center gap-2">
          <select
            value={values.destination === "new_track" ? "new_track" : String(values.destination.trackId)}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "new_track") {
                onChange("destination", "new_track");
              } else {
                const track = midiTracks.find((t) => t.id === Number(val));
                if (track) onChange("destination", { trackId: track.id, trackName: track.name });
              }
            }}
            className="flex-1 bg-input border border-border rounded px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="new_track">+ New track</option>
            {midiTracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={refreshTracks}
            disabled={refreshing}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="Refresh track list"
          >
            <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </ControlRow>

      {/* Clip Count — hidden for Explore (always generates 3 candidates) */}
      {workflow !== "explore" && (
        <ControlRow label="Clips">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => onChange("clipCount", n)}
                className={`w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded transition-colors ${
                  values.clipCount === n
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
            <span className="text-[9px] text-muted-foreground ml-1">variations</span>
          </div>
        </ControlRow>
      )}

      {/* Style Source */}
      <StyleSourceSelector
        songStyleWorld={song.style_world}
        sectionStyleWorld={section?.style_world || null}
        sourceMode={values.styleSourceMode}
        customStyleWorld={values.customStyleWorld}
        onSourceModeChange={(mode) => onChange("styleSourceMode", mode)}
        onCustomStyleChange={(style) => onChange("customStyleWorld", style)}
      />

      {/* ── REFINEMENTS (expandable) ── */}
      <button
        onClick={() => setShowRefinements(!showRefinements)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {showRefinements ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        <span>Refinements</span>
        {refinementCount > 0 && !showRefinements && (
          <span className="text-[9px] text-primary ml-1">({refinementCount} set)</span>
        )}
      </button>

      {showRefinements && (
        <div className="space-y-2.5 pl-1 border-l-2 border-border/50 ml-1">
          <ControlRow label="Groove">
            <ChipGroup options={GROOVE_OPTIONS} value={values.groove} onChange={(v) => onChange("groove", v)} />
          </ControlRow>
          <ControlRow label="Motion">
            <ChipGroup options={MOTION_OPTIONS} value={values.motion} onChange={(v) => onChange("motion", v)} />
          </ControlRow>
          <ControlRow label="Voicing">
            <ChipGroup options={VOICING_OPTIONS} value={values.voicing} onChange={(v) => onChange("voicing", v)} />
          </ControlRow>
          <ControlRow label="Phrase">
            <ChipGroup options={PHRASE_OPTIONS} value={values.phraseBehavior} onChange={(v) => onChange("phraseBehavior", v)} />
          </ControlRow>
          <ControlRow label="Feel">
            <ChipGroup options={FEEL_OPTIONS} value={values.feel} onChange={(v) => onChange("feel", v)} />
          </ControlRow>
          <ControlRow label="Density">
            <ChipGroup options={DENSITY_OPTIONS} value={values.density} onChange={(v) => onChange("density", v)} />
          </ControlRow>
          <ControlRow label="Energy">
            <ChipGroup options={ENERGY_OPTIONS} value={values.energy} onChange={(v) => onChange("energy", v)} />
          </ControlRow>
        </div>
      )}

      {/* ── ADVANCED (collapsed) ── */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {showAdvanced ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        <span>Advanced</span>
        {advancedCount > 0 && !showAdvanced && (
          <span className="text-[9px] text-primary ml-1">({advancedCount} set)</span>
        )}
      </button>

      {showAdvanced && (
        <div className="space-y-2.5 pl-1 border-l-2 border-border/50 ml-1">
          <ControlRow label="Articulation">
            <ChipGroup options={ARTICULATION_OPTIONS} value={values.articulation} onChange={(v) => onChange("articulation", v)} />
          </ControlRow>
          <ControlRow label="Brightness">
            <ChipGroup options={BRIGHTNESS_OPTIONS} value={values.brightness} onChange={(v) => onChange("brightness", v)} />
          </ControlRow>
          <ControlRow label="Harmonic Tension">
            <ChipGroup options={TENSION_OPTIONS} value={values.harmonicTension} onChange={(v) => onChange("harmonicTension", v)} />
          </ControlRow>
          <ControlRow label="Humanization">
            <ChipGroup
              options={HUMANIZE_PRESETS.map((h) => ({ value: h, label: h.charAt(0).toUpperCase() + h.slice(1) }))}
              value={values.humanize}
              onChange={(v) => onChange("humanize", v)}
            />
          </ControlRow>
        </div>
      )}
    </div>
  );
}
