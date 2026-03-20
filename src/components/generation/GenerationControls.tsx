/**
 * GenerationControls — three-tier progressive disclosure for musical parameters.
 *
 * Basics:       Role, Section, Destination, Style Source (always visible)
 * Refinements:  Schema-driven per role family (expandable)
 * Advanced:     Schema-driven per role family (collapsed)
 *
 * The refinement and advanced tiers swap dynamically based on the selected
 * role's family (melodic vs drums) using schemas from refinementSchemas.ts.
 */

import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import type { Song, SongSection } from "@/types";
import { TRACK_ROLES } from "@/types";
import type { GenerationWorkflow } from "./WorkflowPicker";
import { useSessionStore } from "@/stores/sessionStore";
import { StyleSourceSelector, type StyleSourceMode } from "./StyleSourceSelector";
import { API_BASE } from "@/lib/api";
import {
  getSchemaForRole,
  getFieldsToClear,
  type RefinementField,
} from "./refinementSchemas";

// ── Option definitions ──

const ROLE_OPTIONS = TRACK_ROLES.map((r) => ({
  value: r,
  label: r === "arp" ? "Arp" : r.charAt(0).toUpperCase() + r.slice(1),
}));

// ── Tooltips (option-level, shared across schemas) ──

const TOOLTIPS: Record<string, string> = {
  // Groove (shared)
  straight: "Even, on-the-grid rhythm with no swing or syncopation.",
  syncopated: "Emphasizes off-beats for a more groove-driven, less straight feel.",
  swung: "Shifts notes slightly late for a triplet-influenced shuffle feel.",
  broken: "Irregular, fragmented rhythmic patterns with intentional gaps and surprises.",
  rolling: "Continuous, flowing rhythmic motion — toms, ghost notes, or rapid hats.",
  // Motion (melodic)
  chordal: "Plays full chord shapes, moving them as blocks.",
  stepwise: "Notes move by small intervals — smooth, melodic motion.",
  arpeggiated: "Chord tones played one at a time in sequence.",
  static: "Stays on one note or chord — creates tension through repetition.",
  leaping: "Wide interval jumps between notes — more dramatic and angular.",
  // Voicing (melodic)
  close: "Notes clustered within an octave — dense, focused sound.",
  spread: "Notes spaced across multiple octaves — wide, open feel.",
  drop2: "Second-highest note dropped an octave — common in jazz, warm and full.",
  shell: "Root plus 3rd and 7th only — lean, essential harmony.",
  rootless: "Omits the root for a lighter, jazzier feel. Lets bass define the root.",
  open: "Wide spacing between individual notes — airy, spacious voicings.",
  // Phrase (melodic)
  repetitive: "Same pattern loops with minimal variation — hypnotic, driving.",
  evolving: "Gradually transforms across the phrase — keeps things moving.",
  call_response: "Two alternating musical ideas — conversational, dynamic.",
  building: "Increases in intensity, density, or motion across the phrase.",
  // Feel (shared)
  tight: "Precise timing, locked to the grid — mechanical, punchy.",
  natural: "Slight human variation in timing and velocity — organic.",
  loose: "Relaxed timing, notes sit slightly off-grid — laid-back.",
  soulful: "Expressive timing and velocity — notes sit behind the beat with feeling.",
  // Density (shared)
  sparse: "Few notes with lots of space — breathing room, minimal.",
  moderate: "Balanced note density — neither busy nor empty.",
  busy: "Active, many notes — keeps the ear engaged.",
  dense: "Saturated, continuous notes — thick, full texture.",
  // Energy (shared)
  low: "Calm, subdued energy — good for intros, breakdowns, ambient sections.",
  medium: "Balanced energy — works for verses, transitions.",
  high: "Intense, driving energy — choruses, drops, peak moments.",
  // Articulation (melodic)
  legato: "Smooth, connected notes — flowing, sustained.",
  staccato: "Short, detached notes — punchy, rhythmic.",
  percussive: "Sharp attack on each note — aggressive, hits hard.",
  // Brightness (melodic)
  dark: "Favors lower frequencies and mellower tones.",
  neutral: "Balanced frequency range — no strong bias.",
  bright: "Emphasizes higher frequencies — more presence and sparkle.",
  // Harmonic Tension (melodic)
  consonant: "Stable, resolved harmonies — pleasant, settled.",
  tense: "Dissonant, unresolved harmonies — creates pull and suspense.",
  // Humanization (shared)
  none: "No timing or velocity variation — fully quantized.",
  drunk: "Heavy timing drift — stumbling, unsteady feel.",
  // Pulse (drums)
  "8th-driven": "Primary subdivision is 8th notes — driving, open.",
  "16th-driven": "Primary subdivision is 16th notes — detailed, busy.",
  mixed: "Mix of subdivisions — 8ths and 16ths where needed.",
  // Kick (drums)
  anchored: "Kick on strong beats — solid foundation, predictable.",
  driving: "Steady, insistent kick — four-on-the-floor or double time.",
  // Backbeat (drums)
  solid: "Strong, consistent snare on 2 and 4 — classic backbeat.",
  light: "Lighter snare hits — more delicate, less aggressive.",
  ghosted: "Heavy use of ghost notes — soft, nuanced, groove-forward.",
  displaced: "Snare shifted off the expected beats — creates tension.",
  minimal: "Very few snare hits — sparse, spacious.",
  // Hat/Cymbal (drums)
  "steady-hats": "Consistent hi-hat pattern — steady pulse, reliable.",
  "accented-hats": "Hi-hats with dynamic accents — more expressive.",
  "open-hat-lifts": "Open hi-hat on upbeats or transitions — adds breath.",
  "ride-led": "Ride cymbal carries the pattern instead of hats.",
  textural: "Percussion and cymbal washes — ambient, less defined.",
  // Phrase Evolution (drums)
  "2-bar-response": "Pattern answers itself every 2 bars — conversational.",
  "4-bar-lift": "Builds toward a peak every 4 bars — tension and release.",
  "fill-heavy": "Frequent fills and transitions — dramatic, active.",
  // Ornamentation (drums)
  "subtle-ghosts": "Light ghost notes for texture — subtle groove enhancement.",
  "medium-detail": "Moderate ghost notes and accents — balanced detail.",
  "busy-detail": "Heavy ornamentation — ghost notes, flams, drags throughout.",
  // Kit/Tone (drums)
  dry: "Tight, unprocessed drum sound — no room, no reverb.",
  warm: "Round, full-bodied drum tone — vintage, analog feel.",
  crisp: "Clean, defined transients — modern, clear.",
  dusty: "Lo-fi, slightly degraded — SP-1200, tape saturation.",
  punchy: "Strong transient attack — cuts through the mix.",
  electronic: "Synthesized drum sounds — 808s, 909s, digital.",
  hybrid: "Mix of acoustic and electronic elements.",
  organic: "Natural, acoustic drum character — room mics, wood.",
};

