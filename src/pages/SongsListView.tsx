import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Copy, Trash2, Music, ChevronRight, Pencil, Check, X } from "lucide-react";
import type { Song } from "@/types";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { API_BASE } from "@/lib/api";

export default function SongsListView() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingSongId, setRenamingSongId] = useState<string | null>(null);
  const [renameSongValue, setRenameSongValue] = useState("");
  const [pendingDeleteSong, setPendingDeleteSong] = useState<Song | null>(null);

  const fetchSongs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/songs`);
      const data = await res.json();
      setSongs(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch(`${API_BASE}/api/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const song = await res.json();
    setNewName("");
    setShowCreate(false);
    navigate(`/songs/${song.id}`);
  };

  const handleCopy = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    const res = await fetch(`${API_BASE}/api/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${song.name} (Copy)`,
        key: song.key,
        scale: song.scale,
        tempo: song.tempo,
      }),
    });
    if (res.ok) fetchSongs();
  };

  const confirmDeleteSong = async () => {
    if (!pendingDeleteSong) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${pendingDeleteSong.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSongs((prev) => prev.filter((s) => s.id !== pendingDeleteSong.id));
      }
    } catch { /* silent */ }
    setPendingDeleteSong(null);
  };

  const startRenameSong = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    setRenamingSongId(song.id);
    setRenameSongValue(song.name);
  };

  const submitRenameSong = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!renamingSongId || !renameSongValue.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${renamingSongId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameSongValue.trim() }),
      });
      if (res.ok) {
        setSongs((prev) =>
          prev.map((s) => (s.id === renamingSongId ? { ...s, name: renameSongValue.trim() } : s))
        );
      }
    } catch { /* silent */ }
    setRenamingSongId(null);
  };

  const cancelRenameSong = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSongId(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold text-foreground">Compose Song</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          New Song
        </button>
      </div>

      {/* Create inline form */}
      {showCreate && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/30">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowCreate(false);
            }}
            placeholder="Song name..."
            autoFocus
            className="flex-1 max-w-sm bg-input border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowCreate(false);
              setNewName("");
            }}
            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Song list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Music className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">No songs yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Create a song to start composing with sections and tracks.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              New Song
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {songs.map((song) => (
              <button
                key={song.id}
                onClick={() => renamingSongId !== song.id && navigate(`/songs/${song.id}`)}
                className="flex items-center w-full px-6 py-3 hover:bg-muted/30 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  {renamingSongId === song.id ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameSongValue}
                        onChange={(e) => setRenameSongValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRenameSong(e);
                          if (e.key === "Escape") setRenamingSongId(null);
                        }}
                        className="flex-1 max-w-sm bg-input border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button onClick={submitRenameSong} className="p-1 text-primary hover:text-primary/80"><Check size={14} /></button>
                      <button onClick={cancelRenameSong} className="p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {song.name}
                        </span>
                        {song.key && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary shrink-0">
                            {song.key}
                            {song.scale ? ` ${song.scale.replace("_", " ")}` : ""}
                          </span>
                        )}
                        {song.tempo && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {song.tempo} BPM
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {song.sections?.length || 0} {(song.sections?.length || 0) === 1 ? "section" : "sections"} · {formatDate(song.created_at)}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                  <button
                    onClick={(e) => startRenameSong(e, song)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                    title="Rename"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => handleCopy(e, song)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPendingDeleteSong(song); }}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <ChevronRight
                  size={14}
                  className="text-muted-foreground/50 shrink-0 ml-2"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!pendingDeleteSong}
        onClose={() => setPendingDeleteSong(null)}
        onConfirm={confirmDeleteSong}
        title={`Delete "${pendingDeleteSong?.name}"?`}
        description="This will permanently delete this song and all its sections, tracks, and clips. This action cannot be undone."
      />
    </div>
  );
}
