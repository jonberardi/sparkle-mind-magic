import { NavLink, useLocation } from "react-router-dom";
import { MessageSquare, Radio, BookOpen, Settings2, Palette, Zap } from "lucide-react";
import { useWebSocketStore } from "@/stores/websocketStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useProfileStore } from "@/stores/profileStore";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Chat", icon: MessageSquare },
  { to: "/session", label: "Session", icon: Radio },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/preferences", label: "Preferences", icon: Settings2 },
  { to: "/profiles", label: "Profiles", icon: Palette },
];

export function Sidebar() {
  const { connectionStatus, abletonConnected } = useWebSocketStore();
  const session = useSessionStore((s) => s.session);
  const { profiles, activeProfileId, setActiveProfile } = useProfileStore();
  const location = useLocation();

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

  return (
    <aside className="flex flex-col w-[280px] min-w-[280px] h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <Zap className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-bold tracking-tight text-foreground">AbleThor</h1>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 px-5 pb-4">
        <span className={cn("w-2 h-2 rounded-full shrink-0", statusColor)} />
        <span className="text-xs text-muted-foreground truncate">{statusText}</span>
      </div>

      {/* Profile Selector */}
      <div className="px-4 pb-4">
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
          const isActive = location.pathname === to;
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

      {/* Session Info */}
      <div className="px-5 py-4 border-t border-sidebar-border space-y-1">
        <div className="text-xs text-muted-foreground">
          {session?.project_name || "No project"}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{session ? `${session.tempo} BPM` : "—"}</span>
          {session?.key && <span>{session.key}</span>}
        </div>
      </div>
    </aside>
  );
}
