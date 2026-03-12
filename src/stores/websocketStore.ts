import { create } from "zustand";
import type { ConnectionStatus, SessionState } from "@/types";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

interface WebSocketStore {
  ws: WebSocket | null;
  connectionStatus: ConnectionStatus;
  abletonConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  send: (message: Record<string, any>) => void;
  onMessage: ((data: any) => void) | null;
  setOnMessage: (handler: (data: any) => void) => void;
}

export const useWebSocketStore = create<WebSocketStore>((set, get) => {
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = 1000;

  const connect = () => {
    const existing = get().ws;
    if (existing && existing.readyState === WebSocket.OPEN) return;

    set({ connectionStatus: "connecting" });

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      set({ ws, connectionStatus: "connected" });
      reconnectDelay = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connection_status") {
          set({ abletonConnected: data.ableton_connected });
        }
        const handler = get().onMessage;
        if (handler) handler(data);
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    };

    ws.onclose = () => {
      set({ ws: null, connectionStatus: "disconnected" });
      reconnectTimeout = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        connect();
      }, reconnectDelay);
    };

    ws.onerror = () => {
      ws.close();
    };

    set({ ws });
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    const ws = get().ws;
    if (ws) ws.close();
    set({ ws: null, connectionStatus: "disconnected" });
  };

  const send = (message: Record<string, any>) => {
    const ws = get().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  return {
    ws: null,
    connectionStatus: "disconnected",
    abletonConnected: false,
    connect,
    disconnect,
    send,
    onMessage: null,
    setOnMessage: (handler) => set({ onMessage: handler }),
  };
});
