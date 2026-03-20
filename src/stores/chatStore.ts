import { create } from "zustand";
import type { ChatMessage, Conversation, AssistantAction, Generation } from "@/types";
import { API_BASE } from "@/lib/api";

/** Normalize raw API messages to include all fields ChatMessage expects. */
function normalizeMessages(raw: any[]): ChatMessage[] {
  return (raw || []).map((m: any, i: number) => ({
    id: m.id || `api-${i}-${Date.now()}`,
    role: m.role || "assistant",
    content: m.content || "",
    actions: m.actions || [],
    generation: m.generation || null,
    timestamp: m.timestamp || new Date().toISOString(),
  }));
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  streamingContent: string;
  isStreaming: boolean;
  statusMessage: string;
  isProcessing: boolean;

  setConversations: (convos: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  startNewConversation: () => void;
  loadSongConversations: (songId: string) => Promise<void>;

  addUserMessage: (content: string) => void;
  appendStreamChunk: (chunk: string, done: boolean) => void;
  addAssistantAction: (action: AssistantAction) => void;
  addGeneration: (generation: Generation) => void;
  onConversationStarted: (id: string, title: string) => void;
  setStatus: (status: string, message: string) => void;

  getActiveConversation: () => Conversation | null;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  streamingContent: "",
  isStreaming: false,
  statusMessage: "",
  isProcessing: false,

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => {
    if (!id) { set({ activeConversationId: null }); return; }
    const state = get();
    const found = state.conversations.find((c) => c.id === id);
    if (found) {
      set({ activeConversationId: id });
    } else {
      // Conversation not in local store — fetch from API
      set({ activeConversationId: id });
      fetch(`${API_BASE}/api/conversations/${id}`)
        .then((res) => res.ok ? res.json() : null)
        .then((raw) => {
          if (!raw) return;
          const conv = { ...raw, messages: normalizeMessages(raw.messages) };
          set((s) => ({
            conversations: [conv, ...s.conversations.filter((c) => c.id !== id)],
          }));
        })
        .catch(() => { /* silent */ });
    }
  },

  startNewConversation: () => {
    set({ activeConversationId: null, streamingContent: "", isStreaming: false, statusMessage: "", isProcessing: false });
  },

  loadSongConversations: async (songId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/songs/${songId}/conversations`);
      if (res.ok) {
        const raw = await res.json();
        const fromApi = raw.map((c: any) => ({
          ...c,
          messages: normalizeMessages(c.messages),
        }));
        // Merge: API conversations take precedence, but keep local-only
        // conversations that aren't in the API response (e.g., just created)
        set((state) => {
          const apiIds = new Set(fromApi.map((c: Conversation) => c.id));
          const localOnly = state.conversations.filter((c) => !apiIds.has(c.id));
          return { conversations: [...fromApi, ...localOnly] };
        });
      }
    } catch {
      // silent — conversations will be empty, which is safe
    }
  },

  addUserMessage: (content) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      actions: [],
      generation: null,
      timestamp: new Date().toISOString(),
    };

    set((state) => {
      const convos = [...state.conversations];
      const idx = convos.findIndex((c) => c.id === state.activeConversationId);
      if (idx >= 0) {
        convos[idx] = { ...convos[idx], messages: [...convos[idx].messages, msg] };
      }
      return { conversations: convos, isProcessing: true, statusMessage: "Sending..." };
    });
  },

  setStatus: (status, message) => {
    if (status === "done") {
      set({ statusMessage: "", isProcessing: false });
    } else {
      set({ statusMessage: message, isProcessing: true });
    }
  },

  onConversationStarted: (id, title) => {
    set((state) => {
      const exists = state.conversations.find((c) => c.id === id);
      if (exists) {
        return { activeConversationId: id };
      }
      const newConvo: Conversation = {
        id,
        title,
        style_profile_id: "",
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return {
        conversations: [newConvo, ...state.conversations],
        activeConversationId: id,
      };
    });
  },

  appendStreamChunk: (chunk, done) => {
    set((state) => {
      const newContent = state.streamingContent + chunk;
      if (done) {
        // Finalize: add assistant message to conversation
        const convos = [...state.conversations];
        const idx = convos.findIndex((c) => c.id === state.activeConversationId);
        if (idx >= 0 && newContent.trim()) {
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: newContent,
            actions: [],
            generation: null,
            timestamp: new Date().toISOString(),
          };
          convos[idx] = { ...convos[idx], messages: [...convos[idx].messages, assistantMsg] };
        } else if (idx < 0 && newContent.trim()) {
          // Safety net: activeConversationId is null but we have content.
          // Store as pending so it's not lost. The most recent conversation
          // is the most likely target (conversation_started may not have arrived yet).
          console.warn("[chatStore] appendStreamChunk: no active conversation for finalized text, storing in most recent conversation");
          if (convos.length > 0) {
            const assistantMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: newContent,
              actions: [],
              generation: null,
              timestamp: new Date().toISOString(),
            };
            convos[0] = { ...convos[0], messages: [...convos[0].messages, assistantMsg] };
          }
        }
        return { conversations: convos, streamingContent: "", isStreaming: false };
      }
      return { streamingContent: newContent, isStreaming: true };
    });
  },

  addAssistantAction: (action) => {
    set((state) => {
      const convos = [...state.conversations];
      const idx = convos.findIndex((c) => c.id === state.activeConversationId);
      if (idx >= 0) {
        const msgs = [...convos[idx].messages];
        const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
        if (lastAssistant) {
          lastAssistant.actions = [...lastAssistant.actions, action];
        }
        convos[idx] = { ...convos[idx], messages: msgs };
      }
      return { conversations: convos };
    });
  },

  addGeneration: (generation) => {
    set((state) => {
      const convos = [...state.conversations];
      const idx = convos.findIndex((c) => c.id === state.activeConversationId);
      if (idx >= 0) {
        const msgs = [...convos[idx].messages];
        const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
        if (lastAssistant) {
          lastAssistant.generation = generation;
        }
        convos[idx] = { ...convos[idx], messages: msgs };
      }
      return { conversations: convos };
    });
  },

  getActiveConversation: () => {
    const state = get();
    return state.conversations.find((c) => c.id === state.activeConversationId) || null;
  },
}));
