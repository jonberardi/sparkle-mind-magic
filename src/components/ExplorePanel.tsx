/**
 * ExplorePanel — displays 3 MIDI candidate cards for Explore First workflow.
 *
 * Users can:
 *  - Preview each candidate via Web Audio (role-aware timbres)
 *  - See animated playhead on the piano roll during preview
 *  - Freeze candidates they like (lock icon)
 *  - Regenerate unfrozen candidates
 *  - Select and send one or more candidates to Ableton
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  RefreshCw, Send,
  Loader2, AlertCircle, Music2, X, Lock,
} from "lucide-react";
import type { Candidate, CandidateSet, Song, SongSection } from "@/types";
import { useSessionStore } from "@/stores/sessionStore";
import {
  generateCandidates,
  regenerateCandidates,
  sendCandidateToAbleton,
  type GenerateCandidatesParams,
} from "@/lib/candidateApi";
import { previewMidi, type PreviewHandle } from "@/lib/midiPreview";
import { CandidateCard } from "./candidate/CandidateCard";

// ── ExplorePanel ──

export interface ExploreSentSummary {
  conversationId: string;
  candidates: Array<{
    label: string;
    clipName: string;
    description: string;
    variationLabel?: string;
    noteCount: number;
    clipLengthBars: number;
  }>;
  prompt: string;
  role?: string;
  trackId?: number;
}

interface ExplorePanelProps {
  song: Song;
  section: SongSection | null;
  prompt: string;
  role?: string;
  onClose: () => void;
  onSent: (summary?: ExploreSentSummary) => void;
}

export function ExplorePanel({
  song,
  section,
  prompt,
  role,
  onClose,
  onSent,
}: ExplorePanelProps) {
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
  const tempo = song.tempo || session?.tempo || 120;

  // Target track/scene for sending
  const midiTracks = session?.tracks.filter((t) => t.type === "midi") ?? [];
  const [targetTrackId, setTargetTrackId] = useState<number | "new">("new");
  const [targetSceneId, setTargetSceneId] = useState(section?.scene_id ?? 0);

  const buildParams = useCallback((): GenerateCandidatesParams => ({
    songId: song.id,
    prompt,
    sectionId: section?.id,
    role: role || undefined,
  }), [song.id, prompt, section?.id, role]);

  // Playhead animation loop
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      previewRef.current?.stop();
    };
  }, []);

  // Generate initial candidates
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateCandidates(buildParams());
      setCandidateSet(result);
      setFrozenLabels(new Set());
      setSelectedLabels(new Set());
      setSentLabels(new Set());
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Regenerate with frozen candidates preserved
  const handleRegenerate = useCallback(async () => {
    if (!candidateSet) return;
    setLoading(true);
    setError(null);
    handleStop();

    try {
      const frozen: Record<string, Candidate> = {};
      for (const c of candidateSet.candidates) {
        if (frozenLabels.has(c.label)) {
          frozen[c.label] = c;
        }
      }
      const result = await regenerateCandidates({ ...buildParams(), frozen });
      setCandidateSet(result);
      setSelectedLabels(new Set());
      setSentLabels(new Set());
    } catch (e: any) {
      setError(e.message || "Regeneration failed");
    } finally {
      setLoading(false);
    }
  }, [candidateSet, frozenLabels, buildParams]);

  // Auto-generate on mount
  useEffect(() => { handleGenerate(); }, []);

  const toggleFreeze = (label: string) => {
    setFrozenLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleSelect = (label: string) => {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handlePlay = (candidate: Candidate) => {
    handleStop();
    if (playingLabel === candidate.label) return;

    const handle = previewMidi(candidate.notes, {
      tempo,
      role: role,
      onEnd: () => {
        setPlayingLabel(null);
        setPlayheadBeat(-1);
      },
    });
    previewRef.current = handle;
    setPlayingLabel(candidate.label);
    startPlayheadAnimation();
  };

  const handleStop = () => {
    cancelAnimationFrame(animFrameRef.current);
    previewRef.current?.stop();
    previewRef.current = null;
    setPlayingLabel(null);
    setPlayheadBeat(-1);
  };

  const handleSend = async (candidate: Candidate) => {
    setSendingLabel(candidate.label);
    handleStop();

    const convId = crypto.randomUUID();
    try {
      await sendCandidateToAbleton({
        trackId: targetTrackId === "new" ? -1 : targetTrackId,
        sceneId: targetSceneId,
        clipName: candidate.clip_name,
        notes: candidate.notes,
        clipLengthBars: candidate.clip_length_bars,
        role: role,
        trackName: role ? role.charAt(0).toUpperCase() + role.slice(1) : undefined,
        songId: song.id,
        sectionId: section?.id,
        prompt,
        candidateLabel: candidate.label,
        variationLabel: candidate.variation_label || undefined,
        conversationId: convId,
      });
      setSentLabels((prev) => new Set(prev).add(candidate.label));
      if (selectedLabels.size <= 1) {
        const summary: ExploreSentSummary = {
          conversationId: convId,
          candidates: [{
            label: candidate.label,
            clipName: candidate.clip_name,
            description: candidate.description,
            variationLabel: candidate.variation_label || undefined,
            noteCount: candidate.notes.length,
            clipLengthBars: candidate.clip_length_bars,
          }],
          prompt,
          role,
        };
        setTimeout(() => onSent(summary), 600);
      }
    } catch (e: any) {
      setError(e.message || "Send failed");
    } finally {
      setSendingLabel(null);
    }
  };

  // Send all selected candidates sequentially — all go to the same new track
  const handleSendSelected = async () => {
    if (!candidateSet || selectedLabels.size === 0) return;
    setSendingAll(true);
    handleStop();

    const selected = candidateSet.candidates.filter((c) =>
      selectedLabels.has(c.label) && c.notes.length > 0
    );

    // Shared conversation ID and track ID for all selected clips
    const convId = crypto.randomUUID();
    let sharedTrackId: number | undefined;

    for (let i = 0; i < selected.length; i++) {
      const candidate = selected[i];
      setSendingLabel(candidate.label);
      try {
        const result = await sendCandidateToAbleton({
          trackId: sharedTrackId != null ? sharedTrackId : -1,
          sceneId: targetSceneId + i, // each clip goes to a consecutive scene
          clipName: candidate.clip_name,
          notes: candidate.notes,
          clipLengthBars: candidate.clip_length_bars,
          role: role,
          trackName: role ? role.charAt(0).toUpperCase() + role.slice(1) : undefined,
          loadInstrument: sharedTrackId == null, // only load instrument on first (new track)
          songId: song.id,
          sectionId: section?.id,
          prompt,
          candidateLabel: candidate.label,
          variationLabel: candidate.variation_label || undefined,
          conversationId: convId,
        });
        // Capture the track_id from the first send so subsequent clips reuse it
        if (sharedTrackId == null && result.track_id != null) {
          sharedTrackId = result.track_id;
        }
        setSentLabels((prev) => new Set(prev).add(candidate.label));
      } catch (e: any) {
        setError(e.message || `Send failed for candidate ${candidate.label}`);
        break;
      } finally {
        setSendingLabel(null);
      }
    }

    setSendingAll(false);
    const summary: ExploreSentSummary = {
      conversationId: convId,
      candidates: selected.map((c) => ({
        label: c.label,
        clipName: c.clip_name,
        description: c.description,
        variationLabel: c.variation_label || undefined,
        noteCount: c.notes.length,
        clipLengthBars: c.clip_length_bars,
      })),
      prompt,
      role,
      trackId: sharedTrackId,
    };
    setTimeout(() => onSent(summary), 600);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Music2 size={14} className="text-primary" />
          <h3 className="text-xs font-semibold text-foreground">Explore Candidates</h3>
        </div>
        <button
          onClick={() => { handleStop(); onClose(); }}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Prompt summary */}
      <div className="px-4 py-2 border-b border-border/50 bg-muted/20 shrink-0">
        <p className="text-[10px] text-muted-foreground line-clamp-2">{prompt}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {role && (
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-primary/10 text-primary font-medium">
              {role}
            </span>
          )}
          {song.key && (
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">
              {song.key}{song.scale ? ` ${song.scale.replace("_", " ")}` : ""}
            </span>
          )}
          {song.tempo && (
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">
              {song.tempo} BPM
            </span>
          )}
          {section && (
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">
              {section.name} &middot; {section.length_bars}bars
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <Loader2 size={24} className="animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            {candidateSet ? "Regenerating unfrozen candidates..." : "Generating 3 candidates..."}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {["A", "B", "C"].map((label) => {
              const isFrozen = frozenLabels.has(label);
              return (
                <span
                  key={label}
                  className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded border ${
                    isFrozen
                      ? "border-primary/30 text-primary/50 bg-primary/5"
                      : "border-border text-muted-foreground/40 animate-pulse"
                  }`}
                >
                  {isFrozen ? <Lock size={10} /> : label}
                </span>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground/60">This may take 15-30 seconds</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="px-4 py-3">
          <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/20">
            <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-destructive">{error}</p>
              <button
                onClick={() => { setError(null); handleGenerate(); }}
                className="text-[10px] text-destructive/80 underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate cards */}
      {candidateSet && !loading && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {candidateSet.candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              tempo={tempo}
              role={role}
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

      {/* Footer actions */}
      {candidateSet && !loading && (
        <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
          {/* Output target */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">Send to:</span>
            <select
              value={targetTrackId === "new" ? "new" : String(targetTrackId)}
              onChange={(e) => {
                const v = e.target.value;
                setTargetTrackId(v === "new" ? "new" : Number(v));
              }}
              className="flex-1 bg-input border border-border rounded px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="new">+ New track</option>
              {midiTracks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground">Scene:</span>
            <input
              type="number"
              min={0}
              value={targetSceneId}
              onChange={(e) => setTargetSceneId(Number(e.target.value))}
              className="w-12 bg-input border border-border rounded px-1.5 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Send selected (multi-select) */}
          {selectedLabels.size > 1 && (
            <button
              onClick={handleSendSelected}
              disabled={sendingAll}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={12} />
              {sendingAll
                ? "Sending..."
                : `Send ${selectedLabels.size} selected to one track`}
            </button>
          )}

          {/* Regenerate */}
          <button
            onClick={handleRegenerate}
            disabled={loading || frozenLabels.size >= 3}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-medium bg-muted text-foreground rounded-md hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={12} />
            {frozenLabels.size >= 3
              ? "All frozen — unfreeze to regenerate"
              : `Regenerate${frozenLabels.size > 0 ? ` (${3 - frozenLabels.size} unfrozen)` : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
