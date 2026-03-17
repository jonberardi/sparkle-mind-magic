import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflowStore";
import {
  FLAT_NOTE_NAMES,
  SCALE_TYPES,
  HUMANIZE_PRESETS,
} from "@/types";

export function IndividualContextPanel() {
  const {
    individualSettings: s,
    setIndividualSettings,
    isPanelExpanded,
    setPanelExpanded,
  } = useWorkflowStore();

  const summary = [
    s.key,
    s.scale?.replace("_", " "),
    s.tempo ? `${s.tempo} BPM` : null,
    s.humanize_preset && s.humanize_preset !== "none" ? s.humanize_preset : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <div className="border-t border-border bg-card/50">
      {/* Collapsed summary / toggle */}
      <button
        onClick={() => setPanelExpanded(!isPanelExpanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{summary || "Set key, scale, tempo..."}</span>
        {isPanelExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {/* Expanded panel */}
      {isPanelExpanded && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Key */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Key
              <select
                value={s.key || ""}
                onChange={(e) =>
                  setIndividualSettings({ key: e.target.value || null })
                }
                className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">—</option>
                {FLAT_NOTE_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            {/* Scale */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Scale
              <select
                value={s.scale || ""}
                onChange={(e) =>
                  setIndividualSettings({ scale: e.target.value || null })
                }
                className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">—</option>
                {SCALE_TYPES.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            {/* Tempo */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              BPM
              <input
                type="number"
                min={20}
                max={300}
                value={s.tempo ?? ""}
                onChange={(e) =>
                  setIndividualSettings({
                    tempo: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="—"
                className="w-16 bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>

            {/* Humanize */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Feel
              <select
                value={s.humanize_preset || ""}
                onChange={(e) =>
                  setIndividualSettings({
                    humanize_preset: e.target.value || null,
                  })
                }
                className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">—</option>
                {HUMANIZE_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
