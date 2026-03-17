import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Play, Square, RefreshCw, Loader2, Link2, Upload, Music } from "lucide-react";
import type { ChordEntry, InheritanceState } from "@/types";
import {
  ENERGY_LEVELS, STYLE_WORLDS, STYLE_WORLD_LABELS,
  DENSITY_TENDENCIES, RHYTHMIC_TENDENCIES, PHRASE_BEHAVIORS,
  HARMONIC_TENSIONS, BRIGHTNESS_LEVELS,
} from "@/types";
import { ChordProgressionInput } from "./ChordProgressionInput";
import { previewProgression } from "@/lib/chordPreview";
import { useSessionStore } from "@/stores/sessionStore";
import { InheritanceBadge } from "./InheritanceBadge";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface SectionEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    length_bars: number;
    chord_progression: ChordEntry[] | null;
    feel: string | null;
    energy: string | null;
    style_world: string | null;
    mood: string | null;
    density_tendency: string | null;
    rhythmic_tendency: string | null;
    phrase_behavior: string | null;
    harmonic_tension: string | null;
    brightness: string | null;
  }) => void;
  initial?: {
    name: string;
    length_bars: number;
    chord_progression: ChordEntry[] | null;
    feel: string | null;
    energy: string | null;
    style_world?: string | null;
    mood?: string | null;
    density_tendency?: string | null;
    rhythmic_tendency?: string | null;
    phrase_behavior?: string | null;
    harmonic_tension?: string | null;
    brightness?: string | null;
  };
  songId?: string;
  sectionId?: string;
  songKey?: string | null;
  songScale?: string | null;
  songTempo?: number | null;
}

