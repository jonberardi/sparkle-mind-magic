import { create } from "zustand";
import type { ChatMessage, Conversation, AssistantAction, Generation } from "@/types";

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  streamingContent: string;
  isStreaming: boolean;

  setConversations: (convos: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  startNewConversation: () => void;

  addUserMessage: (content: string) => void;
  appendStreamChunk: (chunk: string, done: boolean) => void;
  addAssistantAction: (action: AssistantAction) => void;
  addGeneration: (generation: Generation) => void;
  onConversationStarted: (id: string, title: string) => void;

  getActiveConversation: () => Conversation | null;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  streamingContent: "",
  isStreaming: false,

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),

  startNewConversation: () => {
    set({ activeConversationId: null, streamingContent: "", isStreaming: false });
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
      return { conversations: convos };
    });
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
        if (idx >= 0) {
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: newContent,
            actions: [],
            generation: null,
            timestamp: new Date().toISOString(),
          };
          convos[idx] = { ...convos[idx], messages: [...convos[idx].messages, assistantMsg] };
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