// ── Types ──

export type OutputTarget = "new_track" | { trackId: number; trackName: string };

export interface ControlValues {
  role: string;
  destination: OutputTarget;
  clipCount: number;
  styleSourceMode: StyleSourceMode;
  customStyleWorld: string;
  // Shared refinements
  groove: string;
  feel: string;
  density: string;
  energy: string;
  // Melodic refinements
  motion: string;
  voicing: string;
  phraseBehavior: string;
  // Melodic advanced
  articulation: string;
  brightness: string;
  harmonicTension: string;
  // Drum refinements
  pulse: string;
  kickBehavior: string;
  backbeat: string;
  hatCymbal: string;
  // Drum advanced
  phraseEvolution: string;
  ornamentation: string;
  kitCharacter: string;
  // Shared advanced
  humanize: string;
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

function ControlRow({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span
        className="text-[9px] text-muted-foreground/70 uppercase tracking-wider"
        title={tooltip || undefined}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// ── Schema-driven field renderer ──

function SchemaFields({
  fields,
  values,
  onChange,
}: {
  fields: readonly RefinementField[];
  values: ControlValues;
  onChange: (key: keyof ControlValues, value: any) => void;
}) {
  return (
    <>
      {fields.map((field) => (
        <ControlRow key={field.key} label={field.label} tooltip={field.categoryTooltip}>
          <ChipGroup
            options={field.options}
            value={(values as any)[field.key] || ""}
            onChange={(v) => onChange(field.key as keyof ControlValues, v)}
          />
        </ControlRow>
      ))}
    </>
  );
}

// ── Props ──

interface GenerationControlsProps {
  song: Song;
  section: SongSection | null;
  values: ControlValues;
  onChange: (key: keyof ControlValues, value: any) => void;
  workflow?: GenerationWorkflow;
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
  const prevRoleRef = useRef(values.role);

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

  // Get active schema based on role
  const schema = getSchemaForRole(values.role);
  const refinementFields = schema.fields.filter((f) => f.tier === "refinement");
  const advancedFields = schema.fields.filter((f) => f.tier === "advanced");

  // Count active fields for the toggle labels
  const refinementCount = refinementFields
    .filter((f) => !!(values as any)[f.key])
    .length;
  const advancedCount = advancedFields
    .filter((f) => {
      const v = (values as any)[f.key];
      return f.key === "humanize" ? v && v !== "none" : !!v;
    })
    .length;

  // Handle role change with cross-family field clearing
  const handleRoleChange = (newRole: string) => {
    const prevRole = prevRoleRef.current;
    // Clear fields exclusive to the old family when switching families
    if (prevRole && newRole) {
      const toClear = getFieldsToClear(prevRole, newRole);
      if (toClear.length > 0) {
        // Batch clear: set each exclusive field to ""
        for (const key of toClear) {
          onChange(key as keyof ControlValues, "");
        }
      }
    }
    prevRoleRef.current = newRole;
    onChange("role", newRole);
  };

  return (
    <div className="space-y-3">
      {/* ── BASICS (always visible) ── */}

      {/* Role */}
      <ControlRow label="Role" tooltip="What instrument or part this track plays in the arrangement.">
        <ChipGroup
          options={ROLE_OPTIONS}
          value={values.role}
          onChange={handleRoleChange}
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
      <ControlRow label="Destination" tooltip="Where the generated clip will be placed.">
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
        <ControlRow label="Clips" tooltip="Number of clip variations to generate.">
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

      {/* ── REFINEMENTS (expandable, schema-driven) ── */}
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
          <SchemaFields fields={refinementFields} values={values} onChange={onChange} />
        </div>
      )}

      {/* ── ADVANCED (collapsed, schema-driven) ── */}
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
          <SchemaFields fields={advancedFields} values={values} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
