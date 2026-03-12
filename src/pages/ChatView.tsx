import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Plus } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useProfileStore } from "@/stores/profileStore";
import { useWebSocketStore } from "@/stores/websocketStore";
import { ChatMessage, StreamingMessage } from "@/components/ChatMessage";

export default function ChatView() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeConversationId,
    streamingContent,
    isStreaming,
    addUserMessage,
    startNewConversation,
    getActiveConversation,
  } = useChatStore();
  const { send } = useWebSocketStore();
  const { activeProfileId, profiles } = useProfileStore();

  const conversation = getActiveConversation();
  const messages = conversation?.messages || [];
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamingContent]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    addUserMessage(text);
    send({
      type: "chat_message",
      conversation_id: activeConversationId,
      content: text,
      style_profile_id: activeProfileId || "default",
    });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border shrink-0">
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
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        {activeProfile && (
          <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
            Using <span className="text-primary">{activeProfile.name}</span> profile
          </p>
        )}
      </div>
    </div>
  );
}
