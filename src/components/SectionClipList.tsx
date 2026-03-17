import { useState, useCallback } from "react";
import { Music, Layers, Clock, ChevronRight, ChevronDown, Plus, GripVertical, Pencil, Check, X, Trash2, AlertTriangle } from "lucide-react";
import type { Generation, Song, SongSection } from "@/types";
import { useSessionStore } from "@/stores/sessionStore";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface SectionClipListProps {
  clips: Generation[];
  sectionName: string;
  onRefresh: () => void;
  onSelectTrack?: (conversationId: string) => void;
  onNewTrack?: () => void;
  activeConversationId?: string | null;
  song?: Song | null;
  section?: SongSection | null;
}

/** Check if a generation's context snapshot is out of sync with current song/section. */
function isOutOfSync(
  clip: Generation,
  song?: Song | null,
  section?: SongSection | null,
): string | null {
  const snapshot = clip.output_data?.context_snapshot;
  if (!snapshot) return null; // no snapshot = can't determine, assume ok

  const diffs: string[] = [];

  if (song) {
    if (snapshot.key && snapshot.key !== song.key) diffs.push("key");
    if (snapshot.scale && snapshot.scale !== song.scale) diffs.push("scale");
    if (snapshot.tempo && song.tempo && snapshot.tempo !== song.tempo) diffs.push("tempo");
    if (snapshot.style_world && song.style_world && snapshot.style_world !== song.style_world) diffs.push("style world");
  }

  if (section) {
    // Compare chord progressions by JSON
    if (snapshot.chord_progression && section.chord_progression) {
      const snapChords = JSON.stringify(snapshot.chord_progression);
      const currentChords = JSON.stringify(section.chord_progression);
      if (snapChords !== currentChords) diffs.push("chords");
    }
    if (snapshot.length_bars && snapshot.length_bars !== section.length_bars) diffs.push("length");
    if (snapshot.feel && section.feel && snapshot.feel !== section.feel) diffs.push("feel");
    if (snapshot.energy && section.energy && snapshot.energy !== section.energy) diffs.push("energy");
  }

  return diffs.length > 0 ? diffs.join(", ") : null;
}

interface InstrumentGroup {
  trackName: string;
  trackId: number | null;
  conversationId: string | null;
  clips: Generation[];
}

