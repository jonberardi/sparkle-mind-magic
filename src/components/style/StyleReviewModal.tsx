import { useState, useMemo } from "react";
import { Check, X, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import type { StyleDiffGroup, StyleFieldDiff, FieldAcceptance, FieldConfidence } from "@/types";
import { cn } from "@/lib/utils";

interface StyleReviewModalProps {
  open: boolean;
  groupedDiffs: StyleDiffGroup[];
  onApply: (acceptedChanges: Record<string, unknown>) => void;
  onCancel: () => void;
  loading?: boolean;
  /** M3: interpretation summary bullets from the interview flow */
  interpretationSummary?: string;
  /** M3: what the user clarified during the interview */
  clarificationSummary?: string[];
}

const CONFIDENCE_STYLES: Record<FieldConfidence, { dot: string; label: string }> = {
  clear: { dot: "bg-emerald-400", label: "Clear from prompt" },
  inferred: { dot: "bg-amber-400", label: "Inferred from answers" },
  defaulted: { dot: "bg-zinc-500", label: "Defaulted for now" },
};

type AcceptanceMap = Record<string, FieldAcceptance>;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    // Range display for [number, number]
    if (value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      return `${value[0]} – ${value[1]}`;
    }
    return value.join(", ");
  }
  if (typeof value === "number") return value.toFixed(2);
  return String(value);
}

