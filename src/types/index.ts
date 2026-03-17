export type TagCategory = "instrument" | "style" | "mood" | "key" | "scale" | "tempo_range" | "energy" | "texture" | "technique";

export interface Tag {
  id: number;
  name: string;
  category: TagCategory;
  auto_generated: boolean;
}

export interface Generation {
  id: string;
  session_id: string;
  conversation_id: string;
  song_id: string | null;
  section_id: string | null;
  prompt: string;
  output_type: "midi_clip" | "effect_chain" | "device_load" | "parameter_set" | "arrangement";
  output_data: Record<string, any>;
  description: string;
  rating: number | null;
  thumbs: "up" | "down" | null;
  tags: Tag[];
  style_profile_id: string;
  parent_id: string | null;
  created_at: string;
  session_name: string;
  song_name: string | null;
  section_name: string | null;
}

export interface Preference {
  id: string;
  rule: string;
  scope_tags: Tag[];
  source: "explicit" | "inferred";
  confidence: number;
  active: boolean;
  created_at: string;
}

export type StyleSourceType = "curated" | "custom" | "derived" | "song_applied";

export interface StyleProfile {
  id: string;
  name: string;
  description: string;
  is_curated: boolean;
  parent_id: string | null;
  source_type: StyleSourceType;
  style_world: string | null;
  style_summary: string | null;
  reference_artists: string[];
  params: {
    voicing_style: "spread" | "tight" | "rootless" | "shell";
    chord_extensions: "triads" | "7ths" | "9ths+" | "13ths+";
    rhythm_density: number;
    syncopation: number;
    velocity_range: [number, number];
    humanization_amount: number;
    attack_character: "soft" | "moderate" | "percussive";
    default_effects: string[];
    tempo_range: [number, number];
    key_tendencies: string[];
    mood_default: "uplifting" | "dark" | "melancholic" | "neutral" | "aggressive" | "dreamy";
    energy_default: "low" | "medium" | "high";
  };
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface AssistantAction {
  action_type: string;
  description: string;
  details: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions: AssistantAction[];
  generation: Generation | null;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  style_profile_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface DeviceState {
  name: string;
  type: string;
  class_name: string;
}

export interface ClipSlotState {
  scene_id: number;
  name: string | null;
  length: number | null;
  color: number | null;
}

export interface TrackState {
  id: number;
  name: string;
  type: "midi" | "audio";
  armed: boolean;
  muted: boolean;
  solo: boolean;
  volume: number;
  panning: number;
  devices: DeviceState[];
  clips: ClipSlotState[];
}

export interface SessionState {
  project_name: string;
  tempo: number;
  key: string | null;
  playing: boolean;
  tracks: TrackState[];
}

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

// ── Workflow Mode Types ──

export type WorkflowMode = "song" | "individual";

export interface ChordEntry {
  root: string;
  quality: string;
  bars: number;
  octave?: number;
}

export interface Song {
  id: string;
  name: string;
  key: string | null;
  scale: string | null;
  tempo: number | null;
  notes: string | null;
  style_tags: string[];
  reference_artists: string[];
  // Phase 1: structured song-level defaults
  style_world: string | null;
  overall_feel: string | null;
  groove_tendency: string | null;
  sections: SongSection[];
  created_at: string;
  updated_at: string;
}

export interface SongSection {
  id: string;
  song_id: string;
  name: string;
  order_index: number;
  length_bars: number;
  chord_progression: ChordEntry[] | null;
  feel: string | null;
  energy: string | null;
  scene_id: number | null;
  notes: string | null;
  // Phase 1: structured section-level overrides
  style_world: string | null;
  mood: string | null;
  density_tendency: string | null;
  rhythmic_tendency: string | null;
  phrase_behavior: string | null;
  harmonic_tension: string | null;
  brightness: string | null;
  created_at: string;
}

// ── Phase 1: Inheritance & Resolved Context ──

export type InheritanceState = "inherited" | "overridden" | "locked" | "style_world" | "unset";

export interface ResolvedContext {
  key: string | null;
  scale: string | null;
  bpm: number | null;
  style_world: string | null;
  section_name: string | null;
  chord_progression: ChordEntry[] | null;
  length_bars: number;
  scene_id: number | null;
  energy: string | null;
  mood: string | null;
  density: string | null;
  rhythmic_tendency: string | null;
  phrase_behavior: string | null;
  harmonic_tension: string | null;
  brightness: string | null;
  feel: string | null;
  role: string | null;
  motion_type: string | null;
  voicing_behavior: string | null;
  articulation: string | null;
  register: [number, number] | null;
  additional_instructions: string | null;
  _inheritance: Record<string, string>;
}

export interface ResolvedContextResponse {
  resolved: ResolvedContext;
  inheritance: Record<string, InheritanceState>;
  identity_summary: string;
  prompt_preview: string;
}

// Phase 1 supported style worlds
export const STYLE_WORLDS = [
  "chicago_house", "detroit_techno", "bass_house", "funk",
  "house", "deep_house", "downtempo", "neo_soul",
  "lo_fi", "hip_hop", "drum_and_bass", "nu_disco",
] as const;

export const STYLE_WORLD_LABELS: Record<string, string> = {
  chicago_house: "Chicago House",
  detroit_techno: "Detroit Techno",
  bass_house: "Bass House",
  funk: "Funk",
  house: "House",
  deep_house: "Deep House",
  downtempo: "Downtempo",
  neo_soul: "Neo-Soul",
  lo_fi: "Lo-Fi",
  hip_hop: "Hip Hop",
  drum_and_bass: "Drum & Bass",
  nu_disco: "Nu Disco",
};

// Phase 1 supported track roles
export const TRACK_ROLES = ["bass", "keys", "pad", "lead", "pluck", "drums", "arp"] as const;
export type TrackRole = typeof TRACK_ROLES[number];

// Section-level option values
export const DENSITY_TENDENCIES = ["sparse", "moderate", "busy", "dense"] as const;
export const RHYTHMIC_TENDENCIES = ["straight", "syncopated", "swung", "broken"] as const;
export const PHRASE_BEHAVIORS = ["repetitive", "evolving", "call_response", "building"] as const;
export const HARMONIC_TENSIONS = ["consonant", "moderate", "tense"] as const;
export const BRIGHTNESS_LEVELS = ["dark", "neutral", "bright"] as const;

// ── Phase 1: Explore First (Candidate Generation) ──

export interface CandidateNote {
  pitch: number;
  time: number;
  duration: number;
  velocity: number;
}

export interface Candidate {
  id: string;
  label: "A" | "B" | "C";
  variation_axis: string | null;
  variation_label: string | null;
  notes: CandidateNote[];
  clip_length_bars: number;
  clip_name: string;
  description: string;
  frozen: boolean;
  evaluation: EvaluationResult | null;
}

export interface CandidateSet {
  id: string;
  prompt: string;
  candidates: Candidate[];
  resolved_context: Record<string, any>;
}

export interface IndividualSettings {
  key: string | null;
  scale: string | null;
  tempo: number | null;
  chord_progression: ChordEntry[] | null;
  humanize_preset: string | null;
}

export interface IndividualPreset {
  id: string;
  name: string;
  key: string | null;
  scale: string | null;
  tempo: number | null;
  chord_progression: ChordEntry[] | null;
  humanize_preset: string | null;
  created_at: string;
}

export interface WorkflowContext {
  mode: WorkflowMode;
  // Song mode
  song_id?: string;
  active_section_id?: string;
  // Individual mode
  key?: string | null;
  scale?: string | null;
  tempo?: number | null;
  chord_progression?: ChordEntry[] | null;
  humanize_preset?: string | null;
}

// ── MIDI Quality Evaluator ──

export interface EvaluationScores {
  style_appropriateness: number;
  role_fitness: number;
  rhythmic_quality: number;
  harmonic_quality: number;
  phrase_structure: number;
  restraint: number;
  usefulness: number;
}

export interface EvaluationResult {
  scores: EvaluationScores;
  overall_score: number;
  verdict: "strong" | "acceptable" | "weak";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  error: string | null;
}

export interface EvaluatorConfig {
  enabled: boolean;
  prompt: string;
  weights: Record<string, number>;
  auto_evaluate_candidates: boolean;
  weak_threshold: number;
  strong_threshold: number;
}

export const EVALUATION_DIMENSIONS: { key: keyof EvaluationScores; label: string; description: string }[] = [
  { key: "style_appropriateness", label: "Style", description: "Does it fit the style world?" },
  { key: "role_fitness", label: "Role", description: "Does it serve its musical role?" },
  { key: "rhythmic_quality", label: "Rhythm", description: "Is the groove musical?" },
  { key: "harmonic_quality", label: "Harmony", description: "Do notes fit the harmonic context?" },
  { key: "phrase_structure", label: "Phrase", description: "Does it have musical shape?" },
  { key: "restraint", label: "Restraint", description: "Right amount of density/activity?" },
  { key: "usefulness", label: "Usefulness", description: "Would a producer keep this?" },
];

// ── Music Constants ──

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const FLAT_NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
export const ALL_NOTE_NAMES = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"] as const;

export const SCALE_TYPES = [
  "major", "natural_minor", "harmonic_minor", "melodic_minor",
  "dorian", "mixolydian", "lydian", "phrygian", "locrian",
  "blues", "pentatonic_major", "pentatonic_minor",
] as const;

export const CHORD_QUALITIES = [
  "maj", "min", "dim", "aug", "7", "maj7", "min7", "dim7", "m7b5",
  "9", "maj9", "min9", "11", "min11", "13", "sus2", "sus4", "add9", "6", "min6",
] as const;

export const HUMANIZE_PRESETS = ["none", "tight", "natural", "loose", "drunk", "soulful"] as const;

export const ENERGY_LEVELS = ["low", "medium", "high"] as const;

// ── M2: AI Style Authoring Types ──

/** Confidence level for an AI-recommended field value (M3) */
export type FieldConfidence = "clear" | "inferred" | "defaulted";

/** A single field diff for the review modal */
export interface StyleFieldDiff {
  field: string;
  label: string;
  old_value: unknown;
  new_value: unknown;
  confidence?: FieldConfidence;
}

/** A group of field diffs (Core Identity, Harmony, etc.) */
export interface StyleDiffGroup {
  group: string;
  fields: StyleFieldDiff[];
}

/** Response from ai-recommend, ai-refine, and ai-interview-recommend endpoints */
export interface StyleAIResult {
  validated: Record<string, unknown>;
  grouped_diffs: StyleDiffGroup[];
  summary: string;
  interpretation_summary?: string;
  clarification_summary?: string[];
}

/** Result from ai-interpret endpoint (M3 Stage 1) */
export interface StyleInterpretation {
  interpretation: string[];
  style_family: string;
  clear_from_prompt: string[];
  ambiguous_dimensions: string[];
  suggested_questions: string[];
  questions: InterviewQuestion[];
}

/** A structured interview question (from the question bank) */
export interface InterviewQuestion {
  id: string;
  dimension: string;
  question: string;
  type: "single_select";
  options: RefineQuestionOption[];
}

/** Interview session state (M3) */
export interface InterviewSession {
  description: string;
  interpretation: StyleInterpretation | null;
  answers: Record<string, string>;
  stage: "interpreting" | "interpreted" | "clarifying" | "recommending" | "done";
}

/** Response from ai-apply endpoint */
export interface StyleAIApplyResult {
  profile: StyleProfile;
  summary: string;
}

/** A single option in a structured refinement question */
export interface RefineQuestionOption {
  value: string;
  label: string;
}

/** A structured clarification question for the refine dialog */
export interface RefineQuestion {
  id: string;
  question: string;
  type: "single_select" | "multi_select" | "text";
  options?: RefineQuestionOption[];
  placeholder?: string;
}

/** The acceptance state of a field in the review modal */
export type FieldAcceptance = "accepted" | "rejected" | "pending";

/** Grouped acceptance state for the review modal */
export interface GroupAcceptanceState {
  [field: string]: FieldAcceptance;
}

/** Style field group names (used for review modal grouping) */
export const STYLE_FIELD_GROUPS = [
  "Core Identity",
  "Harmony",
  "Groove & Motion",
  "Energy & Expression",
  "Production",
] as const;

export type StyleFieldGroup = typeof STYLE_FIELD_GROUPS[number];

export const TAG_CATEGORY_COLORS: Record<TagCategory, string> = {
  instrument: "tag-instrument",
  style: "tag-style",
  mood: "tag-mood",
  key: "tag-key",
  scale: "tag-scale",
  tempo_range: "tag-tempo",
  energy: "tag-energy",
  texture: "tag-texture",
  technique: "tag-technique",
};
