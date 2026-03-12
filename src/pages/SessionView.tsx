import { Play, Square, Music, Mic } from "lucide-react";
import { useSessionStore } from "@/stores/sessionStore";
import { useWebSocketStore } from "@/stores/websocketStore";
import { cn } from "@/lib/utils";

export default function SessionView() {
  const session = useSessionStore((s) => s.session);
  const { send } = useWebSocketStore();

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No session data. Connect to Ableton to see your session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Transport Bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => send({ type: "transport", action: "play" })}
            className={cn("p-2 rounded-md transition-colors", session.playing ? "bg-success/20 text-success" : "hover:bg-muted text-muted-foreground hover:text-foreground")}
          >
            <Play size={16} />
          </button>
          <button
            onClick={() => send({ type: "transport", action: "stop" })}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Square size={16} />
          </button>
        </div>
        <span className="text-sm font-mono text-foreground">{session.tempo} BPM</span>
        {session.key && <span className="text-sm text-muted-foreground">{session.key}</span>}
        <span className="ml-auto text-sm text-muted-foreground">{session.project_name}</span>
      </div>

      {/* Track Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
        <div className="flex gap-3 min-w-max">
          {session.tracks.map((track) => (
            <div key={track.id} className="w-[160px] bg-card rounded-lg border border-border p-3 space-y-3">
              {/* Track Header */}
              <div className="flex items-center gap-2">
                {track.type === "midi" ? (
                  <Music size={12} className="text-primary shrink-0" />
                ) : (
                  <Mic size={12} className="text-tag-mood shrink-0" />
                )}
                <span className="text-xs font-medium text-foreground truncate">{track.name}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                {(["arm", "mute", "solo"] as const).map((prop) => (
                  <button
                    key={prop}
                    onClick={() =>
                      send({ type: "set_track_property", track_id: track.id, property: prop, value: !track[prop === "arm" ? "armed" : prop === "mute" ? "muted" : "solo"] })
                    }
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors",
                      prop === "arm" && track.armed ? "bg-destructive/20 text-destructive" : "",
                      prop === "mute" && track.muted ? "bg-warning/20 text-warning" : "",
                      prop === "solo" && track.solo ? "bg-primary/20 text-primary" : "",
                      !(prop === "arm" && track.armed) && !(prop === "mute" && track.muted) && !(prop === "solo" && track.solo)
                        ? "bg-muted text-muted-foreground hover:text-foreground"
                        : ""
                    )}
                  >
                    {prop[0].toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Volume */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={track.volume}
                  onChange={(e) =>
                    send({ type: "set_track_property", track_id: track.id, property: "volume", value: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 accent-primary"
                />
                <span className="text-[10px] text-muted-foreground">{Math.round(track.volume * 100)}%</span>
              </div>

              {/* Devices */}
              {track.devices.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Devices</span>
                  {track.devices.map((d, i) => (
                    <div key={i} className="text-[11px] text-foreground truncate">{d.name}</div>
                  ))}
                </div>
              )}

              {/* Clip Slots */}
              <div className="space-y-0.5">
                {track.clips.map((clip) => (
                  <button
                    key={clip.scene_id}
                    onClick={() => clip.name && send({ type: "trigger_clip", track_id: track.id, scene_id: clip.scene_id })}
                    className={cn(
                      "w-full px-2 py-1 rounded text-[11px] text-left truncate transition-colors",
                      clip.name
                        ? "bg-primary/10 text-foreground hover:bg-primary/20 cursor-pointer"
                        : "bg-muted/30 text-muted-foreground/50 cursor-default"
                    )}
                  >
                    {clip.name || "—"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Radio(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
  );
}
