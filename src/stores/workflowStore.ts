import { create } from "zustand";
import type {
  WorkflowMode,
  Song,
  SongSection,
  IndividualSettings,
  IndividualPreset,
  WorkflowContext,
} from "@/types";

interface WorkflowStore {
  // Mode
  mode: WorkflowMode;
  setMode: (mode: WorkflowMode) => void;

  // Song Mode state
  activeSongId: string | null;
  activeSong: Song | null;
  sections: SongSection[];
  activeSectionId: string | null;
  setActiveSong: (song: Song, sections: SongSection[]) => void;
  setActiveSection: (sectionId: string | null) => void;
  updateSong: (updates: Partial<Song>) => void;
  updateSection: (sectionId: string, updates: Partial<SongSection>) => void;
  addSection: (section: SongSection) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (sectionIds: string[]) => void;
  clearSong: () => void;

  // Individual Mode state
  individualSettings: IndividualSettings;
  setIndividualSettings: (settings: Partial<IndividualSettings>) => void;
  savedPresets: IndividualPreset[];
  setSavedPresets: (presets: IndividualPreset[]) => void;
  loadPreset: (preset: IndividualPreset) => void;

  // Context for sending with chat messages
  getWorkflowContext: () => WorkflowContext;

  // Panel UI state
  isPanelExpanded: boolean;
  setPanelExpanded: (expanded: boolean) => void;
}

const DEFAULT_INDIVIDUAL_SETTINGS: IndividualSettings = {
  key: null,
  scale: null,
  tempo: null,
  chord_progression: null,
  humanize_preset: null,
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Mode
  mode: "individual",
  setMode: (mode) => set({ mode }),

  // Song Mode
  activeSongId: null,
  activeSong: null,
  sections: [],
  activeSectionId: null,

  setActiveSong: (song, sections) =>
    set({
      activeSongId: song.id,
      activeSong: song,
      sections,
      activeSectionId: sections.length > 0 ? sections[0].id : null,
    }),

  setActiveSection: (sectionId) => set({ activeSectionId: sectionId }),

  updateSong: (updates) => {
    const { activeSong } = get();
    if (!activeSong) return;
    set({ activeSong: { ...activeSong, ...updates } });
  },

  updateSection: (sectionId, updates) => {
    const { sections } = get();
    set({
      sections: sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    });
  },

  addSection: (section) => {
    const { sections } = get();
    set({ sections: [...sections, section] });
  },

  removeSection: (sectionId) => {
    const { sections, activeSectionId } = get();
    const filtered = sections.filter((s) => s.id !== sectionId);
    set({
      sections: filtered,
      activeSectionId:
        activeSectionId === sectionId
          ? filtered[0]?.id ?? null
          : activeSectionId,
    });
  },

  reorderSections: (sectionIds) => {
    const { sections } = get();
    const byId = new Map(sections.map((s) => [s.id, s]));
    const reordered = sectionIds
      .map((id, i) => {
        const s = byId.get(id);
        return s ? { ...s, order_index: i } : null;
      })
      .filter(Boolean) as SongSection[];
    set({ sections: reordered });
  },

  clearSong: () =>
    set({
      activeSongId: null,
      activeSong: null,
      sections: [],
      activeSectionId: null,
    }),

  // Individual Mode
  individualSettings: { ...DEFAULT_INDIVIDUAL_SETTINGS },

  setIndividualSettings: (settings) => {
    const { individualSettings } = get();
    set({ individualSettings: { ...individualSettings, ...settings } });
  },

  savedPresets: [],
  setSavedPresets: (presets) => set({ savedPresets: presets }),

  loadPreset: (preset) =>
    set({
      individualSettings: {
        key: preset.key,
        scale: preset.scale,
        tempo: preset.tempo,
        chord_progression: preset.chord_progression,
        humanize_preset: preset.humanize_preset,
      },
    }),

  // Build context for WebSocket message
  getWorkflowContext: () => {
    const { mode, activeSongId, activeSectionId, individualSettings } = get();

    if (mode === "song" && activeSongId) {
      return {
        mode: "song",
        song_id: activeSongId,
        active_section_id: activeSectionId ?? undefined,
      };
    }

    return {
      mode: "individual",
      key: individualSettings.key,
      scale: individualSettings.scale,
      tempo: individualSettings.tempo,
      chord_progression: individualSettings.chord_progression,
      humanize_preset: individualSettings.humanize_preset,
    };
  },

  // Panel UI
  isPanelExpanded: true,
  setPanelExpanded: (expanded) => set({ isPanelExpanded: expanded }),
}));
