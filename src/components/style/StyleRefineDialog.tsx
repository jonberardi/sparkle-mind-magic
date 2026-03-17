import { useState, useEffect } from "react";
import { Sparkles, Loader2, ArrowRight, X } from "lucide-react";
import type { RefineQuestion, StyleAIResult } from "@/types";
import { useProfileStore } from "@/stores/profileStore";
import { cn } from "@/lib/utils";

interface StyleRefineDialogProps {
  open: boolean;
  profileId: string;
  onComplete: (result: StyleAIResult) => void;
  onCancel: () => void;
}

/**
 * A single refinement session that walks the user through structured
 * questions (chips/toggles) and then sends all answers at once.
 *
 * Adjustment #1: This is one cohesive dialog, not two separate rounds.
 * Adjustment #2: Prefer chips/toggles over freeform text.
 */
export function StyleRefineDialog({
  open,
  profileId,
  onComplete,
  onCancel,
}: StyleRefineDialogProps) {
  const { refineQuestions, fetchRefineQuestions, aiRefine, aiLoading } = useProfileStore();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0); // 0-based index into questions

  useEffect(() => {
    if (open && refineQuestions.length === 0) {
      fetchRefineQuestions();
    }
  }, [open, refineQuestions.length, fetchRefineQuestions]);

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setAnswers({});
      setStep(0);
    }
  }, [open]);

  if (!open) return null;

  const questions = refineQuestions;
  const currentQ = questions[step] as RefineQuestion | undefined;
  const isLastStep = step === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  const handleSingleSelect = (qId: string, value: string) => {
    setAnswers((prev) => {
      // Toggle off if already selected
      if (prev[qId] === value) {
        const next = { ...prev };
        delete next[qId];
        return next;
      }
      return { ...prev, [qId]: value };
    });
  };

  const handleMultiSelect = (qId: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[qId] as string[]) || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [qId]: next.length > 0 ? next : undefined };
    });
  };

  const handleTextChange = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value || undefined }));
  };

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    // Filter out undefined answers
    const cleanAnswers: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (v !== undefined) cleanAnswers[k] = v;
    }
    const result = await aiRefine(profileId, cleanAnswers);
    if (result) {
      onComplete(result);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles size={14} className="text-violet-400" />
              Refine Your Style
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {step + 1} of {questions.length}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question area */}
        <div className="px-5 py-5 min-h-[200px]">
          {currentQ ? (
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-foreground">{currentQ.question}</h4>

              {/* Single select — chip buttons */}
              {currentQ.type === "single_select" && currentQ.options && (
                <div className="flex flex-wrap gap-2">
                  {currentQ.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSingleSelect(currentQ.id, opt.value)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full border transition-colors",
                        answers[currentQ.id] === opt.value
                          ? "border-violet-500/50 bg-violet-500/15 text-violet-400 font-medium"
                          : "border-border text-muted-foreground hover:border-violet-500/30 hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Multi select — chip toggles */}
              {currentQ.type === "multi_select" && currentQ.options && (
                <div className="flex flex-wrap gap-2">
                  {currentQ.options.map((opt) => {
                    const selected = ((answers[currentQ.id] as string[]) || []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleMultiSelect(currentQ.id, opt.value)}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-full border transition-colors",
                          selected
                            ? "border-violet-500/50 bg-violet-500/15 text-violet-400 font-medium"
                            : "border-border text-muted-foreground hover:border-violet-500/30 hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  <p className="w-full text-[10px] text-muted-foreground/60 mt-1">Select all that apply</p>
                </div>
              )}

              {/* Text input — only when needed */}
              {currentQ.type === "text" && (
                <textarea
                  value={(answers[currentQ.id] as string) || ""}
                  onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                  rows={3}
                  placeholder={currentQ.placeholder || "Optional notes..."}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
              Loading questions...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={answeredCount === 0 || aiLoading}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip to results
            </button>
          </div>
          <button
            onClick={handleNext}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {aiLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Refining...
              </>
            ) : isLastStep ? (
              <>
                <Sparkles size={12} />
                Generate Refinements
              </>
            ) : (
              <>
                Next
                <ArrowRight size={12} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
