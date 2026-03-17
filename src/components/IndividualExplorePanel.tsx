/**
 * IndividualExplorePanel — Explore First for individual (non-song) mode.
 *
 * Generates 3 candidate MIDI clips using the individual mode API.
 * Uses shared CandidateCard component for consistent UX.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  RefreshCw, Send,
  Loader2, AlertCircle, Music2, X,
} from "lucide-react";
import type { Candidate, CandidateSet } from "@/types";
import { useSessionStore } from "@/stores/sessionStore";
import {
  generateIndividualCandidates,
  regenerateIndividualCandidates,
  sendCandidateToAbleton,
  type IndividualCandidateParams,
} from "@/lib/candidateApi";
import { previewMidi, type PreviewHandle } from "@/lib/midiPreview";
import { CandidateCard } from "./candidate/CandidateCard";

// ── IndividualExplorePanel ──

interface IndividualExplorePanelProps {
  prompt: string;
  settings: {
    key?: string | null;
    scale?: string | null;
    tempo?: number | null;
    chord_progression?: Array<{ root: string; quality: string; bars: number }> | null;
    humanize_preset?: string | null;
  };
  onClose: () => void;
  onSent: () => void;
}

export function IndividualExplorePanel({ prompt, settings, onClose, onSent }: IndividualExplorePanelProps) {
  const [candidateSet, setCandidateSet] = useState<CandidateSet | null>(null);
  const [frozenLabels, setFrozenLabels] = useState<Set<string>>(new Set());
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingLabel, setPlayingLabel] = useState<string | null>(null);
  const [playheadBeat, setPlayheadBeat] = useState(-1);
  const [sendingLabel, setSendingLabel] = useState<string | null>(null);
  const [sentLabels, setSentLabels] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const previewRef = useRef<PreviewHandle | null>(null);
  const animFrameRef = useRef<number>(0);

  const session = useSessionStore((s) => s.session);
  const tempo = settings.tempo || session?.tempo || 120;
  const midiTracks = session?.tracks.filter((t) => t.type === "midi") ?? [];
  const [targetTrackId, setTargetTrackId] = useState<number | "new">("new");
  const [targetSceneId, setTargetSceneId] = useState(0);

  const buildParams = useCallback((): IndividualCandidateParams => ({
    prompt,
    key: settings.key || undefined,
    scale: settings.scale || undefined,
    bpm: settings.tempo || undefined,
    chordProgression: settings.chord_progression || undefined,
  }), [prompt, settings]);

  const startPlayheadAnimation = useCallback(() => {
    const tick = () => {
      if (previewRef.current?.isPlaying()) {
        setPlayheadBeat(previewRef.current.getPositionBeats());
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setPlayheadBeat(-1);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => { cancelAnimationFrame(animFrameRef.current); previewRef.current?.stop(); };
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await generateIndividualCandidates(buildParams());
      setCandidateSet(result);
      setFrozenLabels(new Set());
      setSelectedLabels(new Set());
      setSentLabels(new Set());
    } catch (e: any) { setError(e.message || "Generation failed"); }
    finally { setLoading(false); }
  }, [buildParams]);

  const handleRegenerate = useCallback(async () => {
    if (!candidateSet) return;
    setLoading(true); setError(null); handleStop();
    try {
      const frozen: Record<string, Candidate> = {};
      for (const c of candidateSet.candidates) {
        if (frozenLabels.has(c.label)) frozen[c.label] = c;
      }
      const result = await regenerateIndividualCandidates({ ...buildParams(), frozen });
      setCandidateSet(result);
      setSelectedLabels(new Set());
      setSentLabels(new Set());
    } catch (e: any) { setError(e.message || "Regeneration failed"); }
    finally { setLoading(false); }
  }, [candidateSet, frozenLabels, buildParams]);

  useEffect(() => { handleGenerate(); }, []);

  const toggleFreeze = (label: string) => {
    setFrozenLabels((prev) => { const next = new Set(prev); if (next.has(label)) next.delete(label); else next.add(label); return next; });
  };

  const toggleSelect = (label: string) => {
    setSelectedLabels((prev) => { const next = new Set(prev); if (next.has(label)) next.delete(label); else next.add(label); return next; });
  };

  const handlePlay = (candidate: Candidate) => {
    handleStop();
    if (playingLabel === candidate.label) return;
    const handle = previewMidi(candidate.notes, { tempo, onEnd: () => { setPlayingLabel(null); setPlayheadBeat(-1); } });
    previewRef.current = handle;
    setPlayingLabel(candidate.label);
    startPlayheadAnimation();
  };

  const handleStop = () => {
    cancelAnimationFrame(animFrameRef.current);
    previewRef.current?.stop(); previewRef.current = null;
    setPlayingLabel(null); setPlayheadBeat(-1);
  };

  const handleSend = async (candidate: Candidate) => {
    setSendingLabel(candidate.label); handleStop();
    try {
      await sendCandidateToAbleton({
        trackId: targetTrackId === "new" ? -1 : targetTrackId,
        sceneId: targetSceneId,
        clipName: candidate.clip_name,
        notes: candidate.notes,
        clipLengthBars: candidate.clip_length_bars,
        prompt,
        candidateLabel: candidate.label,
        variationLabel: candidate.variation_label || undefined,
      });
      setSentLabels((prev) => new Set(prev).add(candidate.label));
      if (selectedLabels.size <= 1) {
        setTimeout(() => onSent(), 600);
      }
    } catch (e: any) { setError(e.message || "Send failed"); }
    finally { setSendingLabel(null); }
  };

  const handleSendSelected = async () => {
    if (!candidateSet || selectedLabels.size === 0) return;
    setSendingAll(true); handleStop();

    const selected = candidateSet.candidates.filter((c) =>
      selectedLabels.has(c.label) && c.notes.length > 0
    );

    // Create one new track for all selected clips, then reuse its ID
    let sharedTrackId: number | undefined;

    for (let i = 0; i < selected.length; i++) {
      const candidate = selected[i];
      setSendingLabel(candidate.label);
      try {
        const result = await sendCandidateToAbleton({
          trackId: sharedTrackId != null ? sharedTrackId : -1,
          sceneId: targetSceneId + i,
          clipName: candidate.clip_name,
          notes: candidate.notes,
          clipLengthBars: candidate.clip_length_bars,
          prompt,
          candidateLabel: candidate.label,
          variationLabel: candidate.variation_label || undefined,
        });
        if (sharedTrackId == null && result.track_id != null) {
          sharedTrackId = result.track_id;
        }
        setSentLabels((prev) => new Set(prev).add(candidate.label));
      } catch (e: any) {
        setError(e.message || `Send failed for candidate ${candidate.label}`);
        break;
      } finally { setSendingLabel(null); }
    }

    setSendingAll(false);
    setTimeout(() => onSent(), 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-card border border-border rounded-t-xl shadow-2xl w-full max-w-md max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Music2 size={14} className="text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Explore Candidates</h3>
          </div>
          <button onClick={() => { handleStop(); onClose(); }} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Context */}
        <div className="px-4 py-2 border-b border-border/50 bg-muted/20 shrink-0">
          <p className="text-[10px] text-muted-foreground line-clamp-2">{prompt}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {settings.key && (
              <span className="px-1.5 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">
                {settings.key}{settings.scale ? ` ${settings.scale.replace("_", " ")}` : ""}
              </span>
            )}
            {settings.tempo && <span className="px-1.5 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">{settings.tempo} BPM</span>}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">{candidateSet ? "Regenerating..." : "Generating 3 candidates..."}</p>
            <p className="text-[10px] text-muted-foreground/60">This may take 15-30 seconds</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="px-4 py-3">
            <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/20">
              <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-destructive">{error}</p>
                <button onClick={() => { setError(null); handleGenerate(); }} className="text-[10px] text-destructive/80 underline mt-1">Try again</button>
              </div>
            </div>
          </div>
        )}

        {/* Cards */}
        {candidateSet && !loading && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {candidateSet.candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                tempo={tempo}
                frozen={frozenLabels.has(c.label)}
                playing={playingLabel === c.label}
                playheadBeat={playingLabel === c.label ? playheadBeat : -1}
                sending={sendingLabel === c.label}
                sent={sentLabels.has(c.label)}
                onToggleFreeze={() => toggleFreeze(c.label)}
                onPlay={() => handlePlay(c)}
                onStop={handleStop}
                onSend={() => handleSend(c)}
                selected={selectedLabels.has(c.label)}
                onToggleSelect={() => toggleSelect(c.label)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {candidateSet && !loading && (
          <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0">Send to:</span>
              <select value={targetTrackId === "new" ? "new" : String(targetTrackId)} onChange={(e) => { const v = e.target.value; setTargetTrackId(v === "new" ? "new" : Number(v)); }}
                className="flex-1 bg-input border border-border rounded px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="new">+ New track</option>
                {midiTracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <span className="text-[10px] text-muted-foreground">Scene:</span>
              <input type="number" min={0} value={targetSceneId} onChange={(e) => setTargetSceneId(Number(e.target.value))}
                className="w-12 bg-input border border-border rounded px-1.5 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>

            {/* Send selected (multi-select) */}
            {selectedLabels.size > 1 && (
              <button
                onClick={handleSendSelected}
                disabled={sendingAll}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={12} />
                {sendingAll ? "Sending..." : `Send ${selectedLabels.size} selected to one track`}
              </button>
            )}

            <button onClick={handleRegenerate} disabled={loading || frozenLabels.size >= 3}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-medium bg-muted text-foreground rounded-md hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <RefreshCw size={12} />
              {frozenLabels.size >= 3 ? "All frozen — unfreeze to regenerate" : `Regenerate${frozenLabels.size > 0 ? ` (${3 - frozenLabels.size} unfrozen)` : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
