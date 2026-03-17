import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, Settings } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflowStore";
import { SectionPills } from "./SectionPills";
import { SongSetupDialog } from "./SongSetupDialog";
import { SectionEditor } from "./SectionEditor";
import type { Song, SongSection, ChordEntry } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function SongContextPanel() {
  const {
    activeSong,
    sections,
    activeSectionId,
    setActiveSong,
    setActiveSection,
    addSection,
    updateSong,
    updateSection,
    clearSong,
    isPanelExpanded,
    setPanelExpanded,
  } = useWorkflowStore();

  const [showSongDialog, setShowSongDialog] = useState(false);
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [editingSection, setEditingSection] = useState<SongSection | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);

  // Fetch songs list
  useEffect(() => {
    fetch(`${API_BASE}/api/songs`)
      .then((r) => r.json())
      .then(setSongs)
      .catch(() => {});
  }, [activeSong]);

  const activeSection = sections.find((s) => s.id === activeSectionId);

  const handleCreateSong = async (data: {
    name: string;
    key: string | null;
    scale: string | null;
    tempo: number | null;
  }) => {
    const res = await fetch(`${API_BASE}/api/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const song = await res.json();
    setActiveSong(song, song.sections || []);
  };

  const handleSelectSong = async (songId: string) => {
    const res = await fetch(`${API_BASE}/api/songs/${songId}`);
    const song = await res.json();
    setActiveSong(song, song.sections || []);
  };

  const handleAddSection = async (data: {
    name: string;
    length_bars: number;
    chord_progression: ChordEntry[] | null;
    feel: string | null;
    energy: string | null;
  }) => {
    if (!activeSong) return;
    const res = await fetch(`${API_BASE}/api/songs/${activeSong.id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const section = await res.json();
    addSection(section);
    setActiveSection(section.id);
  };

  const handleEditSection = async (data: {
    name: string;
    length_bars: number;
    chord_progression: ChordEntry[] | null;
    feel: string | null;
    energy: string | null;
  }) => {
    if (!activeSong || !editingSection) return;
    const res = await fetch(
      `${API_BASE}/api/songs/${activeSong.id}/sections/${editingSection.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    const updated = await res.json();
    updateSection(editingSection.id, updated);
    setEditingSection(null);
  };

  // Build summary line
  const summary = activeSong
    ? [
        activeSong.name,
        activeSong.key ? `${activeSong.key}${activeSong.scale ? ` ${activeSong.scale.replace("_", " ")}` : ""}` : null,
        activeSection?.name,
        activeSection
          ? `${activeSection.length_bars} bars`
          : null,
      ]
        .filter(Boolean)
        .join(" | ")
    : "Select or create a song...";

  return (
    <div className="border-t border-border bg-card/50">
      {/* Collapsed summary / toggle */}
      <button
        onClick={() => setPanelExpanded(!isPanelExpanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{summary}</span>
        {isPanelExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {/* Expanded panel */}
      {isPanelExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {!activeSong ? (
            /* No song selected — show song picker */
            <div className="flex items-center gap-2">
              {songs.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleSelectSong(e.target.value);
                  }}
                  className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a song...</option>
                  {songs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setShowSongDialog(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-primary hover:text-primary/80 border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
              >
                <Plus size={12} />
                New Song
              </button>
            </div>
          ) : (
            /* Song selected — show song header + sections */
            <>
              {/* Song header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {activeSong.name}
                  </span>
                  {activeSong.key && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary">
                      {activeSong.key}
                      {activeSong.scale ? ` ${activeSong.scale.replace("_", " ")}` : ""}
                    </span>
                  )}
                  {activeSong.tempo && (
                    <span className="text-[10px] text-muted-foreground">
                      {activeSong.tempo} BPM
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowSongDialog(true)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit song"
                  >
                    <Settings size={12} />
                  </button>
                  <button
                    onClick={clearSong}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-1.5"
                  >
                    Switch
                  </button>
                </div>
              </div>

              {/* Section pills */}
              <SectionPills
                sections={sections}
                activeSectionId={activeSectionId}
                onSelect={setActiveSection}
                onAddSection={() => {
                  setEditingSection(null);
                  setShowSectionEditor(true);
                }}
              />

              {/* Active section detail */}
              {activeSection && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {activeSection.chord_progression &&
                      activeSection.chord_progression.length > 0 && (
                        <span>
                          {activeSection.chord_progression
                            .map((c) => `${c.root}${c.quality}`)
                            .join(" → ")}
                        </span>
                      )}
                    {activeSection.feel && (
                      <span className="text-[10px] italic">{activeSection.feel}</span>
                    )}
                    {activeSection.energy && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted">
                        {activeSection.energy}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditingSection(activeSection);
                      setShowSectionEditor(true);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Dialogs */}
      <SongSetupDialog
        open={showSongDialog}
        onClose={() => setShowSongDialog(false)}
        onSave={handleCreateSong}
        initial={
          activeSong
            ? {
                name: activeSong.name,
                key: activeSong.key,
                scale: activeSong.scale,
                tempo: activeSong.tempo,
              }
            : undefined
        }
      />
      <SectionEditor
        open={showSectionEditor}
        onClose={() => {
          setShowSectionEditor(false);
          setEditingSection(null);
        }}
        onSave={editingSection ? handleEditSection : handleAddSection}
        initial={
          editingSection
            ? {
                name: editingSection.name,
                length_bars: editingSection.length_bars,
                chord_progression: editingSection.chord_progression,
                feel: editingSection.feel,
                energy: editingSection.energy,
              }
            : undefined
        }
      />
    </div>
  );
}
