import { useState } from "react";
import { X, Plus, Wand2, Loader2 } from "lucide-react";
import { FLAT_NOTE_NAMES, SCALE_TYPES, STYLE_WORLDS, STYLE_WORLD_LABELS } from "@/types";

import { API_BASE } from "@/lib/api";

const STYLE_PRESETS = [
  "Neo-Soul", "Jazz", "Lo-Fi", "R&B", "Hip Hop", "Funk",
  "House", "Pop", "Rock", "Electronic", "Classical", "Ambient",
  "Latin", "Gospel", "Blues", "Afrobeats", "Disco", "Trap",
] as const;

interface SongSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    key: string | null;
    scale: string | null;
    tempo: number | null;
    style_tags: string[];
    reference_artists: string[];
    style_world: string | null;
    overall_feel: string | null;
    groove_tendency: string | null;
  }) => void;
  initial?: {
    name: string;
    key: string | null;
    scale: string | null;
    tempo: number | null;
    style_tags?: string[];
    reference_artists?: string[];
    style_world?: string | null;
    overall_feel?: string | null;
    groove_tendency?: string | null;
  };
  songId?: string;
  isNewSong?: boolean;
}

export function SongSetupDialog({ open, onClose, onSave, initial, songId, isNewSong }: SongSetupDialogProps) {
  const [name, setName] = useState(initial?.name || "");
  const [key, setKey] = useState(initial?.key || "");
  const [scale, setScale] = useState(initial?.scale || "");
  const [tempo, setTempo] = useState<string>(initial?.tempo?.toString() || "");
  const [styleTags, setStyleTags] = useState<string[]>(initial?.style_tags || []);
  const [refArtists, setRefArtists] = useState<string[]>(initial?.reference_artists || []);
  const [artistInput, setArtistInput] = useState("");
  const [styleWorld, setStyleWorld] = useState(initial?.style_world || "");
  const [overallFeel, setOverallFeel] = useState(initial?.overall_feel || "");
  const [grooveTendency, setGrooveTendency] = useState(initial?.groove_tendency || "");
  const [directionText, setDirectionText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  if (!open) return null;

  const toggleStyle = (tag: string) => {
    setStyleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addArtist = () => {
    const trimmed = artistInput.trim();
    if (trimmed && !refArtists.includes(trimmed)) {
      setRefArtists((prev) => [...prev, trimmed]);
    }
    setArtistInput("");
  };

  const removeArtist = (artist: string) => {
    setRefArtists((prev) => prev.filter((a) => a !== artist));
  };

  const handleAiRecommend = async () => {
    if (!songId || aiLoading) return;
    setAiLoading(true);
    setAiApplied(false);
    try {
      const res = await fetch(`${API_BASE}/api/songs/${songId}/ai-recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          style_tags: styleTags.length > 0 ? styleTags : undefined,
          reference_artists: refArtists.length > 0 ? refArtists : undefined,
          style_world: styleWorld || undefined,
          overall_feel: overallFeel || undefined,
          direction_text: directionText || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const rec = await res.json();

      // Apply recommendations to empty fields only
      if (rec.key && !key) setKey(rec.key);
      if (rec.scale && !scale) setScale(rec.scale);
      if (rec.tempo && !tempo) setTempo(String(rec.tempo));
      if (rec.style_world && !styleWorld) setStyleWorld(rec.style_world);
      if (rec.overall_feel && !overallFeel) setOverallFeel(rec.overall_feel);
      if (rec.groove_tendency && !grooveTendency) setGrooveTendency(rec.groove_tendency);
      setAiApplied(true);
    } catch {
      // silent — user can fill manually
    } finally {
      setAiLoading(false);
    }
  };

  // For new songs, require key, scale, and tempo
  const missingRequired = isNewSong && (!key || !scale || !tempo);

  const handleSave = () => {
    if (!name.trim()) return;
    if (missingRequired) return;
    onSave({
      name: name.trim(),
      key: key || null,
      scale: scale || null,
      tempo: tempo ? Number(tempo) : null,
      style_tags: styleTags,
      reference_artists: refArtists,
      style_world: styleWorld || null,
      overall_feel: overallFeel || null,
      groove_tendency: grooveTendency || null,
    });
    onClose();
  };

  const hasAnyHint = !!(name || styleTags.length || refArtists.length || styleWorld || overallFeel || directionText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            {isNewSong ? "Set Up Your Song" : initial ? "Edit Song" : "New Song"}
          </h3>
          {!isNewSong && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <label className="block">
            <span className="text-xs text-muted-foreground">Song Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Song"
              autoFocus
              className="mt-1 w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>

          {/* AI Recommend */}
          {songId && (
            <div className="rounded-md border border-border/60 bg-muted/30 px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-foreground">AI Recommend</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Fill in any details below, then let AI suggest the rest.
                  </p>
                </div>
                <button
                  onClick={handleAiRecommend}
                  disabled={aiLoading || !hasAnyHint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {aiLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Wand2 size={12} />
                  )}
                  {aiLoading ? "Thinking..." : "Recommend"}
                </button>
              </div>
              <input
                type="text"
                value={directionText}
                onChange={(e) => setDirectionText(e.target.value)}
                placeholder="Describe the vibe — e.g. 'late night deep house, moody and hypnotic'"
                className="w-full bg-input border border-border rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {aiApplied && (
                <p className="text-[10px] text-primary italic">
                  Suggestions applied to empty fields. Review and adjust below.
                </p>
              )}
            </div>
          )}

          {/* Key / Scale / BPM */}
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="text-xs text-muted-foreground">
                Key{isNewSong && <span className="text-destructive ml-0.5">*</span>}
              </span>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className={`mt-1 w-full bg-input border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${isNewSong && !key ? "border-destructive/40" : "border-border"}`}
              >
                <option value="">--</option>
                {FLAT_NOTE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex-1">
              <span className="text-xs text-muted-foreground">
                Scale{isNewSong && <span className="text-destructive ml-0.5">*</span>}
              </span>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                className={`mt-1 w-full bg-input border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${isNewSong && !scale ? "border-destructive/40" : "border-border"}`}
              >
                <option value="">--</option>
                {SCALE_TYPES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </label>
            <label className="w-24">
              <span className="text-xs text-muted-foreground">
                BPM{isNewSong && <span className="text-destructive ml-0.5">*</span>}
              </span>
              <input
                type="number" min={20} max={300} value={tempo}
                onChange={(e) => setTempo(e.target.value)} placeholder="--"
                className={`mt-1 w-full bg-input border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${isNewSong && !tempo ? "border-destructive/40" : "border-border"}`}
              />
            </label>
          </div>

          {/* Style World */}
          <div>
            <span className="text-xs text-muted-foreground block mb-1.5">Style World</span>
            <select
              value={styleWorld}
              onChange={(e) => setStyleWorld(e.target.value)}
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None (use style tags only)</option>
              {STYLE_WORLDS.map((sw) => (
                <option key={sw} value={sw}>{STYLE_WORLD_LABELS[sw]}</option>
              ))}
            </select>
            {styleWorld && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Sets default groove, density, feel, voicing, and phrase behavior for the song.
                Sections and tracks can override individual settings.
              </p>
            )}
          </div>

          {/* Overall Feel & Groove */}
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="text-xs text-muted-foreground">Overall Feel</span>
              <input
                type="text"
                value={overallFeel}
                onChange={(e) => setOverallFeel(e.target.value)}
                placeholder="e.g. groovy, atmospheric, energetic..."
                className="mt-1 w-full bg-input border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <label className="flex-1">
              <span className="text-xs text-muted-foreground">Groove Tendency</span>
              <select
                value={grooveTendency}
                onChange={(e) => setGrooveTendency(e.target.value)}
                className="mt-1 w-full bg-input border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">--</option>
                <option value="straight">Straight</option>
                <option value="syncopated">Syncopated</option>
                <option value="swung">Swung</option>
                <option value="broken">Broken</option>
              </select>
            </label>
          </div>

          {/* Style Tags */}
          <div>
            <span className="text-xs text-muted-foreground block mb-1.5">Style / Genre Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleStyle(tag)}
                  className={`px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                    styleTags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Artists */}
          <div>
            <span className="text-xs text-muted-foreground block mb-1.5">Reference Artists</span>
            {refArtists.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {refArtists.map((artist) => (
                  <span
                    key={artist}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-primary/10 text-primary"
                  >
                    {artist}
                    <button onClick={() => removeArtist(artist)} className="hover:text-destructive">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArtist(); } }}
                placeholder="e.g. Erykah Badu, D'Angelo..."
                className="flex-1 bg-input border border-border rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={addArtist}
                disabled={!artistInput.trim()}
                className="px-2 py-1.5 text-xs bg-muted text-muted-foreground hover:text-foreground rounded disabled:opacity-40 transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <div>
            {isNewSong && missingRequired && (
              <span className="text-[10px] text-muted-foreground">
                Key, Scale, and BPM are required to start.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!isNewSong && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!name.trim() || missingRequired}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {isNewSong ? "Save & Start" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
