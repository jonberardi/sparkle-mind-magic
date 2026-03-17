import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MessageSquare, BookOpen, Settings2, Palette, Zap, Wrench, RefreshCw, Activity, ScrollText, Music } from "lucide-react";
import { useWebSocketStore } from "@/stores/websocketStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useProfileStore } from "@/stores/profileStore";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Quick Create", icon: MessageSquare },
  { to: "/songs", label: "Song Workspace", icon: Music },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/preferences", label: "Preferences", icon: Settings2 },
  { to: "/styles", label: "Styles", icon: Palette },
  { to: "/logs", label: "Logs", icon: ScrollText },
];

export function Sidebar() {
  const { connectionStatus, abletonConnected } = useWebSocketStore();
  const session = useSessionStore((s) => s.session);
  const { profiles, activeProfileId, setActiveProfile } = useProfileStore();
  const location = useLocation();
  const [devOpen, setDevOpen] = useState(false);
  const [devStatus, setDevStatus] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  const statusColor =
    abletonConnected
      ? "bg-success"
      : connectionStatus === "connecting"
        ? "bg-warning animate-pulse-dot"
        : "bg-destructive";

  const statusText =
    abletonConnected
      ? "Connected to Ableton"
      : connectionStatus === "connecting"
        ? "Connecting..."
        : "Disconnected";

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // Fetch all profiles on mount so the selector is always populated
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/profiles`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          useProfileStore.getState().setProfiles(data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="flex flex-col w-[280px] min-w-[280px] h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <Zap className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-bold tracking-tight text-foreground">AbleThor</h1>
      </div>

      {/* Connection Status */}
      <div className={cn(
        "flex items-center gap-2 px-5 pb-4",
        !abletonConnected && connectionStatus !== "connecting" && "mx-3 mb-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20"
      )}>
        <span className={cn("w-2 h-2 rounded-full shrink-0", statusColor)} />
        <span className={cn(
          "text-xs truncate",
          !abletonConnected && connectionStatus !== "connecting"
            ? "text-destructive font-medium"
            : "text-muted-foreground"
        )}>
          {statusText}
        </span>
      </div>

      {/* Profile Selector */}
      <div className="px-4 pb-4">
        <span
          className="block text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1 px-1"
          title="Reusable generation defaults. Does not override the active song's style — song and section styles take priority during generation."
        >
          Style Profile
        </span>
        <select
          className="w-full px-3 py-1.5 text-xs rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={activeProfileId || ""}
          onChange={(e) => setActiveProfile(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Dev Tools — hidden in production */}
      {import.meta.env.DEV && <div className="border-t border-sidebar-border">
        <button
          onClick={() => setDevOpen(!devOpen)}
          className="flex items-center gap-2 w-full px-5 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Wrench className="w-3.5 h-3.5" />
          Dev Tools
          <span className="ml-auto text-[10px]">{devOpen ? "▾" : "▸"}</span>
        </button>

        {devOpen && (
          <div className="px-4 pb-3 space-y-1.5">
            {devStatus && (
              <div className="text-[10px] text-warning px-2 py-1 rounded bg-warning/10 mb-1">
                {devStatus}
              </div>
            )}
            <button
              onClick={async () => {
                setDevStatus("Restarting...");
                try {
                  await fetch("/api/dev/restart", { method: "POST" });
                  setDevStatus("Restart triggered — reloading in 2s...");
                  setTimeout(() => { setDevStatus(null); window.location.reload(); }, 2000);
                } catch { setDevStatus("Failed to reach server"); }
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restart Backend
            </button>
            <button
              onClick={async () => {
                setDevStatus("Pinging...");
                try {
                  const res = await fetch("/api/dev/osc-ping", { method: "POST" });
                  const data = await res.json();
                  setDevStatus(data.status === "ok" ? `OSC OK — ${data.tempo} BPM` : `OSC: ${data.message}`);
                  setTimeout(() => setDevStatus(null), 3000);
                } catch { setDevStatus("Failed to reach server"); }
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              Ping OSC
            </button>
            <button
              onClick={async () => {
                if (logsOpen) { setLogsOpen(false); return; }
                try {
                  const res = await fetch("/api/dev/logs?lines=50");
                  const data = await res.json();
                  setLogLines(data.lines || []);
                  setLogsOpen(true);
                } catch { setDevStatus("Failed to fetch logs"); }
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              {logsOpen ? "Hide Logs" : "View Logs"}
            </button>
          </div>
        )}

        {logsOpen && (
          <div className="mx-3 mb-3 max-h-[200px] overflow-y-auto rounded bg-black/40 border border-border">
            <pre className="p-2 text-[10px] leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap">
              {logLines.length > 0 ? logLines.join("\n") : "No logs yet"}
            </pre>
          </div>
        )}
      </div>}

      {/* Session Info */}
      <div className="px-5 py-4 border-t border-sidebar-border space-y-1">
        {abletonConnected && session ? (
          <>
            <div className="text-xs text-muted-foreground">
              {session.project_name || "Untitled Project"}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{session.tempo} BPM</span>
              {session.key && <span>{session.key}</span>}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground/60">
            {connectionStatus === "connecting" ? "Connecting..." : "No Session"}
          </div>
        )}
      </div>
    </aside>
  );
}
