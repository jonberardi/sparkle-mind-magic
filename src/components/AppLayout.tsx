import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useWebSocketHandler } from "@/hooks/useWebSocketHandler";

export function AppLayout() {
  useWebSocketHandler();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
