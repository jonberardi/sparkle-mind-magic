import { useState, useEffect, useCallback } from "react";
import { Wand2, ChevronDown, ChevronUp, Layers, RefreshCw } from "lucide-react";
import type { Song, SongSection } from "@/types";
import { HUMANIZE_PRESETS, STYLE_WORLD_LABELS } from "@/types";
import { useSessionStore } from "@/stores/sessionStore";
import { useProfileStore } from "@/stores/profileStore";
import { ExplorePanel } from "@/components/ExplorePanel";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface TrackGenerationWizardProps {
  section: SongSection | null;
  song: Song;
  onGenerate: (prompt: string) => void;
  disabled: boolean;
  onExploreComplete?: () => void;
}

const INSTRUMENT_OPTIONS = [
  "Bass", "Keys / Piano", "Synth Pad", "Synth Lead", "Guitar",
  "Strings", "Brass", "Drums", "Percussion", "Vocals / Choir", "Other",
] as const;

const STYLE_OPTIONS = [
  "Neo-Soul", "Jazz", "Lo-Fi", "R&B", "Hip Hop", "Funk",
  "Pop", "Rock", "Electronic", "Classical", "Ambient", "Latin",
] as const;

const DENSITY_OPTIONS = [
  { value: "sparse", label: "Sparse" },
  { value: "moderate", label: "Moderate" },
  { value: "busy", label: "Busy" },
] as const;

const PHRASE_OPTIONS = [
  { value: "repetitive", label: "Repetitive" },
  { value: "evolving", label: "Evolving" },
  { value: "call_response", label: "Call & Response" },
  { value: "building", label: "Building" },
] as const;

const ROLE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "comping", label: "Comping" },
  { value: "pad", label: "Pad" },
  { value: "rhythmic", label: "Rhythmic" },
  { value: "bass", label: "Bassline" },
  { value: "fill", label: "Fill / Accent" },
] as const;

// Auto-suggest a role when an instrument is selected
const INSTRUMENT_ROLE_MAP: Record<string, string> = {
  "Bass": "bass",
  "Keys / Piano": "comping",
  "Synth Pad": "pad",
  "Synth Lead": "lead",
  "Guitar": "comping",
  "Strings": "pad",
  "Brass": "lead",
  "Drums": "rhythmic",
  "Percussion": "rhythmic",
};

type OutputTarget = "new_track" | { trackId: number; trackName: string };

