import { useState, useEffect, useCallback } from "react";
import { Search, BookOpen, ChevronDown, ChevronUp, GripVertical, Music, Save, RefreshCw, Star, ThumbsUp, Filter, X } from "lucide-react";
import type { Generation, Song } from "@/types";
import { TagPill } from "@/components/TagPill";
import { StarRating } from "@/components/StarRating";
import { getSettings, updateSettings } from "@/lib/settingsApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface SongOption { id: string; name: string; sections: { id: string; name: string }[] }

const getMidiUrl = (generationId: string) =>
  `${API_URL}/api/generations/${generationId}/midi`;

function formatOutputType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Returns true if description adds meaningful info beyond the clip name. */
function isDescriptionUseful(clipName: string | undefined, description: string | undefined): boolean {
  if (!clipName || !description) return false;
  if (clipName === description) return false;
  // Suppress patterns like "Name — Name" or "Name - Name" where both halves are the clip name
  const normalized = description.replace(/\s*[—–-]\s*/g, "|");
  const parts = normalized.split("|").map((p) => p.trim());
  if (parts.length >= 2 && parts.every((p) => p === clipName)) return false;
  return true;
}

export default function LibraryView() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [autoSave, setAutoSave] = useState(true);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [thumbsFilter, setThumbsFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [songFilter, setSongFilter] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [outputTypeFilter, setOutputTypeFilter] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongOption[]>([]);

  // Load auto-save setting and songs list
  useEffect(() => {
    getSettings()
      .then((s) => setAutoSave(s.auto_save_to_library))
      .catch(() => {});
    fetch(`${API_URL}/api/songs`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSongs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const toggleAutoSave = async () => {
    const next = !autoSave;
    setAutoSave(next);
    try {
      await updateSettings({ auto_save_to_library: next });
    } catch {
      setAutoSave(!next); // revert on failure
    }
  };

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (minRating) params.set("min_rating", String(minRating));
      if (thumbsFilter) params.set("thumbs", thumbsFilter);
      if (songFilter) params.set("song_id", songFilter);
      if (sectionFilter) params.set("section_id", sectionFilter);
      if (outputTypeFilter) params.set("output_type", outputTypeFilter);
      const res = await fetch(`${API_URL}/api/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGenerations(Array.isArray(data) ? data : data.items || []);
      }
    } catch {
      // Backend not available
    } finally {
      setLoading(false);
    }
  }, [search, minRating, thumbsFilter, songFilter, sectionFilter, outputTypeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchLibrary, 300);
    return () => clearTimeout(timer);
  }, [fetchLibrary]);

  const handleRate = async (genId: string, rating: number) => {
    // Optimistic update
    setGenerations((prev) =>
      prev.map((g) => (g.id === genId ? { ...g, rating } : g))
    );
    try {
      await fetch(`${API_URL}/api/generations/${genId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
    } catch {
      // Revert on failure
      fetchLibrary();
    }
  };

  const togglePrompt = (genId: string) => {
    setExpandedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(genId)) next.delete(genId);
      else next.add(genId);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, gen: Generation) => {
    const data = gen.output_data || {};
    const clipName = (data.clip_name || "Clip").replace(/\s+/g, "_").replace(/[/\\]/g, "-");
    const url = getMidiUrl(gen.id);
    e.dataTransfer.setData("DownloadURL", `audio/midi:${clipName}.mid:${url}`);
    e.dataTransfer.setData("text/uri-list", url);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Library</h2>
          <button
            onClick={toggleAutoSave}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${
              autoSave
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}
            title={autoSave ? "Auto-save to library is ON" : "Auto-save to library is OFF"}
          >
            <Save size={12} />
            Auto-save {autoSave ? "on" : "off"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-input rounded-md border border-border px-3 py-1.5 focus-within:ring-1 focus-within:ring-ring">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search generations..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded border transition-colors ${
              showFilters || minRating || thumbsFilter || songFilter || sectionFilter || outputTypeFilter
                ? "border-primary/30 text-primary bg-primary/5"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle filters"
          >
            <Filter size={14} />
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="space-y-2">
            {/* Dropdown filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={songFilter || ""}
                onChange={(e) => {
                  setSongFilter(e.target.value || null);
                  setSectionFilter(null); // Reset section when song changes
                }}
                className="px-2 py-1 text-[11px] rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All Songs</option>
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {songFilter && (() => {
                const selectedSong = songs.find((s) => s.id === songFilter);
                const sections = selectedSong?.sections || [];
                return sections.length > 0 ? (
                  <select
                    value={sectionFilter || ""}
                    onChange={(e) => setSectionFilter(e.target.value || null)}
                    className="px-2 py-1 text-[11px] rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All Sections</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                ) : null;
              })()}

              <select
                value={outputTypeFilter || ""}
                onChange={(e) => setOutputTypeFilter(e.target.value || null)}
                className="px-2 py-1 text-[11px] rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All Types</option>
                <option value="midi_clip">MIDI Clip</option>
                <option value="effect_chain">Effect Chain</option>
                <option value="device_load">Device Load</option>
                <option value="parameter_set">Parameter Set</option>
                <option value="arrangement">Arrangement</option>
              </select>
            </div>

            {/* Rating & thumbs pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Rating:</span>

              {[3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(minRating === r ? null : r)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    minRating === r
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Star size={9} /> {r}+
                </button>
              ))}

              <button
                onClick={() => setThumbsFilter(thumbsFilter === "up" ? null : "up")}
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  thumbsFilter === "up"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <ThumbsUp size={9} /> Liked
              </button>

              {/* Clear all filters */}
              {(minRating || thumbsFilter || songFilter || sectionFilter || outputTypeFilter) && (
                <button
                  onClick={() => {
                    setMinRating(null); setThumbsFilter(null);
                    setSongFilter(null); setSectionFilter(null);
                    setOutputTypeFilter(null);
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading..." : "No generations yet. Start creating in Create Track!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {generations.map((gen) => {
              const data = gen.output_data || {};
              const hasNotes = data.notes && data.notes.length > 0;
              const promptExpanded = expandedPrompts.has(gen.id);

              return (
                <div
                  key={gen.id}
                  className="bg-card rounded-lg border border-border p-4 space-y-3 group"
                >
                  {/* Header: clip name + drag handle */}
                  <div className="flex items-start gap-2">
                    {hasNotes && (
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, gen)}
                        className="mt-0.5 cursor-grab active:cursor-grabbing shrink-0"
                        title="Drag into Ableton"
                      >
                        <GripVertical size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {data.clip_name || gen.description}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatOutputType(gen.output_type)}
                      </div>
                    </div>
                    {hasNotes && (
                      <a
                        href={getMidiUrl(gen.id)}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary border border-border rounded hover:border-primary/40 transition-colors"
                        title="Download MIDI — or drag into Ableton"
                      >
                        .mid
                      </a>
                    )}
                  </div>

                  {/* Description (if meaningfully different from clip name) */}
                  {isDescriptionUseful(data.clip_name, gen.description) && (
                    <div className="text-xs text-muted-foreground">{gen.description}</div>
                  )}

                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {data.note_count != null && (
                      <span className="flex items-center gap-1">
                        <Music size={10} /> {data.note_count} notes
                      </span>
                    )}
                    {data.clip_length_bars != null && (
                      <span>{data.clip_length_bars} bars</span>
                    )}
                    {data.track_name ? (
                      <span className="truncate max-w-[100px]" title={data.track_name}>{data.track_name}</span>
                    ) : data.track_id != null ? (
                      <span>Track {data.track_id}</span>
                    ) : null}
                    {gen.song_name && (
                      <span className="truncate max-w-[100px] text-primary/70" title={gen.song_name}>
                        {gen.song_name}
                      </span>
                    )}
                    {gen.section_name && (
                      <span className="truncate max-w-[80px]" title={gen.section_name}>
                        {gen.section_name}
                      </span>
                    )}
                    {gen.session_name && (
                      <span className="truncate max-w-[120px]" title={gen.session_name}>
                        {gen.session_name}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {gen.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {gen.tags.map((tag) => (
                        <TagPill key={tag.id} name={tag.name} category={tag.category} />
                      ))}
                    </div>
                  )}

                  {/* Rating + date + regenerate */}
                  <div className="flex items-center justify-between">
                    <StarRating
                      rating={gen.rating}
                      onChange={(r) => handleRate(gen.id, r)}
                      size={14}
                    />
                    <div className="flex items-center gap-2">
                      {hasNotes && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_URL}/api/library/${gen.id}/regenerate`, { method: "POST" });
                              if (res.ok) {
                                // Could open explore panel with result — for now just notify
                                const data = await res.json();
                                if (data.candidates) {
                                  alert(`Generated ${data.candidates.length} new candidates from "${data.prompt}". Send them via the Explore panel.`);
                                }
                              }
                            } catch { /* */ }
                          }}
                          className="p-1 text-muted-foreground/50 hover:text-primary transition-colors"
                          title="Regenerate from this clip's prompt & context"
                        >
                          <RefreshCw size={11} />
                        </button>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(gen.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Prompt reveal */}
                  {gen.prompt && (
                    <div>
                      <button
                        onClick={() => togglePrompt(gen.id)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {promptExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {promptExpanded ? "Hide prompt" : "Show prompt"}
                      </button>
                      {promptExpanded && (
                        <div className="mt-1.5 px-3 py-2 rounded bg-muted/40 border border-border text-xs text-foreground whitespace-pre-wrap">
                          {gen.prompt}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
