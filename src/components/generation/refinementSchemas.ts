/**
 * Role-specific refinement schemas.
 *
 * Defines which controls appear in the Refinements and Advanced tiers
 * based on the selected role family. Melodic/harmonic roles get harmonic-
 * language controls; drums get groove-language controls.
 *
 * The schema model is intentionally data-driven so that:
 *   - GenerationControls renders fields from the active schema
 *   - IntentSummary reads labels from the active schema
 *   - Adding a new role family (e.g. bass-specific) is a config change
 */

import type { TrackRole } from "@/types";

// ── Types ──

export type RoleFamily = "melodic" | "drums";

export interface RefinementOption {
  readonly value: string;
  readonly label: string;
}

export interface RefinementField {
  /** Key in ControlValues — must match exactly. */
  readonly key: string;
  /** Human-readable label for the UI row. */
  readonly label: string;
  /** Which disclosure tier this field belongs to. */
  readonly tier: "refinement" | "advanced";
  /** Selectable chip options. */
  readonly options: readonly RefinementOption[];
  /** Tooltip for the category label. */
  readonly categoryTooltip: string;
}

export interface RefinementSchema {
  readonly family: RoleFamily;
  readonly fields: readonly RefinementField[];
}

// ── Role → Family mapping ──

const ROLE_FAMILY_MAP: Record<string, RoleFamily> = {
  bass: "melodic",
  keys: "melodic",
  pad: "melodic",
  lead: "melodic",
  pluck: "melodic",
  arp: "melodic",
  drums: "drums",
};

export function getRoleFamily(role: string): RoleFamily {
  return ROLE_FAMILY_MAP[role] ?? "melodic";
}

// ── Melodic / Harmonic schema ──

