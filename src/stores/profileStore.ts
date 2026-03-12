import { create } from "zustand";
import type { StyleProfile } from "@/types";

interface ProfileStore {
  profiles: StyleProfile[];
  activeProfileId: string | null;
  setProfiles: (profiles: StyleProfile[]) => void;
  setActiveProfile: (id: string) => void;
}

const DEFAULT_PROFILE: StyleProfile = {
  id: "default",
  name: "Default",
  description: "Balanced general-purpose style",
  is_curated: true,
  parent_id: null,
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

export const useProfileStore = create<ProfileStore>((set) => ({
  profiles: [DEFAULT_PROFILE],
  activeProfileId: "default",
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
}));