export function SectionEditor({ open, onClose, onSave, initial, songId, sectionId, songKey, songScale, songTempo }: SectionEditorProps) {
  const session = useSessionStore((s) => s.session);

  const [name, setName] = useState(initial?.name || "");
  const [lengthBars, setLengthBars] = useState(initial?.length_bars || 8);
  const [progression, setProgression] = useState<ChordEntry[]>(
    initial?.chord_progression || []
  );
  const [feel, setFeel] = useState(initial?.feel || "");
  const [energy, setEnergy] = useState(initial?.energy || "");
  const [sectionStyleWorld, setSectionStyleWorld] = useState(initial?.style_world || "");
  const [mood, setMood] = useState(initial?.mood || "");
  const [densityTendency, setDensityTendency] = useState(initial?.density_tendency || "");
  const [rhythmicTendency, setRhythmicTendency] = useState(initial?.rhythmic_tendency || "");
  const [phraseBehavior, setPhraseBehavior] = useState(initial?.phrase_behavior || "");
  const [harmonicTension, setHarmonicTension] = useState(initial?.harmonic_tension || "");
  const [brightness, setBrightness] = useState(initial?.brightness || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset all fields when the dialog opens or the initial data changes
  useEffect(() => {
    if (!open) return;
    setName(initial?.name || "");
    setLengthBars(initial?.length_bars || 8);
    setProgression(initial?.chord_progression || []);
    setFeel(initial?.feel || "");
    setEnergy(initial?.energy || "");
    setSectionStyleWorld(initial?.style_world || "");
    setMood(initial?.mood || "");
    setDensityTendency(initial?.density_tendency || "");
    setRhythmicTendency(initial?.rhythmic_tendency || "");
    setPhraseBehavior(initial?.phrase_behavior || "");
    setHarmonicTension(initial?.harmonic_tension || "");
    setBrightness(initial?.brightness || "");
    // Auto-expand advanced if any override is set
    setShowAdvanced(!!(
      initial?.style_world || initial?.mood || initial?.density_tendency ||
      initial?.rhythmic_tendency || initial?.phrase_behavior ||
      initial?.harmonic_tension || initial?.brightness
    ));
  }, [open, initial]);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestionSource, setSuggestionSource] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  // From-MIDI chord detection state
  const [chordRefMode, setChordRefMode] = useState<"none" | "clip" | "file">("none");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [refTrackId, setRefTrackId] = useState("");
  const [refSceneId, setRefSceneId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inheritance state — fetched for existing sections to show field provenance
  const [inheritance, setInheritance] = useState<Record<string, InheritanceState | "style_world">>({});
  useEffect(() => {
    if (!open || !songId || !sectionId) { setInheritance({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/songs/${songId}/resolved-context`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_id: sectionId }),
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setInheritance(data.inheritance || {});
        }
      } catch { /* non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [open, songId, sectionId]);

  const midiTracks = (session?.tracks || []).filter((t) => t.type === "midi");
  const selectedRefTrack = midiTracks.find((t) => t.id.toString() === refTrackId);
  const refTrackClips = selectedRefTrack?.clips.filter((c) => c.name) || [];

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    stopPreview();
    onSave({
      name: name.trim(),
      length_bars: lengthBars,
      chord_progression: progression.length > 0 ? progression : null,
      feel: feel || null,
      energy: energy || null,
      style_world: sectionStyleWorld || null,
      mood: mood || null,
      density_tendency: densityTendency || null,
      rhythmic_tendency: rhythmicTendency || null,
      phrase_behavior: phraseBehavior || null,
      harmonic_tension: harmonicTension || null,
      brightness: brightness || null,
    });
    onClose();
  };

  const handleSuggest = async () => {
    if (!songId) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const res = await fetch(`/api/songs/${songId}/suggest-progression`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_name: name || "Section",
          length_bars: lengthBars,
          feel: feel || undefined,
          energy: energy || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to suggest chords" }));
        throw new Error(err.detail || "Failed to suggest chords");
      }
      const data = await res.json();
      if (data.progression && Array.isArray(data.progression)) {
        setProgression(data.progression);
        setSuggestionSource(data.source || null);
        setChordRefMode("none");
      }
    } catch (err: any) {
      setSuggestError(err.message || "Something went wrong");
    } finally {
      setSuggesting(false);
    }
  };

  const handleDetectFromClip = async () => {
    if (!refTrackId || !refSceneId) return;
    setDetecting(true);
    setDetectError(null);
    try {
      const res = await fetch("/api/detect-chords/from-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track_id: Number(refTrackId), scene_id: Number(refSceneId) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to detect chords");
      }
      const data = await res.json();
      if (data.progression?.length > 0) {
        setProgression(data.progression);
        setChordRefMode("none");
      } else {
        setDetectError("No chords detected in that clip — try a different one.");
      }
    } catch (err: any) {
      setDetectError(err.message || "Something went wrong");
    } finally {
      setDetecting(false);
    }
  };

  const handleDetectFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDetecting(true);
    setDetectError(null);
    setChordRefMode("file");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/detect-chords/from-midi", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to detect chords");
      }
      const data = await res.json();
      if (data.progression?.length > 0) {
        setProgression(data.progression);
        setChordRefMode("none");
      } else {
        setDetectError("No chords detected in that file.");
      }
    } catch (err: any) {
      setDetectError(err.message || "Something went wrong");
    } finally {
      setDetecting(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePreview = () => {
    if (progression.length === 0) return;
    stopPreview();
    const stop = previewProgression(progression, songTempo || 120);
    stopRef.current = stop;
    setIsPlaying(true);
    const beatDuration = 60 / (songTempo || 120);
    const totalBars = progression.reduce((sum, c) => sum + (c.bars || 2), 0);
    const totalMs = totalBars * 4 * beatDuration * 1000;
    setTimeout(() => setIsPlaying(false), totalMs + 200);
  };

  const stopPreview = () => {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleRegenerateChord = async (index: number) => {
    if (!songId) return;
    const res = await fetch(`/api/songs/${songId}/suggest-single-chord`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        index,
        progression: progression,
        section_name: name || "Section",
        feel: feel || undefined,
        energy: energy || undefined,
      }),
    });
    if (!res.ok) throw new Error("Failed to suggest chord");
    const chord = await res.json();
    if (chord.root && chord.quality) {
      setProgression((prev) =>
        prev.map((c, i) =>
          i === index ? { ...c, root: chord.root, quality: chord.quality } : c
        )
      );
    }
  };

  const sectionPresets = ["Intro", "Verse", "Pre-Chorus", "Chorus", "Bridge", "Breakdown", "Outro"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            {initial ? "Edit Section" : "Add Section"}
          </h3>
          <button onClick={() => { stopPreview(); onClose(); }} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Section name */}
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Section Name</span>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {sectionPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setName(preset)}
                  className={`px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                    name === preset
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Custom name..."
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Length and feel */}
          <div className="flex gap-3">
            <label className="w-20">
              <span className="text-xs text-muted-foreground">Bars</span>
              <input
                type="number"
                min={1}
                max={64}
                value={lengthBars}
                onChange={(e) => setLengthBars(Number(e.target.value))}
                className="mt-1 w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>

            <label className="flex-1">
              <span className="text-xs text-muted-foreground">Feel</span>
              <input
                type="text"
                value={feel}
                onChange={(e) => setFeel(e.target.value)}
                placeholder="e.g. groovy, atmospheric"
                className="mt-1 w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>

            <label className="w-28">
              <span className="text-xs text-muted-foreground">Energy</span>
              <select
                value={energy}
                onChange={(e) => setEnergy(e.target.value)}
                className="mt-1 w-full bg-input border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">--</option>
                {ENERGY_LEVELS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Section Musical Identity (progressive disclosure) */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}>&#9654;</span>
              {(mood || densityTendency || rhythmicTendency || sectionStyleWorld)
                ? "Override Song Defaults (customized)"
                : "Override Song Defaults"}
            </button>
            {showAdvanced && (
              <div className="mt-2 space-y-2.5 pl-1">
                {/* Style world override */}
                <label className="block">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                    Style World Override
                    {inheritance.style_world && <InheritanceBadge state={inheritance.style_world} />}
                  </span>
                  <select
                    value={sectionStyleWorld}
                    onChange={(e) => setSectionStyleWorld(e.target.value)}
                    className="mt-0.5 w-full bg-input border border-border rounded px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Inherit from song</option>
                    {STYLE_WORLDS.map((sw) => (
                      <option key={sw} value={sw}>{STYLE_WORLD_LABELS[sw]}</option>
                    ))}
                  </select>
                </label>

                {/* Mood */}
                <label className="block">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                    Mood
                    {inheritance.mood && <InheritanceBadge state={inheritance.mood} />}
                  </span>
                  <input
                    type="text"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="e.g. soulful, dark, uplifting..."
                    className="mt-0.5 w-full bg-input border border-border rounded px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </label>

                {/* Density / Rhythm / Phrase row */}
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                      Density
                      {inheritance.density && <InheritanceBadge state={inheritance.density} />}
                    </span>
                    <select
                      value={densityTendency}
                      onChange={(e) => setDensityTendency(e.target.value)}
                      className="mt-0.5 w-full bg-input border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">--</option>
                      {DENSITY_TENDENCIES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                      Rhythm
                      {inheritance.rhythmic_tendency && <InheritanceBadge state={inheritance.rhythmic_tendency} />}
                    </span>
                    <select
                      value={rhythmicTendency}
                      onChange={(e) => setRhythmicTendency(e.target.value)}
                      className="mt-0.5 w-full bg-input border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">--</option>
                      {RHYTHMIC_TENDENCIES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                      Phrase
                      {inheritance.phrase_behavior && <InheritanceBadge state={inheritance.phrase_behavior} />}
                    </span>
                    <select
                      value={phraseBehavior}
                      onChange={(e) => setPhraseBehavior(e.target.value)}
                      className="mt-0.5 w-full bg-input border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">--</option>
                      {PHRASE_BEHAVIORS.map((p) => <option key={p} value={p}>{p.replace("_", "-")}</option>)}
                    </select>
                  </label>
                </div>

                {/* Harmonic tension / Brightness row */}
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                      Harmonic Tension
                      {inheritance.harmonic_tension && <InheritanceBadge state={inheritance.harmonic_tension} />}
                    </span>
                    <select
                      value={harmonicTension}
                      onChange={(e) => setHarmonicTension(e.target.value)}
                      className="mt-0.5 w-full bg-input border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">--</option>
                      {HARMONIC_TENSIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                      Brightness
                      {inheritance.brightness && <InheritanceBadge state={inheritance.brightness} />}
                    </span>
                    <select
                      value={brightness}
                      onChange={(e) => setBrightness(e.target.value)}
                      className="mt-0.5 w-full bg-input border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">--</option>
                      {BRIGHTNESS_LEVELS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Chord Progression */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Chord Progression</span>
              <div className="flex items-center gap-1">
                {/* Preview / Stop */}
                {progression.length > 0 && (
                  <button
                    onClick={isPlaying ? stopPreview : handlePreview}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isPlaying ? <Square size={10} /> : <Play size={10} />}
                    {isPlaying ? "Stop" : "Preview"}
                  </button>
                )}
                {/* From Ableton clip */}
                <button
                  onClick={() => {
                    setChordRefMode(chordRefMode === "clip" ? "none" : "clip");
                    setDetectError(null);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                    chordRefMode === "clip"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link2 size={10} />
                  From clip
                </button>
                {/* From MIDI file */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={detecting}
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  {detecting && chordRefMode === "file" ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Upload size={10} />
                  )}
                  From MIDI
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mid,.midi"
                  className="hidden"
                  onChange={handleDetectFromFile}
                />
                {/* AI Suggest / Regenerate */}
                {songId && (
                  <button
                    onClick={handleSuggest}
                    disabled={suggesting}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
                  >
                    {suggesting ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : progression.length > 0 ? (
                      <RefreshCw size={10} />
                    ) : (
                      <Sparkles size={10} />
                    )}
                    {suggesting ? "Thinking..." : progression.length > 0 ? "Regenerate" : "Suggest"}
                  </button>
                )}
              </div>
            </div>

            {/* From Ableton clip picker */}
            {chordRefMode === "clip" && (
              <div className="mb-2 p-2.5 rounded-md bg-muted/50 border border-border space-y-1.5">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Music size={10} />
                  Detect chords from an Ableton clip — chords will snap to bar boundaries.
                </p>
                <select
                  value={refTrackId}
                  onChange={(e) => { setRefTrackId(e.target.value); setRefSceneId(""); }}
                  className="w-full bg-input border border-border rounded px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select track…</option>
                  {midiTracks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {refTrackId && (
                  <select
                    value={refSceneId}
                    onChange={(e) => setRefSceneId(e.target.value)}
                    className="w-full bg-input border border-border rounded px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select clip…</option>
                    {refTrackClips.map((c) => (
                      <option key={c.scene_id} value={c.scene_id}>
                        {c.name || `Clip (slot ${c.scene_id})`}
                      </option>
                    ))}
                    {refTrackClips.length === 0 && (
                      <option value="" disabled>No clips on this track</option>
                    )}
                  </select>
                )}
                {refTrackId && refSceneId && (
                  <button
                    onClick={handleDetectFromClip}
                    disabled={detecting}
                    className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {detecting ? <Loader2 size={10} className="animate-spin" /> : <Music size={10} />}
                    {detecting ? "Detecting…" : "Detect chords"}
                  </button>
                )}
              </div>
            )}

            {(suggestError || detectError) && (
              <p className="text-[10px] text-destructive mb-1.5">{suggestError || detectError}</p>
            )}

            {songKey && songScale && (
              <p className="text-[10px] text-muted-foreground/60 mb-1.5">
                Diatonic chords for {songKey} {songScale.replace("_", " ")}
                {suggestionSource === "fallback" && " (safe fallback)"}
              </p>
            )}

            <ChordProgressionInput
              value={progression}
              onChange={setProgression}
              songKey={songKey}
              songScale={songScale}
              onRegenerateChord={songId ? handleRegenerateChord : undefined}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            onClick={() => { stopPreview(); onClose(); }}
            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {initial ? "Save" : "Add Section"}
          </button>
        </div>
      </div>
    </div>
  );
}