export const MELODIC_SCHEMA: RefinementSchema = {
  family: "melodic",
  fields: [
    // ── Refinements ──
    {
      key: "groove",
      label: "Groove",
      tier: "refinement",
      categoryTooltip: "How the rhythm is structured — straight, swung, syncopated, or broken.",
      options: [
        { value: "straight", label: "Straight" },
        { value: "syncopated", label: "Syncopated" },
        { value: "swung", label: "Swung" },
        { value: "broken", label: "Broken" },
      ],
    },
    {
      key: "motion",
      label: "Motion",
      tier: "refinement",
      categoryTooltip: "How notes move from one to the next — by step, leap, chord, or arpeggio.",
      options: [
        { value: "chordal", label: "Chordal" },
        { value: "stepwise", label: "Stepwise" },
        { value: "arpeggiated", label: "Arpeggiated" },
        { value: "static", label: "Static" },
        { value: "leaping", label: "Leaping" },
      ],
    },
    {
      key: "voicing",
      label: "Voicing",
      tier: "refinement",
      categoryTooltip: "How chord notes are spaced and arranged vertically.",
      options: [
        { value: "close", label: "Close" },
        { value: "spread", label: "Spread" },
        { value: "drop2", label: "Drop 2" },
        { value: "shell", label: "Shell" },
        { value: "rootless", label: "Rootless" },
        { value: "open", label: "Open" },
      ],
    },
    {
      key: "phraseBehavior",
      label: "Phrase",
      tier: "refinement",
      categoryTooltip: "How the musical idea develops across bars — repeating, building, evolving.",
      options: [
        { value: "repetitive", label: "Repetitive" },
        { value: "evolving", label: "Evolving" },
        { value: "call_response", label: "Call & Response" },
        { value: "building", label: "Building" },
      ],
    },
    {
      key: "feel",
      label: "Feel",
      tier: "refinement",
      categoryTooltip: "How tight or loose the timing feels — from mechanical to expressive.",
      options: [
        { value: "tight", label: "Tight" },
        { value: "natural", label: "Natural" },
        { value: "loose", label: "Loose" },
        { value: "soulful", label: "Soulful" },
      ],
    },
    {
      key: "density",
      label: "Density",
      tier: "refinement",
      categoryTooltip: "How many notes fill the space — from sparse to saturated.",
      options: [
        { value: "sparse", label: "Sparse" },
        { value: "moderate", label: "Moderate" },
        { value: "busy", label: "Busy" },
        { value: "dense", label: "Dense" },
      ],
    },
    {
      key: "energy",
      label: "Energy",
      tier: "refinement",
      categoryTooltip: "Overall intensity level of the generated part.",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
    // ── Advanced ──
    {
      key: "articulation",
      label: "Articulation",
      tier: "advanced",
      categoryTooltip: "How individual notes are attacked and sustained.",
      options: [
        { value: "legato", label: "Legato" },
        { value: "staccato", label: "Staccato" },
        { value: "percussive", label: "Percussive" },
      ],
    },
    {
      key: "brightness",
      label: "Brightness",
      tier: "advanced",
      categoryTooltip: "Tonal character — dark and mellow vs bright and present.",
      options: [
        { value: "dark", label: "Dark" },
        { value: "neutral", label: "Neutral" },
        { value: "bright", label: "Bright" },
      ],
    },
    {
      key: "harmonicTension",
      label: "Harmonic Tension",
      tier: "advanced",
      categoryTooltip: "How stable or unresolved the harmonies feel.",
      options: [
        { value: "consonant", label: "Consonant" },
        { value: "moderate", label: "Moderate" },
        { value: "tense", label: "Tense" },
      ],
    },
    {
      key: "humanize",
      label: "Humanization",
      tier: "advanced",
      categoryTooltip: "Amount of natural timing and velocity variation applied.",
      options: [
        { value: "none", label: "None" },
        { value: "tight", label: "Tight" },
        { value: "natural", label: "Natural" },
        { value: "loose", label: "Loose" },
        { value: "drunk", label: "Drunk" },
        { value: "soulful", label: "Soulful" },
      ],
    },
  ],
} as const;

// ── Drum schema ──

export const DRUM_SCHEMA: RefinementSchema = {
  family: "drums",
  fields: [
    // ── Refinements ──
    {
      key: "groove",
      label: "Groove",
      tier: "refinement",
      categoryTooltip: "Overall rhythmic character of the drum pattern.",
      options: [
        { value: "straight", label: "Straight" },
        { value: "syncopated", label: "Syncopated" },
        { value: "swung", label: "Swung" },
        { value: "broken", label: "Broken" },
        { value: "rolling", label: "Rolling" },
      ],
    },
    {
      key: "pulse",
      label: "Pulse",
      tier: "refinement",
      categoryTooltip: "Base subdivision driving the pattern — 8th notes, 16th notes, or mixed.",
      options: [
        { value: "8th-driven", label: "8th Driven" },
        { value: "16th-driven", label: "16th Driven" },
        { value: "mixed", label: "Mixed" },
        { value: "sparse", label: "Sparse" },
        { value: "busy", label: "Busy" },
      ],
    },
    {
      key: "kickBehavior",
      label: "Kick",
      tier: "refinement",
      categoryTooltip: "How the kick drum anchors the groove — placement and character.",
      options: [
        { value: "anchored", label: "Anchored" },
        { value: "syncopated", label: "Syncopated" },
        { value: "driving", label: "Driving" },
        { value: "sparse", label: "Sparse" },
        { value: "broken", label: "Broken" },
      ],
    },
    {
      key: "backbeat",
      label: "Backbeat",
      tier: "refinement",
      categoryTooltip: "Snare/clap behavior — solid hits, ghost notes, or displaced accents.",
      options: [
        { value: "solid", label: "Solid" },
        { value: "light", label: "Light" },
        { value: "ghosted", label: "Ghosted" },
        { value: "displaced", label: "Displaced" },
        { value: "minimal", label: "Minimal" },
      ],
    },
    {
      key: "hatCymbal",
      label: "Hats / Cymbals",
      tier: "refinement",
      categoryTooltip: "Hi-hat and cymbal pattern style — steady, accented, open, ride, or textural.",
      options: [
        { value: "steady-hats", label: "Steady Hats" },
        { value: "accented-hats", label: "Accented Hats" },
        { value: "open-hat-lifts", label: "Open Hat Lifts" },
        { value: "ride-led", label: "Ride Led" },
        { value: "textural", label: "Textural" },
      ],
    },
    {
      key: "feel",
      label: "Feel",
      tier: "refinement",
      categoryTooltip: "How tight or loose the timing feels — from mechanical to expressive.",
      options: [
        { value: "tight", label: "Tight" },
        { value: "natural", label: "Natural" },
        { value: "loose", label: "Loose" },
        { value: "soulful", label: "Soulful" },
      ],
    },
    {
      key: "density",
      label: "Density",
      tier: "refinement",
      categoryTooltip: "Overall busyness of the drum pattern — from sparse to saturated.",
      options: [
        { value: "sparse", label: "Sparse" },
        { value: "moderate", label: "Moderate" },
        { value: "busy", label: "Busy" },
        { value: "dense", label: "Dense" },
      ],
    },
    {
      key: "energy",
      label: "Energy",
      tier: "refinement",
      categoryTooltip: "Overall intensity level of the drum part.",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
    // ── Advanced ──
    {
      key: "phraseEvolution",
      label: "Phrase Evolution",
      tier: "advanced",
      categoryTooltip: "How the drum pattern develops over bars — fills, lifts, and variation.",
      options: [
        { value: "repetitive", label: "Repetitive" },
        { value: "evolving", label: "Evolving" },
        { value: "2-bar-response", label: "2-Bar Response" },
        { value: "4-bar-lift", label: "4-Bar Lift" },
        { value: "fill-heavy", label: "Fill Heavy" },
      ],
    },
    {
      key: "ornamentation",
      label: "Ornamentation",
      tier: "advanced",
      categoryTooltip: "Ghost notes, flams, and percussion detail layers.",
      options: [
        { value: "minimal", label: "Minimal" },
        { value: "subtle-ghosts", label: "Subtle Ghosts" },
        { value: "medium-detail", label: "Medium Detail" },
        { value: "busy-detail", label: "Busy Detail" },
      ],
    },
    {
      key: "kitCharacter",
      label: "Kit / Tone",
      tier: "advanced",
      categoryTooltip: "Sonic character of the drum kit — acoustic, electronic, or hybrid.",
      options: [
        { value: "dry", label: "Dry" },
        { value: "warm", label: "Warm" },
        { value: "crisp", label: "Crisp" },
        { value: "dusty", label: "Dusty" },
        { value: "punchy", label: "Punchy" },
        { value: "electronic", label: "Electronic" },
        { value: "hybrid", label: "Hybrid" },
        { value: "organic", label: "Organic" },
      ],
    },
    {
      key: "humanize",
      label: "Humanization",
      tier: "advanced",
      categoryTooltip: "Amount of natural timing and velocity variation applied.",
      options: [
        { value: "none", label: "None" },
        { value: "tight", label: "Tight" },
        { value: "natural", label: "Natural" },
        { value: "loose", label: "Loose" },
        { value: "drunk", label: "Drunk" },
        { value: "soulful", label: "Soulful" },
      ],
    },
  ],
} as const;

// ── Schema lookup ──

const SCHEMAS: Record<RoleFamily, RefinementSchema> = {
  melodic: MELODIC_SCHEMA,
  drums: DRUM_SCHEMA,
};

export function getSchemaForRole(role: string): RefinementSchema {
  return SCHEMAS[getRoleFamily(role)] ?? MELODIC_SCHEMA;
}

// ── Field key sets per family (used for clearing on role switch) ──

function fieldKeys(schema: RefinementSchema): Set<string> {
  return new Set(schema.fields.map((f) => f.key));
}

const MELODIC_KEYS = fieldKeys(MELODIC_SCHEMA);
const DRUM_KEYS = fieldKeys(DRUM_SCHEMA);
const SHARED_KEYS = new Set([...MELODIC_KEYS].filter((k) => DRUM_KEYS.has(k)));

/** Keys that are exclusive to the melodic schema. */
export const MELODIC_ONLY_KEYS = new Set([...MELODIC_KEYS].filter((k) => !SHARED_KEYS.has(k)));

/** Keys that are exclusive to the drum schema. */
export const DRUM_ONLY_KEYS = new Set([...DRUM_KEYS].filter((k) => !SHARED_KEYS.has(k)));

/**
 * Returns the set of field keys that should be cleared when switching
 * from one role family to another. Only clears keys exclusive to the
 * departing family — shared fields (feel, density, energy, etc.) are kept.
 */
export function getFieldsToClear(
  fromRole: string,
  toRole: string,
): string[] {
  const fromFamily = getRoleFamily(fromRole);
  const toFamily = getRoleFamily(toRole);
  if (fromFamily === toFamily) return [];

  // Clear keys that exist in the old family but not in the new one
  const oldSchema = SCHEMAS[fromFamily];
  const newKeys = fieldKeys(SCHEMAS[toFamily]);
  return oldSchema.fields
    .filter((f) => !newKeys.has(f.key))
    .map((f) => f.key);
}
