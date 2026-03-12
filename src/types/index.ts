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

export interface StyleProfile {
  id: string;
  name: string;
  description: string;
  is_curated: boolean;
  parent_id: string | null;
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
