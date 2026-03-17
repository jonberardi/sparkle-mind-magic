import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useWebSocketHandler } from "@/hooks/useWebSocketHandler";
import { AlertTriangle } from "lucide-react";

const MIN_WIDTH = 1080;

export function AppLayout() {
  useWebSocketHandler();
  const [tooNarrow, setTooNarrow] = useState(false);

  useEffect(() => {
    const check = () => setTooNarrow(window.innerWidth < MIN_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        {tooNarrow && (
          <div className="absolute inset-x-0 top-0 z-40 flex items-center gap-2 px-4 py-2 bg-warning/10 border-b border-warning/30 text-warning text-xs">
            <AlertTriangle size={14} />
            <span>Window is too narrow for the best experience. Resize to at least {MIN_WIDTH}px wide.</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