export function StyleReviewModal({
  open,
  groupedDiffs,
  onApply,
  onCancel,
  loading,
  interpretationSummary,
  clarificationSummary,
}: StyleReviewModalProps) {
  const hasConfidence = useMemo(
    () => groupedDiffs.some((g) => g.fields.some((f) => f.confidence)),
    [groupedDiffs],
  );
  // Initialize all fields as accepted by default
  const [acceptance, setAcceptance] = useState<AcceptanceMap>(() => {
    const map: AcceptanceMap = {};
    for (const group of groupedDiffs) {
      for (const field of group.fields) {
        map[field.field] = "accepted";
      }
    }
    return map;
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const totalFields = useMemo(
    () => groupedDiffs.reduce((sum, g) => sum + g.fields.length, 0),
    [groupedDiffs],
  );

  const acceptedCount = useMemo(
    () => Object.values(acceptance).filter((v) => v === "accepted").length,
    [acceptance],
  );

  const toggleField = (field: string) => {
    setAcceptance((prev) => ({
      ...prev,
      [field]: prev[field] === "accepted" ? "rejected" : "accepted",
    }));
  };

  const setGroupAcceptance = (group: StyleDiffGroup, state: FieldAcceptance) => {
    setAcceptance((prev) => {
      const next = { ...prev };
      for (const f of group.fields) {
        next[f.field] = state;
      }
      return next;
    });
  };

  const acceptAll = () => {
    setAcceptance((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[key] = "accepted";
      return next;
    });
  };

  const rejectAll = () => {
    setAcceptance((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[key] = "rejected";
      return next;
    });
  };

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const handleApply = () => {
    // Build the accepted changes object matching the validated structure
    const changes: Record<string, unknown> = {};
    const params: Record<string, unknown> = {};
    const topLevelFields = new Set(["style_world", "style_summary", "reference_artists"]);

    for (const group of groupedDiffs) {
      for (const field of group.fields) {
        if (acceptance[field.field] !== "accepted") continue;
        if (topLevelFields.has(field.field)) {
          changes[field.field] = field.new_value;
        } else {
          params[field.field] = field.new_value;
        }
      }
    }
    if (Object.keys(params).length > 0) {
      changes["params"] = params;
    }
    onApply(changes);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border shrink-0">
          <h3 className="text-sm font-semibold text-foreground">Review AI Suggestions</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {acceptedCount} of {totalFields} changes accepted
          </p>
        </div>

        {/* Diff groups */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {/* M3: Interpretation + Clarification header */}
          {(interpretationSummary || (clarificationSummary && clarificationSummary.length > 0)) && (
            <div className="space-y-2 pb-3 border-b border-border/50">
              {interpretationSummary && (
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    What I heard
                  </h4>
                  <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                    {interpretationSummary}
                  </div>
                </div>
              )}
              {clarificationSummary && clarificationSummary.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    What you chose
                  </h4>
                  <ul className="space-y-0.5">
                    {clarificationSummary.map((item, i) => (
                      <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                        <span className="text-violet-400 mt-0.5 shrink-0">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {groupedDiffs.map((group) => {
            const collapsed = collapsedGroups.has(group.group);
            const groupAccepted = group.fields.every((f) => acceptance[f.field] === "accepted");
            const groupRejected = group.fields.every((f) => acceptance[f.field] === "rejected");

            return (
              <div key={group.group} className="border border-border/50 rounded-lg overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                  <button
                    onClick={() => toggleGroupCollapse(group.group)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    <span className="text-xs font-medium text-foreground">{group.group}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({group.fields.filter((f) => acceptance[f.field] === "accepted").length}/{group.fields.length})
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setGroupAcceptance(group, "accepted")}
                      className={cn(
                        "p-1 rounded transition-colors",
                        groupAccepted
                          ? "text-emerald-400 bg-emerald-500/15"
                          : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10",
                      )}
                      title="Accept group"
                    >
                      <CheckCircle size={13} />
                    </button>
                    <button
                      onClick={() => setGroupAcceptance(group, "rejected")}
                      className={cn(
                        "p-1 rounded transition-colors",
                        groupRejected
                          ? "text-red-400 bg-red-500/15"
                          : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10",
                      )}
                      title="Reject group"
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>

                {/* Fields */}
                {!collapsed && (
                  <div className="divide-y divide-border/30">
                    {group.fields.map((field) => (
                      <FieldDiffRow
                        key={field.field}
                        field={field}
                        accepted={acceptance[field.field] === "accepted"}
                        onToggle={() => toggleField(field.field)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0 space-y-2">
          {/* Confidence legend (M3) */}
          {hasConfidence && (
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              {(Object.entries(CONFIDENCE_STYLES) as [FieldConfidence, { dot: string; label: string }][]).map(
                ([key, { dot, label }]) => (
                  <span key={key} className="flex items-center gap-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
                    {label}
                  </span>
                ),
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={acceptAll}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Accept All
              </button>
              <span className="text-muted-foreground/40">|</span>
              <button
                onClick={rejectAll}
                className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
              >
                Reject All
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={acceptedCount === 0 || loading}
                className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Applying..." : `Apply ${acceptedCount} Change${acceptedCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldDiffRow({
  field,
  accepted,
  onToggle,
}: {
  field: StyleFieldDiff;
  accepted: boolean;
  onToggle: () => void;
}) {
  const confidence = field.confidence;
  const confidenceStyle = confidence ? CONFIDENCE_STYLES[confidence] : null;

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full px-3 py-2 flex items-center gap-3 text-left transition-colors",
        accepted ? "bg-emerald-500/5" : "bg-muted/10 opacity-60",
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
        accepted
          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
          : "border-border text-transparent",
      )}>
        <Check size={10} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-foreground">{field.label}</span>
          {confidenceStyle && (
            <span
              className={cn("w-1.5 h-1.5 rounded-full shrink-0", confidenceStyle.dot)}
              title={confidenceStyle.label}
            />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground line-through truncate max-w-[40%]">
            {formatValue(field.old_value)}
          </span>
          <span className="text-[10px] text-muted-foreground/50">&rarr;</span>
          <span className={cn(
            "text-[10px] truncate max-w-[50%]",
            accepted ? "text-emerald-400" : "text-muted-foreground",
          )}>
            {formatValue(field.new_value)}
          </span>
        </div>
      </div>
    </button>
  );
}
