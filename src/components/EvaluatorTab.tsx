import { useState, useEffect, useCallback } from "react";
import { Brain, RotateCcw, Save, ChevronDown, ChevronUp } from "lucide-react";
import type { EvaluatorConfig } from "@/types";
import { EVALUATION_DIMENSIONS } from "@/types";
import { cn } from "@/lib/utils";

import { API_BASE } from "@/lib/api";

export function EvaluatorTab() {
  const [config, setConfig] = useState<EvaluatorConfig | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [promptDirty, setPromptDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/evaluator/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditedPrompt(data.prompt);
        setPromptDirty(false);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const save = async (updates: Partial<EvaluatorConfig>) => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/evaluator/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (updates.prompt !== undefined) {
          setEditedPrompt(data.prompt);
          setPromptDirty(false);
        }
        setStatus("Saved");
        setTimeout(() => setStatus(null), 2000);
      }
    } catch {
      setStatus("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm("Reset evaluator to default settings? This will overwrite your custom prompt and weights.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/evaluator/config/reset`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditedPrompt(data.prompt);
        setPromptDirty(false);
        setStatus("Reset to defaults");
        setTimeout(() => setStatus(null), 2000);
      }
    } catch {
      setStatus("Failed to reset");
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Loading evaluator config...
      </div>
    );
  }

  const updateWeight = (dim: string, value: number) => {
    const newWeights = { ...config.weights, [dim]: value };
    setConfig({ ...config, weights: newWeights });
    save({ weights: newWeights });
  };

  return (
    <div className="space-y-6">
      {/* Header with enable toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">MIDI Quality Evaluator</span>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <span className="text-xs text-muted-foreground animate-in fade-in">{status}</span>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={() => save({ enabled: !config.enabled })}
            className={cn(
              "relative w-9 h-5 rounded-full transition-colors",
              config.enabled ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
              config.enabled ? "translate-x-4" : "translate-x-0.5"
            )} />
          </button>
        </div>
      </div>

      {!config.enabled && (
        <p className="text-xs text-muted-foreground">
          Evaluator is disabled. Generated clips will not be scored.
        </p>
      )}

      {config.enabled && (
        <>
          {/* Quick settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Auto-evaluate Explore First candidates</label>
              <button
                onClick={() => save({ auto_evaluate_candidates: !config.auto_evaluate_candidates })}
                className={cn(
                  "relative w-9 h-5 rounded-full transition-colors",
                  config.auto_evaluate_candidates ? "bg-primary" : "bg-muted"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                  config.auto_evaluate_candidates ? "translate-x-4" : "translate-x-0.5"
                )} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Weak below</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={config.weak_threshold}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) save({ weak_threshold: val });
                  }}
                  className="w-14 px-2 py-1 text-xs rounded bg-input border border-border text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Strong above</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={config.strong_threshold}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) save({ strong_threshold: val });
                  }}
                  className="w-14 px-2 py-1 text-xs rounded bg-input border border-border text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Dimension weights */}
          <div className="space-y-2">
            <button
              onClick={() => setWeightsOpen(!weightsOpen)}
              className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary transition-colors"
            >
              {weightsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Scoring Weights
            </button>

            {weightsOpen && (
              <div className="space-y-2 pl-1">
                {EVALUATION_DIMENSIONS.map(({ key, label, description }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-20 shrink-0">
                      <span className="text-xs text-foreground">{label}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      value={config.weights[key] ?? 1.0}
                      onChange={(e) => updateWeight(key, parseFloat(e.target.value))}
                      className="flex-1 h-1.5 accent-primary"
                    />
                    <span className="w-8 text-right text-xs text-muted-foreground">
                      {(config.weights[key] ?? 1.0).toFixed(1)}
                    </span>
                    <span className="text-[10px] text-muted-foreground hidden sm:block w-40 truncate" title={description}>
                      {description}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evaluator prompt editor */}
          <div className="space-y-2">
            <button
              onClick={() => setPromptOpen(!promptOpen)}
              className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary transition-colors"
            >
              {promptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Evaluator Prompt
            </button>

            {promptOpen && (
              <div className="space-y-2">
                <textarea
                  value={editedPrompt}
                  onChange={(e) => {
                    setEditedPrompt(e.target.value);
                    setPromptDirty(e.target.value !== config.prompt);
                  }}
                  rows={20}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-input border border-border text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Enter evaluator system prompt..."
                />
                {promptDirty && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => save({ prompt: editedPrompt })}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Save size={12} />
                      {saving ? "Saving..." : "Save Prompt"}
                    </button>
                    <button
                      onClick={() => {
                        setEditedPrompt(config.prompt);
                        setPromptDirty(false);
                      }}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
