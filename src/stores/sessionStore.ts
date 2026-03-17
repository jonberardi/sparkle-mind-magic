import { create } from "zustand";
import type { SessionState } from "@/types";

interface SessionStore {
  session: SessionState | null;
  /** Local track name overrides that survive session_state refreshes from Ableton. */
  trackNameOverrides: Record<number, string>;
  setSession: (session: SessionState) => void;
  setTrackNameOverride: (trackId: number, name: string) => void;
  getTrackName: (trackId: number) => string;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  trackNameOverrides: {},

  setSession: (session) => set({ session }),

  setTrackNameOverride: (trackId, name) =>
    set((state) => ({
      trackNameOverrides: { ...state.trackNameOverrides, [trackId]: name },
    })),

  getTrackName: (trackId) => {
    const { session, trackNameOverrides } = get();
    if (trackNameOverrides[trackId]) return trackNameOverrides[trackId];
    const track = session?.tracks?.find((t) => t.id === trackId);
    return track?.name || `Track ${trackId}`;
  },
}));
