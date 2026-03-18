/**
 * Centralized API and WebSocket base URLs.
 *
 * In development (Vite dev server), routes to the backend on localhost:8000.
 * In production (frontend served by FastAPI), uses same-origin relative URLs.
 */

const isDev = import.meta.env.DEV;

export const API_BASE: string = isDev
  ? (import.meta.env.VITE_API_URL || "http://localhost:8000")
  : "";

export const WS_BASE: string = isDev
  ? (import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws")
  : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