export function TrackGenerationWizard({
  section,
  song,
  onGenerate,
  disabled,
  onExploreComplete,
}: TrackGenerationWizardProps) {
  const [instrument, setInstrument] = useState("");
  const [style, setStyle] = useState("");
  const [density, setDensity] = useState("");
  const [role, setRole] = useState("");
  const [phraseBehavior, setPhraseBehavior] = useState("");
  const [humanize, setHumanize] = useState("");
  const [clipCount, setClipCount] = useState(1);
  const [outputTarget, setOutputTarget] = useState<OutputTarget>("new_track");
  const [prompt, setPrompt] = useState("");
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const midiTracks = session?.tracks.filter((t) => t.type === "midi") ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [explorePrompt, setExplorePrompt] = useState("");

  const buildPrompt = () => {
    const parts: string[] = [];

    if (clipCount > 1) parts.push(`Generate ${clipCount} variations.`);
    if (outputTarget === "new_track") {
      parts.push("Create a new track.");
    } else {
      parts.push(`Add to existing track "${outputTarget.trackName}" (track_id=${outputTarget.trackId}).`);
    }

    if (instrument) parts.push(`${instrument}`);
    if (role) parts.push(`(${role})`);
    if (style) parts.push(`in a ${style} style`);
    if (density) parts.push(`with ${density} density`);
    if (phraseBehavior) parts.push(`phrase style: ${phraseBehavior.replace("_", " & ")}`);
    if (humanize && humanize !== "none") parts.push(`humanized: ${humanize}`);

    if (prompt.trim()) parts.push(`— ${prompt.trim()}`);

    if (parts.length === 0) return prompt.trim();
    return parts.join(" ");
  };

  const refreshTracks = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/session/live`);
      if (res.ok) setSession(await res.json());
    } catch { /* silent */ }
    setRefreshing(false);
  };

  const handleGenerate = () => {
    const fullPrompt = buildPrompt();
    if (!fullPrompt) return;
    onGenerate(fullPrompt);
    setPrompt("");
  };

  const hasAnyField = instrument || style || density || role || phraseBehavior || humanize;
  const previewPrompt = buildPrompt();

  const handleExplore = () => {
    const fullPrompt = buildPrompt();
    if (!fullPrompt) return;
    setExplorePrompt(fullPrompt);
    setShowExplore(true);
  };

  // Cmd+Enter keyboard shortcut to generate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!disabled && (previewPrompt || prompt.trim())) {
          handleGenerate();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, previewPrompt, prompt]);

  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <Wand2 className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">Select a section to start generating tracks</p>
      </div>
    );
  }

  // Show ExplorePanel when active
  if (showExplore && explorePrompt) {
    return (
      <ExplorePanel
        song={song}
        section={section}
        prompt={explorePrompt}
        role={role || undefined}
        onClose={() => setShowExplore(false)}
        onSent={() => {
          setShowExplore(false);
          onExploreComplete?.();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground">Generate Track</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {section.name} · {section.length_bars} bars{song.key ? ` · ${song.key}` : ""}
        </p>
        {/* Style inheritance chain */}
        {(song.style_world || section.style_world || style) && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground/60">Style:</span>
            {song.style_world && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground" title="Song-level style world">
                {STYLE_WORLD_LABELS[song.style_world] || song.style_world}
              </span>
            )}
            {section.style_world && (
              <>
                <span className="text-[9px] text-muted-foreground/40">→</span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary" title="Section override">
                  {STYLE_WORLD_LABELS[section.style_world] || section.style_world}
                </span>
              </>
            )}
            {style && (
              <>
                <span className="text-[9px] text-muted-foreground/40">→</span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-medium" title="Wizard selection">
                  {style}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Output config */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Output</span>
            <button
              onClick={refreshTracks}
              disabled={refreshing}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Refresh track list from Ableton"
            >
              <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={outputTarget === "new_track" ? "new_track" : String(outputTarget.trackId)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "new_track") {
                  setOutputTarget("new_track");
                } else {
                  const track = midiTracks.find((t) => t.id === Number(val));
                  if (track) setOutputTarget({ trackId: track.id, trackName: track.name });
                }
              }}
              className="flex-1 bg-input border border-border rounded px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="new_track">+ New track</option>
              {midiTracks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 ml-auto" title={`Generate ${clipCount} ${clipCount === 1 ? "clip" : "clips"}`}>
              <span className="text-[10px] text-muted-foreground mr-0.5">Generate</span>
              <button onClick={() => setClipCount(Math.max(1, clipCount - 1))} className="w-5 h-5 flex items-center justify-center text-[11px] rounded bg-muted text-muted-foreground hover:text-foreground">-</button>
              <span className="text-[11px] text-foreground w-6 text-center">{clipCount}</span>
              <button onClick={() => setClipCount(Math.min(5, clipCount + 1))} className="w-5 h-5 flex items-center justify-center text-[11px] rounded bg-muted text-muted-foreground hover:text-foreground">+</button>
              <span className="text-[10px] text-muted-foreground">{clipCount === 1 ? "clip" : "clips"}</span>
            </div>
          </div>
        </div>

        {/* Instrument */}
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Instrument</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {INSTRUMENT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  if (instrument === opt) {
                    setInstrument("");
                  } else {
                    setInstrument(opt);
                    // Auto-suggest role based on instrument
                    const suggestedRole = INSTRUMENT_ROLE_MAP[opt];
                    if (suggestedRole && !role) setRole(suggestedRole);
                  }
                }}
                className={`px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                  instrument === opt ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Role */}
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Role</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRole(role === opt.value ? "" : opt.value)}
                className={`px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                  role === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Style</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setStyle(style === opt ? "" : opt)}
                className={`px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                  style === opt ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Density</span>
          <div className="flex gap-1.5 mt-1.5">
            {DENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDensity(density === opt.value ? "" : opt.value)}
                className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors ${
                  density === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          Advanced
        </button>
        {showAdvanced && (
          <div className="space-y-3">
            {/* Phrase Behavior */}
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Phrase Shape</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {PHRASE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPhraseBehavior(phraseBehavior === opt.value ? "" : opt.value)}
                    className={`px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                      phraseBehavior === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Humanization */}
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Humanization</span>
              <select
                value={humanize}
                onChange={(e) => setHumanize(e.target.value)}
                className="mt-1 w-full bg-input border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Default</option>
                {HUMANIZE_PRESETS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Freeform prompt */}
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Additional Instructions</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. syncopated rhythm, walking bass, arpeggiated..."
            rows={3}
            className="mt-1.5 w-full bg-input border border-border rounded px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Preview with resolved context */}
        {previewPrompt && (() => {
          const activeProfile = useProfileStore.getState().profiles.find(
            (p) => p.id === useProfileStore.getState().activeProfileId
          );
          const contextParts: string[] = [];
          if (song.key) contextParts.push(`Key: ${song.key}${song.scale ? ` ${song.scale.replace("_", " ")}` : ""}`);
          if (song.tempo) contextParts.push(`${song.tempo} BPM`);
          if (song.style_world) contextParts.push(STYLE_WORLD_LABELS[song.style_world] || song.style_world);
          if (section?.chord_progression?.length) {
            contextParts.push(`Chords: ${section.chord_progression.map((c) => `${c.root}${c.quality}`).join(" → ")}`);
          }
          if (section?.energy) contextParts.push(`Energy: ${section.energy}`);
          if (activeProfile && activeProfile.id !== "default") contextParts.push(`Profile: ${activeProfile.name}`);

          return (
            <div className="rounded bg-muted/50 border border-border px-3 py-2 space-y-1.5">
              <span className="text-[10px] text-muted-foreground block">Prompt Preview</span>
              <p className="text-[11px] text-foreground leading-relaxed">{previewPrompt}</p>
              {contextParts.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                  <span className="text-[9px] text-muted-foreground/60">Context:</span>
                  {contextParts.map((part, i) => (
                    <span key={i} className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{part}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Generate / Explore buttons */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={disabled || (!previewPrompt && !prompt.trim())}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Generate (⌘Enter)"
          >
            <Wand2 size={14} />
            Generate{clipCount > 1 ? ` ${clipCount} Clips` : ""}
          </button>
          <button
            onClick={handleExplore}
            disabled={disabled || (!previewPrompt && !prompt.trim())}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-muted text-foreground rounded-md hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Generate 3 variations to preview before sending"
          >
            <Layers size={14} />
            Explore 3
          </button>
        </div>
        {(hasAnyField || clipCount > 1) && (
          <button
            onClick={() => {
              setInstrument(""); setStyle(""); setDensity(""); setRole("");
              setPhraseBehavior(""); setHumanize(""); setPrompt(""); setClipCount(1);
              setOutputTarget("new_track");
            }}
            className="w-full mt-1.5 text-[10px] text-muted-foreground hover:text-foreground text-center transition-colors"
          >
            Clear all fields
          </button>
        )}
      </div>
    </div>
  );
}
