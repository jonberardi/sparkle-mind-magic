import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, ArrowRight, X, Check, RefreshCw } from "lucide-react";
import type { StyleAIResult, InterviewQuestion } from "@/types";
import { useProfileStore } from "@/stores/profileStore";
import { cn } from "@/lib/utils";

interface StyleInterviewDialogProps {
  open: boolean;
  profileId: string;
  description: string;
  onComplete: (result: StyleAIResult) => void;
  onCancel: () => void;
}

/**
 * M3: 3-stage interview dialog for guided style authoring.
 *
 * Stage 1 (Interpretation): AI summarizes what it understood, user confirms or corrects.
 * Stage 2 (Clarification): 2-4 chip-based contrast questions on a single page.
 * Stage 3 (Loading): AI generates style values with confidence labels.
 */
export function StyleInterviewDialog({
  open,
  profileId,
  description,
  onComplete,
  onCancel,
}: StyleInterviewDialogProps) {
  const {
    aiLoading, interviewSession,
    aiInterpret, aiInterviewRecommend, setInterviewSession,
  } = useProfileStore();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [correctionText, setCorrectionText] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);

  // Kick off interpretation when dialog opens
  const didStart = useRef(false);
  useEffect(() => {
    if (open && !interviewSession && !didStart.current) {
      didStart.current = true;
      aiInterpret(description);
    }
  }, [open, interviewSession, aiInterpret, description]);

  if (!open) return null;

  const session = interviewSession;
  const interpretation = session?.interpretation;
  const stage = session?.stage ?? "interpreting";
  const questions: InterviewQuestion[] = interpretation?.questions ?? [];

  const handleConfirmInterpretation = () => {
    if (!session) return;
    setInterviewSession({ ...session, stage: "clarifying" });
  };

  const handleCorrect = async () => {
    if (!correctionText.trim()) return;
    // Re-interpret with the corrected description
    const corrected = `${description}\n\nCorrection: ${correctionText.trim()}`;
    setShowCorrection(false);
    setCorrectionText("");
    await aiInterpret(corrected);
  };

  const handleSelectAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => {
      if (prev[questionId] === value) {
        const next = { ...prev };
        delete next[questionId];
        return next;
      }
      return { ...prev, [questionId]: value };
    });
  };

  const handleBuildStyle = async () => {
    if (!interpretation) return;
    setInterviewSession({
      ...session!,
      answers,
      stage: "recommending",
    });

    const result = await aiInterviewRecommend(
      profileId,
      description,
      interpretation.interpretation,
      answers,
    );
    if (result) {
      onComplete(result);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles size={14} className="text-violet-400" />
              Interview Me
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stage === "interpreting" && "Analyzing your description..."}
              {stage === "interpreted" && "Step 1 of 3 — Does this sound right?"}
              {stage === "clarifying" && "Step 2 of 3 — A few questions to dial this in"}
              {stage === "recommending" && "Step 3 of 3 — Building your style..."}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-muted shrink-0">
          <div
            className="h-full bg-violet-500 transition-all duration-500"
            style={{
              width: stage === "interpreting" ? "15%"
                : stage === "interpreted" ? "33%"
                : stage === "clarifying" ? "66%"
                : "100%",
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* Stage 1: Interpreting (loading) */}
          {stage === "interpreting" && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 size={20} className="text-violet-400 animate-spin" />
              <p className="text-xs text-muted-foreground animate-pulse">
                Reading your description...
              </p>
            </div>
          )}

          {/* Stage 1: Interpreted (show summary) */}
          {stage === "interpreted" && interpretation && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-foreground mb-2">
                  Here's what I think you mean...
                </h4>
                <ul className="space-y-1.5">
                  {interpretation.interpretation.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                      <span className="text-violet-400 mt-0.5 shrink-0">&bull;</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {interpretation.ambiguous_dimensions.length > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  I have {interpretation.questions.length} question{interpretation.questions.length !== 1 ? "s" : ""} to
                  help clarify: {interpretation.ambiguous_dimensions.join(", ")}
                </div>
              )}

              {/* Correction area */}
              {showCorrection && (
                <div className="space-y-2">
                  <textarea
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    rows={2}
                    placeholder="What did I get wrong or miss?"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCorrect}
                      disabled={!correctionText.trim() || aiLoading}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 disabled:opacity-40 transition-colors"
                    >
                      <RefreshCw size={10} />
                      Re-interpret
                    </button>
                    <button
                      onClick={() => { setShowCorrection(false); setCorrectionText(""); }}
                      className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 2: Clarification (all questions on one page) */}
          {stage === "clarifying" && (
            <div className="space-y-5">
              <h4 className="text-xs font-medium text-foreground">
                A few questions to dial this in:
              </h4>

              {questions.map((q) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-[11px] font-medium text-foreground/80">{q.question}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectAnswer(q.id, opt.value)}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-full border transition-colors",
                          answers[q.id] === opt.value
                            ? "border-violet-500/50 bg-violet-500/15 text-violet-400 font-medium"
                            : "border-border text-muted-foreground hover:border-violet-500/30 hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {questions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Your description was clear enough — no questions needed.
                </p>
              )}
            </div>
          )}

          {/* Stage 3: Recommending (loading) */}
          {stage === "recommending" && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 size={20} className="text-violet-400 animate-spin" />
              <p className="text-xs text-muted-foreground animate-pulse">
                Building your style profile...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
          <div>
            {stage === "interpreted" && !showCorrection && (
              <button
                onClick={() => setShowCorrection(true)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Let me clarify...
              </button>
            )}
            {stage === "clarifying" && (
              <button
                onClick={() => {
                  if (session) setInterviewSession({ ...session, stage: "interpreted" });
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to interpretation
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stage === "interpreted" && !showCorrection && (
              <button
                onClick={handleConfirmInterpretation}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 disabled:opacity-40 transition-colors"
              >
                <Check size={12} />
                Sounds right
                <ArrowRight size={12} />
              </button>
            )}

            {stage === "clarifying" && (
              <button
                onClick={handleBuildStyle}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 disabled:opacity-40 transition-colors"
              >
                <Sparkles size={12} />
                Build My Style
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
