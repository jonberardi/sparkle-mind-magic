/**
 * WorkflowPicker — the primary decision point in the generation flow.
 *
 * Quick Generate is the only active workflow in the current milestone.
 * Guided and Explore are shown as upcoming previews — visible but
 * clearly non-interactive so users understand what's coming without
 * being misled into a dead-end state.
 */

import { Zap, MessageSquareText, Layers } from "lucide-react";

export type GenerationWorkflow = "quick" | "guided" | "explore";

interface WorkflowPickerProps {
  selected: GenerationWorkflow;
  onChange: (workflow: GenerationWorkflow) => void;
}

const WORKFLOWS: {
  id: GenerationWorkflow;
  label: string;
  description: string;
  icon: typeof Zap;
  enabled: boolean;
}[] = [
  {
    id: "quick",
    label: "Quick Generate",
    description: "Straight to Ableton",
    icon: Zap,
    enabled: true,
  },
  {
    id: "explore",
    label: "Explore Ideas",
    description: "Compare candidates",
    icon: Layers,
    enabled: true,
  },
];

export function WorkflowPicker({ selected, onChange }: WorkflowPickerProps) {
  return (
    <div className="flex gap-1.5">
      {WORKFLOWS.map((wf) => {
        const active = wf.enabled && selected === wf.id;
        const Icon = wf.icon;

        if (!wf.enabled) {
          return (
            <div
              key={wf.id}
              className="flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-md border border-border/40 bg-card/20 text-center opacity-40 cursor-default select-none"
              title={
                wf.id === "guided"
                  ? "Guided refinement arrives next: AI follow-up questions to sharpen your prompt."
                  : "Explore Ideas arrives next: compare candidate clips before sending to Ableton."
              }
            >
              <Icon size={14} strokeWidth={2} className="text-muted-foreground/60" />
              <span className="text-[10px] font-medium leading-tight text-muted-foreground/60">
                {wf.label}
              </span>
              <span className="text-[8px] leading-tight text-muted-foreground/40 italic">
                {wf.description}
              </span>
            </div>
          );
        }

        return (
          <button
            key={wf.id}
            onClick={() => onChange(wf.id)}
            className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-md border transition-all text-center ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            <Icon size={14} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-tight">{wf.label}</span>
            <span className="text-[8px] leading-tight opacity-70">{wf.description}</span>
          </button>
        );
      })}
    </div>
  );
}
