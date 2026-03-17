/**
 * API functions for Explore First candidate generation.
 */

import type { CandidateSet, Candidate } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface GenerateCandidatesParams {
  songId: string;
  prompt: string;
  sectionId?: string;
  role?: string;
  motionType?: string;
  voicingBehavior?: string;
  articulation?: string;
  register?: [number, number];
  feel?: string;
  density?: string;
  rhythmicTendency?: string;
  additionalInstructions?: string;
}

export async function generateCandidates(
  params: GenerateCandidatesParams,
): Promise<CandidateSet> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/songs/${params.songId}/candidates/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: params.prompt,
          section_id: params.sectionId,
          role: params.role,
          motion_type: params.motionType,
          voicing_behavior: params.voicingBehavior,
          articulation: params.articulation,
          register: params.register,
          feel: params.feel,
          density: params.density,
          rhythmic_tendency: params.rhythmicTendency,
          additional_instructions: params.additionalInstructions,
        }),
      },
    );
  } catch (e) {
    throw new Error(
      "Could not reach backend — check that the server is running and try again.",
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Generate failed: ${res.statusText}`);
  }
  return res.json();
}

export async function regenerateCandidates(
  params: GenerateCandidatesParams & { frozen: Record<string, Candidate> },
): Promise<CandidateSet> {
  const frozenPayload: Record<string, any> = {};
  for (const [label, cand] of Object.entries(params.frozen)) {
    frozenPayload[label] = {
      id: cand.id,
      variation_axis: cand.variation_axis,
      variation_label: cand.variation_label,
      notes: cand.notes,
      clip_length_bars: cand.clip_length_bars,
      clip_name: cand.clip_name,
      description: cand.description,
    };
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/songs/${params.songId}/candidates/regenerate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: params.prompt,
          section_id: params.sectionId,
          role: params.role,
          motion_type: params.motionType,
          voicing_behavior: params.voicingBehavior,
          articulation: params.articulation,
          register: params.register,
          feel: params.feel,
          density: params.density,
          rhythmic_tendency: params.rhythmicTendency,
          additional_instructions: params.additionalInstructions,
          frozen: frozenPayload,
        }),
      },
    );
  } catch (e) {
    throw new Error(
      "Could not reach backend — check that the server is running and try again.",
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Regenerate failed: ${res.statusText}`);
  }
  return res.json();
}

// ── Individual mode (no song) ──

export interface IndividualCandidateParams {
  prompt: string;
  key?: string;
  scale?: string;
  bpm?: number;
  styleWorld?: string;
  role?: string;
  chordProgression?: Array<{ root: string; quality: string; bars: number }>;
  lengthBars?: number;
  feel?: string;
  density?: string;
  rhythmicTendency?: string;
  additionalInstructions?: string;
}

export async function generateIndividualCandidates(
  params: IndividualCandidateParams,
): Promise<CandidateSet> {
  const res = await fetch(`${API_BASE}/api/candidates/explore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: params.prompt,
      key: params.key,
      scale: params.scale,
      bpm: params.bpm,
      style_world: params.styleWorld,
      role: params.role,
      chord_progression: params.chordProgression,
      length_bars: params.lengthBars || 8,
      feel: params.feel,
      density: params.density,
      rhythmic_tendency: params.rhythmicTendency,
      additional_instructions: params.additionalInstructions,
    }),
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.statusText}`);
  return res.json();
}

export async function regenerateIndividualCandidates(
  params: IndividualCandidateParams & { frozen: Record<string, Candidate> },
): Promise<CandidateSet> {
  const frozenPayload: Record<string, any> = {};
  for (const [label, cand] of Object.entries(params.frozen)) {
    frozenPayload[label] = {
      id: cand.id,
      variation_axis: cand.variation_axis,
      variation_label: cand.variation_label,
      notes: cand.notes,
      clip_length_bars: cand.clip_length_bars,
      clip_name: cand.clip_name,
      description: cand.description,
    };
  }
  const res = await fetch(`${API_BASE}/api/candidates/explore/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: params.prompt,
      key: params.key,
      scale: params.scale,
      bpm: params.bpm,
      style_world: params.styleWorld,
      role: params.role,
      chord_progression: params.chordProgression,
      length_bars: params.lengthBars || 8,
      feel: params.feel,
      density: params.density,
      rhythmic_tendency: params.rhythmicTendency,
      additional_instructions: params.additionalInstructions,
      frozen: frozenPayload,
    }),
  });
  if (!res.ok) throw new Error(`Regenerate failed: ${res.statusText}`);
  return res.json();
}

export interface SendCandidateParams {
  trackId: number;
  sceneId: number;
  clipName?: string;
  humanizePreset?: string;
  notes: Array<{ pitch: number; time: number; duration: number; velocity: number }>;
  clipLengthBars: number;
  // Track setup (used when creating a new track)
  role?: string;
  trackName?: string;
  loadInstrument?: boolean;
  // Library save context
  songId?: string;
  sectionId?: string;
  prompt?: string;
  candidateLabel?: string;
  variationLabel?: string;
  conversationId?: string;
  saveToLibrary?: boolean;
}

export async function sendCandidateToAbleton(
  params: SendCandidateParams,
): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/api/candidates/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      track_id: params.trackId,
      scene_id: params.sceneId,
      clip_name: params.clipName,
      humanize_preset: params.humanizePreset || "natural",
      notes: params.notes,
      clip_length_bars: params.clipLengthBars,
      role: params.role,
      track_name: params.trackName,
      load_instrument: params.loadInstrument ?? true,
      song_id: params.songId,
      section_id: params.sectionId,
      prompt: params.prompt,
      candidate_label: params.candidateLabel,
      variation_label: params.variationLabel,
      conversation_id: params.conversationId,
      save_to_library: params.saveToLibrary ?? true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}
