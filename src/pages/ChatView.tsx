import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Plus, Loader2, Layers, X } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useProfileStore } from "@/stores/profileStore";
import { useWebSocketStore } from "@/stores/websocketStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { ChatMessage, StreamingMessage } from "@/components/ChatMessage";
import { IndividualContextPanel } from "@/components/IndividualContextPanel";
import { IndividualExplorePanel } from "@/components/IndividualExplorePanel";
import { ContextBadges } from "@/components/ContextBadges";

export default function ChatView() {
  const [input, setInput] = useState("");
  const [showExplore, setShowExplore] = useState(false);
  const [explorePrompt, setExplorePrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeConversationId,
    streamingContent,
    isStreaming,
    isProcessing,
    statusMessage,
    addUserMessage,
    startNewConversation,
    getActiveConversation,
  } = useChatStore();
  const { send, abletonConnected } = useWebSocketStore();
  const { activeProfileId, profiles } = useProfileStore();
  const { getWorkflowContext, setMode, individualSettings } = useWorkflowStore();

  const conversation = getActiveConversation();
  const messages = conversation?.messages || [];
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // Ensure individual mode when on this page
  useEffect(() => {
    setMode("individual");
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamingContent, statusMessage]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    addUserMessage(text);
    send({
      type: "chat_message",
      conversation_id: activeConversationId,
      content: text,
      style_profile_id: activeProfileId || "default",
      workflow_context: getWorkflowContext(),
    });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleExplore = () => {
    const text = input.trim();
    if (!text) return;
    setExplorePrompt(text);
    setShowExplore(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {conversation?.title || "New Conversation"}
          </h2>
          {activeProfile && (
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-primary/10 text-primary font-medium">
              {activeProfile.name}
            </span>
          )}
        </div>
        <button
          onClick={startNewConversation}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-foreground mb-1">AbleThor</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Describe what you want to create in Ableton Live. I'll handle the rest.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isStreaming && <StreamingMessage content={streamingContent} />}
        {isProcessing && !isStreaming && statusMessage && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-card border border-border rounded-bl-sm">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{statusMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Context Panel — Individual mode settings */}
      <IndividualContextPanel />

      {/* Input */}
      <div className="px-6 py-4 border-t border-border shrink-0">
        <ContextBadges />
        <div className="flex items-end gap-2 bg-input rounded-lg border border-border focus-within:ring-1 focus-within:ring-ring px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to create..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-[120px]"
          />
          {(isStreaming || isProcessing) ? (
            <button
              onClick={() => {
                send({ type: "abort" });
                useChatStore.getState().setStatus("done", "");
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shrink-0 text-xs font-medium"
            >
              <X size={14} />
              Stop
            </button>
          ) : (
            <>
              <button
                onClick={handleExplore}
                disabled={!input.trim()}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 text-[11px]"
                title="Generate 3 variations to preview before sending"
              >
                <Layers size={14} />
                Explore
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send size={16} />
              </button>
            </>
          )}
        </div>
        {activeProfile && (
          <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
            Using <span className="text-primary">{activeProfile.name}</span> profile
          </p>
        )}
      </div>

      {/* Explore Panel overlay */}
      {showExplore && (
        <IndividualExplorePanel
          prompt={explorePrompt}
          settings={individualSettings}
          onClose={() => setShowExplore(false)}
          onSent={() => { setShowExplore(false); setInput(""); }}
        />
      )}
    </div>
  );
}
