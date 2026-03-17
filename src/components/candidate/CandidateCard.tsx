/**
 * CandidateCard — displays a single MIDI candidate with preview, freeze, and send controls.
 *
 * Shared between ExplorePanel and IndividualExplorePanel.
 * Supports multi-select mode via optional `selected` / `onToggleSelect` props.
 */

import { useState, memo } from "react";
import {
  Lock, Unlock, Send, Play, Square,
  Loader2, AlertCircle, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import type { Candidate } from "@/types";
import { MiniPianoRoll, LABEL_COLORS, LABEL_BG } from "./MiniPianoRoll";

interface CandidateCardProps {
  candidate: Candidate;
  tempo: number;
  role?: string;
  frozen: boolean;
  playing: boolean;
  playheadBeat: number;
  sending: boolean;
  sent: boolean;
  onToggleFreeze: () => void;
  onPlay: () => void;
  onStop: () => void;
  onSend: () => void;
  // Multi-select support
  selected?: boolean;
  onToggleSelect?: () => void;
}

export const CandidateCard = memo(function CandidateCard({
  candidate,
  frozen,
  playing,
  playheadBeat,
  sending,
  sent,
  onToggleFreeze,
  onPlay,
  onStop,
  onSend,
  selected,
  onToggleSelect,
}: CandidateCardProps) {
  const isEmpty = candidate.notes.length === 0;
  const [showDetails, setShowDetails] = useState(false);

  // Compute note stats for progressive disclosure
  const noteStats = isEmpty ? null : (() => {
    const pitches = candidate.notes.map((n) => n.pitch);
    const velocities = candidate.notes.map((n) => n.velocity);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const avgVel = Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length);
    return { minPitch, maxPitch, range: maxPitch - minPitch, avgVel };
  })();

  return (
    <div
      className={`relative rounded-lg border transition-all ${LABEL_BG[candidate.label] || ""} ${
        playing
          ? "ring-1 ring-primary border-primary/40 bg-card"
          : selected
            ? "ring-1 ring-primary/60 border-primary/30 bg-card"
            : "border-border bg-card/50 hover:bg-card/80"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          {/* Multi-select checkbox */}
          {onToggleSelect && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                selected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border hover:border-foreground/40"
              }`}
            >
              {selected && <Check size={10} />}
            </button>
          )}
          <span
            className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
              LABEL_COLORS[candidate.label]
            }`}
          >
            {candidate.label}
          </span>
          {candidate.variation_label ? (
            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {candidate.variation_label}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">Closest Match</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {frozen && (
            <span className="text-[9px] text-primary/70 font-medium mr-1">FROZEN</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFreeze(); }}
            className={`p-1 rounded transition-colors ${
              frozen
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={frozen ? "Unfreeze" : "Freeze this candidate"}
          >
            {frozen ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        </div>
      </div>

      {/* Piano roll */}
      <div className="px-3 pt-2">
        {isEmpty ? (
          <div className="flex items-center justify-center h-14 text-[10px] text-muted-foreground">
            <AlertCircle size={12} className="mr-1" />
            No notes generated
          </div>
        ) : (
          <MiniPianoRoll
            notes={candidate.notes}
            clipLengthBars={candidate.clip_length_bars}
            label={candidate.label}
            playheadBeat={playing ? playheadBeat : -1}
          />
        )}
      </div>

      {/* Description (always visible if present) */}
      {candidate.description && (
        <p className="px-3 py-1.5 text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          {candidate.description}
        </p>
      )}

      {/* Evaluation badge */}
      {candidate.evaluation && !candidate.evaluation.error && (
        <div className="px-3 py-1.5 flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
              candidate.evaluation.verdict === "strong"
                ? "bg-emerald-500/15 text-emerald-400"
                : candidate.evaluation.verdict === "weak"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-yellow-500/15 text-yellow-400"
            }`}
          >
            {candidate.evaluation.overall_score}/10
          </span>
          <span className="text-[9px] text-muted-foreground/70 truncate flex-1">
            {candidate.evaluation.summary}
          </span>
        </div>
      )}

      {/* Stats + actions */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {candidate.notes.length} notes &middot; {candidate.clip_length_bars} bars
          </span>
          {/* Details toggle */}
          {noteStats && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title={showDetails ? "Hide details" : "Show details"}
            >
              {showDetails ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isEmpty && (
            <button
              onClick={(e) => { e.stopPropagation(); playing ? onStop() : onPlay(); }}
              className={`p-1.5 rounded transition-colors ${
                playing
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={playing ? "Stop preview" : "Preview"}
            >
              {playing ? <Square size={12} /> : <Play size={12} />}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onSend(); }}
            disabled={isEmpty || sending || sent}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
              sent
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            {sent ? <Check size={10} /> : sending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
            {sent ? "Sent" : "Send"}
          </button>
        </div>
      </div>

      {/* Progressive disclosure: detailed stats */}
      {showDetails && noteStats && (
        <div className="px-3 pb-2 pt-0 border-t border-border/30">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground/70 pt-1.5">
            <span>Range: {noteStats.range} semitones</span>
            <span>Avg velocity: {noteStats.avgVel}</span>
            <span>Pitch: {noteStats.minPitch}–{noteStats.maxPitch}</span>
            {candidate.variation_axis && (
              <span>Axis: {candidate.variation_axis.replace("_", " ")}</span>
            )}
          </div>
          {/* Evaluation details */}
          {candidate.evaluation && !candidate.evaluation.error && (
            <div className="mt-2 pt-1.5 border-t border-border/20 space-y-1">
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {Object.entries(candidate.evaluation.scores).map(([dim, score]) => (
                  <span key={dim} className="text-[9px] text-muted-foreground/70">
                    {dim.replace(/_/g, " ")}: <span className={
                      Number(score) >= 7 ? "text-emerald-400" :
                      Number(score) < 4 ? "text-red-400" : "text-yellow-400"
                    }>{score}</span>
                  </span>
                ))}
              </div>
              {candidate.evaluation.strengths.length > 0 && (
                <div className="text-[9px] text-emerald-400/70">
                  + {candidate.evaluation.strengths.join(" · ")}
                </div>
              )}
              {candidate.evaluation.weaknesses.length > 0 && (
                <div className="text-[9px] text-red-400/70">
                  - {candidate.evaluation.weaknesses.join(" · ")}
                </div>
              )}
              {candidate.evaluation.suggestions.length > 0 && (
                <div className="text-[9px] text-muted-foreground/50">
                  Suggestions: {candidate.evaluation.suggestions.join(" · ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
