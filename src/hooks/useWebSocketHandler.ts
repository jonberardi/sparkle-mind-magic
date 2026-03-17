import { useEffect } from "react";
import { useWebSocketStore } from "@/stores/websocketStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useChatStore } from "@/stores/chatStore";

export function useWebSocketHandler() {
  const { connect, setOnMessage } = useWebSocketStore();
  const { setSession } = useSessionStore();
  const {
    onConversationStarted,
    appendStreamChunk,
    addAssistantAction,
    addGeneration,
    setStatus,
  } = useChatStore();

  useEffect(() => {
    setOnMessage((data: any) => {
      switch (data.type) {
        case "session_state":
          setSession(data.state);
          break;
        case "conversation_started":
          onConversationStarted(data.conversation_id, data.title);
          break;
        case "assistant_text_chunk":
          appendStreamChunk(data.chunk, data.done);
          break;
        case "assistant_action":
          addAssistantAction(data.action);
          break;
        case "assistant_status":
          setStatus(data.status, data.message);
          break;
        case "generation_created":
          addGeneration(data.generation);
          break;
        case "error":
          console.error("Backend error:", data.message);
          setStatus("done", "");
          break;
      }
    });

    connect();
  }, []);
}
