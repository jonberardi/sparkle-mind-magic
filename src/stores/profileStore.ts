import { create } from "zustand";
import type {
  StyleProfile, StyleAIResult, StyleAIApplyResult, RefineQuestion,
  StyleInterpretation, InterviewSession,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface StyleWorldSummary {
  name: string;
  label: string;
  description: string;
}

interface ProfileStore {
  profiles: StyleProfile[];
  activeProfileId: string | null;
  styleWorlds: StyleWorldSummary[];
  aiLoading: boolean;
  aiError: string | null;
  lastAIResult: StyleAIResult | null;
  refineQuestions: RefineQuestion[];
  interviewSession: InterviewSession | null;
  setProfiles: (profiles: StyleProfile[]) => void;
  setActiveProfile: (id: string) => void;
  setStyleWorlds: (worlds: StyleWorldSummary[]) => void;
  setAILoading: (loading: boolean) => void;
  clearAIState: () => void;

  // AI actions
  aiRecommend: (profileId: string, description: string) => Promise<StyleAIResult | null>;
  aiRefine: (profileId: string, answers: Record<string, unknown>) => Promise<StyleAIResult | null>;
  aiApply: (profileId: string, changes: Record<string, unknown>) => Promise<StyleAIApplyResult | null>;
  fetchRefineQuestions: () => Promise<void>;

  // M3: Interview actions
  aiInterpret: (description: string) => Promise<StyleInterpretation | null>;
  aiInterviewRecommend: (
    profileId: string,
    description: string,
    interpretation: string[],
    answers: Record<string, string>,
  ) => Promise<StyleAIResult | null>;
  setInterviewSession: (session: InterviewSession | null) => void;
}

const DEFAULT_PROFILE: StyleProfile = {
  id: "default",
  name: "Default",
  description: "Balanced general-purpose style",
  is_curated: true,
  parent_id: null,
  source_type: "curated",
  style_world: null,
  style_summary: null,
  reference_artists: [],
  params: {
    voicing_style: "spread",
    chord_extensions: "7ths",
    rhythm_density: 0.5,
    syncopation: 0.3,
    velocity_range: [60, 110],
    humanization_amount: 0.3,
    attack_character: "moderate",
    default_effects: [],
    tempo_range: [80, 140],
    key_tendencies: [],
    mood_default: "neutral",
    energy_default: "medium",
  },
  tags: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profiles: [DEFAULT_PROFILE],
  activeProfileId: "default",
  styleWorlds: [],
  aiLoading: false,
  aiError: null,
  lastAIResult: null,
  refineQuestions: [],
  interviewSession: null,
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  setStyleWorlds: (worlds) => set({ styleWorlds: worlds }),
  setAILoading: (loading) => set({ aiLoading: loading }),
  clearAIState: () => set({ aiLoading: false, aiError: null, lastAIResult: null, interviewSession: null }),
  setInterviewSession: (session) => set({ interviewSession: session }),

  aiRecommend: async (profileId, description) => {
    set({ aiLoading: true, aiError: null, lastAIResult: null });
    try {
      const res = await fetch(`${API_URL}/api/styles/ai-recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, description }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "AI recommendation failed");
      }
      const result: StyleAIResult = await res.json();
      set({ aiLoading: false, lastAIResult: result });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI recommendation failed";
      set({ aiLoading: false, aiError: msg });
      return null;
    }
  },

  aiRefine: async (profileId, answers) => {
    set({ aiLoading: true, aiError: null, lastAIResult: null });
    try {
      const res = await fetch(`${API_URL}/api/styles/ai-refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, answers }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "AI refinement failed");
      }
      const result: StyleAIResult = await res.json();
      set({ aiLoading: false, lastAIResult: result });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI refinement failed";
      set({ aiLoading: false, aiError: msg });
      return null;
    }
  },

  aiApply: async (profileId, changes) => {
    set({ aiLoading: true, aiError: null });
    try {
      const res = await fetch(`${API_URL}/api/styles/ai-apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, changes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Failed to apply changes");
      }
      const result: StyleAIApplyResult = await res.json();
      // Update the profile in the local store
      const profiles = get().profiles.map((p) =>
        p.id === result.profile.id ? result.profile : p
      );
      set({ aiLoading: false, lastAIResult: null, profiles });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to apply changes";
      set({ aiLoading: false, aiError: msg });
      return null;
    }
  },

  fetchRefineQuestions: async () => {
    try {
      const res = await fetch(`${API_URL}/api/styles/refine-questions`);
      if (res.ok) {
        const questions: RefineQuestion[] = await res.json();
        set({ refineQuestions: questions });
      }
    } catch {
      // silent — questions are optional
    }
  },

  // M3: Interview actions

  aiInterpret: async (description) => {
    set({ aiLoading: true, aiError: null });
    try {
      const res = await fetch(`${API_URL}/api/styles/ai-interpret`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "AI interpretation failed");
      }
      const result: StyleInterpretation = await res.json();
      set({
        aiLoading: false,
        interviewSession: {
          description,
          interpretation: result,
          answers: {},
          stage: "interpreted",
        },
      });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI interpretation failed";
      set({ aiLoading: false, aiError: msg });
      return null;
    }
  },

  aiInterviewRecommend: async (profileId, description, interpretation, answers) => {
    set({ aiLoading: true, aiError: null, lastAIResult: null });
    try {
      const res = await fetch(`${API_URL}/api/styles/ai-interview-recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profileId,
          description,
          interpretation,
          answers,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "AI interview recommendation failed");
      }
      const result: StyleAIResult = await res.json();
      const session = get().interviewSession;
      set({
        aiLoading: false,
        lastAIResult: result,
        interviewSession: session ? { ...session, stage: "done" } : null,
      });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI interview recommendation failed";
      set({ aiLoading: false, aiError: msg });
      return null;
    }
  },
}));