export function SectionClipList({
  clips,
  sectionName,
  onRefresh,
  onSelectTrack,
  onNewTrack,
  activeConversationId,
  song,
  section,
}: SectionClipListProps) {
  const session = useSessionStore((s) => s.session);
  const trackNameOverrides = useSessionStore((s) => s.trackNameOverrides);
  const setTrackNameOverride = useSessionStore((s) => s.setTrackNameOverride);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Track rename state
  const [renamingTrackId, setRenamingTrackId] = useState<number | null>(null);
  const [renameTrackValue, setRenameTrackValue] = useState("");

  // Clip rename state
  const [renamingClipId, setRenamingClipId] = useState<string | null>(null);
  const [renameClipValue, setRenameClipValue] = useState("");

  // Delete confirmation state
  const [pendingDeleteTrack, setPendingDeleteTrack] = useState<InstrumentGroup | null>(null);
  const [pendingDeleteClipId, setPendingDeleteClipId] = useState<string | null>(null);
  const [pendingDeleteClipName, setPendingDeleteClipName] = useState("");

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const resolveTrackName = (trackId: number | null | undefined): string => {
    if (trackId == null) return "Unknown Track";
    if (trackNameOverrides[trackId]) return trackNameOverrides[trackId];
    const track = session?.tracks?.find((t) => t.id === trackId);
    return track?.name || `Track ${trackId}`;
  };

  // Group clips by track
  const grouped: InstrumentGroup[] = [];
  const trackMap = new Map<number | string, Generation[]>();

  for (const clip of clips) {
    const trackId = clip.output_data?.track_id;
    const key = trackId ?? "unknown";
    if (!trackMap.has(key)) trackMap.set(key, []);
    trackMap.get(key)!.push(clip);
  }

  for (const [key, groupClips] of trackMap) {
    const trackId = typeof key === "number" ? key : null;
    const conversationId = groupClips[0]?.conversation_id || null;
    grouped.push({
      trackName: resolveTrackName(trackId),
      trackId,
      conversationId,
      clips: groupClips,
    });
  }

  const toggleExpand = (e: React.MouseEvent, trackName: string) => {
    e.stopPropagation();
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(trackName)) next.delete(trackName);
      else next.add(trackName);
      return next;
    });
  };

  const getMidiUrl = (generationId: string) =>
    `${API_BASE}/api/generations/${generationId}/midi`;

  const handleDragStart = useCallback((e: React.DragEvent, clip: Generation) => {
    const data = clip.output_data || {};
    const clipName = (data.clip_name || "Clip").replace(/\s+/g, "_").replace(/[/\\]/g, "-");
    const url = getMidiUrl(clip.id);
    e.dataTransfer.setData("DownloadURL", `audio/midi:${clipName}.mid:${url}`);
    e.dataTransfer.setData("text/uri-list", url);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  // ── Track rename ──
  const startRenameTrack = (e: React.MouseEvent, trackId: number, currentName: string) => {
    e.stopPropagation();
    setRenamingTrackId(trackId);
    setRenameTrackValue(currentName);
  };

  const submitRenameTrack = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (renamingTrackId == null || !renameTrackValue.trim()) return;
    const newName = renameTrackValue.trim();

    // Persist the override locally — survives session_state refreshes from Ableton
    setTrackNameOverride(renamingTrackId, newName);

    // Best-effort: also rename in Ableton via OSC
    try {
      await fetch(`${API_BASE}/api/tracks/${renamingTrackId}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
    } catch { /* Ableton may not be connected — local rename still applies */ }

    onRefresh();
    setRenamingTrackId(null);
  };

  const cancelRenameTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingTrackId(null);
  };

  // ── Clip rename ──
  const startRenameClip = (e: React.MouseEvent, clipId: string, currentName: string) => {
    e.stopPropagation();
    setRenamingClipId(clipId);
    setRenameClipValue(currentName);
  };

  const submitRenameClip = async (e: React.MouseEvent | React.KeyboardEvent, clipId: string) => {
    e.stopPropagation();
    if (!renameClipValue.trim()) return;
    try {
      await fetch(`${API_BASE}/api/generations/${clipId}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameClipValue.trim() }),
      });
      onRefresh();
    } catch { /* silent */ }
    setRenamingClipId(null);
  };

  const cancelRenameClip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingClipId(null);
  };

  // ── Track delete (deletes all clips in the group) ──
  const confirmDeleteTrack = async () => {
    if (!pendingDeleteTrack) return;
    try {
      await Promise.all(
        pendingDeleteTrack.clips.map((clip) =>
          fetch(`${API_BASE}/api/generations/${clip.id}`, { method: "DELETE" })
        )
      );
      onRefresh();
    } catch { /* silent */ }
    setPendingDeleteTrack(null);
  };

  // ── Clip delete ──
  const confirmDeleteClip = async () => {
    if (!pendingDeleteClipId) return;
    try {
      await fetch(`${API_BASE}/api/generations/${pendingDeleteClipId}`, { method: "DELETE" });
      onRefresh();
    } catch { /* silent */ }
    setPendingDeleteClipId(null);
    setPendingDeleteClipName("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-foreground">
          Tracks
          {grouped.length > 0 && (
            <span className="ml-1.5 text-muted-foreground font-normal">({grouped.length})</span>
          )}
        </h3>
        {clips.length > 0 && (
          <button
            onClick={onRefresh}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Refresh
          </button>
        )}
      </div>

      {clips.length === 0 && !onNewTrack && (
        <div className="text-center py-4">
          <Layers className="w-6 h-6 text-muted-foreground/20 mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground">
            No tracks generated yet for {sectionName}.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        {grouped.map((group) => {
          const isExpanded = expandedGroups.has(group.trackName);
          const isSelected = group.conversationId != null && group.conversationId === activeConversationId;
          const isRenamingTrack = renamingTrackId === group.trackId;

          return (
            <div
              key={group.trackId ?? group.trackName}
              className={`rounded-md border overflow-hidden transition-colors ${
                isSelected ? "border-primary/50 bg-primary/5" : "border-border"
              }`}
            >
              {/* Track header */}
              <div
                onClick={() => {
                  if (group.conversationId && onSelectTrack) {
                    onSelectTrack(group.conversationId);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group/track ${
                  isSelected ? "bg-primary/10" : "bg-muted/40 hover:bg-muted/60"
                }`}
              >
                <button
                  onClick={(e) => toggleExpand(e, group.trackName)}
                  className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <Music size={12} className="text-primary/70 shrink-0" />

                {isRenamingTrack ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={renameTrackValue}
                      onChange={(e) => setRenameTrackValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitRenameTrack(e); if (e.key === "Escape") setRenamingTrackId(null); }}
                      className="flex-1 bg-input border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
                    />
                    <button onClick={submitRenameTrack} className="p-0.5 text-primary hover:text-primary/80"><Check size={12} /></button>
                    <button onClick={cancelRenameTrack} className="p-0.5 text-muted-foreground hover:text-foreground"><X size={12} /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-[11px] font-medium text-foreground truncate">{group.trackName}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {group.clips.length} clip{group.clips.length !== 1 ? "s" : ""}
                    </span>
                    <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/track:opacity-100 transition-opacity shrink-0">
                      {group.trackId != null && (
                        <button
                          onClick={(e) => startRenameTrack(e, group.trackId!, group.trackName)}
                          className="p-0.5 text-muted-foreground opacity-60 hover:!opacity-100 hover:text-primary transition-all"
                          title="Rename track"
                        >
                          <Pencil size={10} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteTrack(group); }}
                        className="p-0.5 text-muted-foreground opacity-60 hover:!opacity-100 hover:text-destructive transition-all"
                        title="Delete track and all clips"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Expanded clip list */}
              {isExpanded && (
                <div className="divide-y divide-border/50">
                  {group.clips.map((clip) => {
                    const data = clip.output_data || {};
                    const hasNotes = data.notes && data.notes.length > 0;
                    const isRenamingClip = renamingClipId === clip.id;
                    const clipDisplayName = data.clip_name || "Clip";
                    const syncDiff = isOutOfSync(clip, song, section);

                    return (
                      <div
                        key={clip.id}
                        draggable={hasNotes && !isRenamingClip}
                        onDragStart={hasNotes && !isRenamingClip ? (e) => handleDragStart(e, clip) : undefined}
                        className={`flex items-center gap-2 px-3 py-1.5 hover:bg-muted/20 transition-colors group/clip ${
                          hasNotes && !isRenamingClip ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                      >
                        {/* Drag handle */}
                        <div className="w-4 flex justify-center shrink-0">
                          {hasNotes && !isRenamingClip && (
                            <GripVertical size={10} className="text-muted-foreground/30 group-hover/clip:text-muted-foreground transition-colors" />
                          )}
                        </div>

                        {/* Clip name — inline rename or display */}
                        {isRenamingClip ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={renameClipValue}
                              onChange={(e) => setRenameClipValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitRenameClip(e, clip.id);
                                if (e.key === "Escape") setRenamingClipId(null);
                              }}
                              className="flex-1 bg-input border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
                            />
                            <button onClick={(e) => submitRenameClip(e, clip.id)} className="p-0.5 text-primary hover:text-primary/80 shrink-0"><Check size={11} /></button>
                            <button onClick={cancelRenameClip} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"><X size={11} /></button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-foreground truncate">
                                  {clipDisplayName}
                                </span>
                                {data.note_count != null && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">{data.note_count} notes</span>
                                )}
                                {data.clip_length_bars != null && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">{data.clip_length_bars} bars</span>
                                )}
                                {syncDiff && (
                                  <span
                                    className="flex items-center gap-0.5 text-[9px] text-amber-500 shrink-0"
                                    title={`Out of sync: ${syncDiff} changed since generation`}
                                  >
                                    <AlertTriangle size={9} />
                                    sync
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Clip actions */}
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/clip:opacity-100 transition-opacity">
                              {hasNotes && (
                                <a
                                  href={getMidiUrl(clip.id)}
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                  title="Download MIDI — or drag into Ableton"
                                >
                                  .mid
                                </a>
                              )}
                              <button
                                onClick={(e) => startRenameClip(e, clip.id, clipDisplayName)}
                                className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                title="Rename clip"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setPendingDeleteClipId(clip.id); setPendingDeleteClipName(clipDisplayName); }}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                title="Delete clip"
                              >
                                <Trash2 size={10} />
                              </button>
                              {clip.created_at && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground pl-1">
                                  <Clock size={9} />
                                  {formatTime(clip.created_at)}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Track button */}
      {onNewTrack && (
        <button
          onClick={onNewTrack}
          className="flex items-center gap-1.5 mt-2 px-3 py-2 w-full text-[11px] text-muted-foreground hover:text-primary border border-dashed border-border rounded-md hover:border-primary/40 transition-colors"
        >
          <Plus size={12} />
          New Track
        </button>
      )}

      {/* Delete confirmation dialogs */}
      <ConfirmDeleteDialog
        open={!!pendingDeleteTrack}
        onClose={() => setPendingDeleteTrack(null)}
        onConfirm={confirmDeleteTrack}
        title={`Delete "${pendingDeleteTrack?.trackName}"?`}
        description={`This will permanently delete ${pendingDeleteTrack?.clips.length ?? 0} clip${(pendingDeleteTrack?.clips.length ?? 0) !== 1 ? "s" : ""} in this track. This action cannot be undone.`}
      />
      <ConfirmDeleteDialog
        open={!!pendingDeleteClipId}
        onClose={() => { setPendingDeleteClipId(null); setPendingDeleteClipName(""); }}
        onConfirm={confirmDeleteClip}
        title={`Delete "${pendingDeleteClipName}"?`}
        description="This will permanently delete this clip. This action cannot be undone."
      />
    </div>
  );
}
