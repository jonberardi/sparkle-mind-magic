import { useState } from "react";
import { ChevronDown, Music, Cpu, StickyNote, Gauge, Sparkles } from "lucide-react";
import type { AssistantAction } from "@/types";
import { cn } from "@/lib/utils";

const actionIcons: Record<string, React.ElementType> = {
  create_track: Music,
  create_clip: StickyNote,
  add_notes: StickyNote,
  load_device: Cpu,
  set_parameter: Gauge,
  set_tempo: Gauge,
  load_effect: Sparkles,
};

interface ActionCardProps {
  action: AssistantAction;
}

export function ActionCard({ action }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = actionIcons[action.action_type] || Sparkles;

  return (
    <div className="rounded-md border border-border bg-secondary/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted/30 transition-colors"
      >
        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="flex-1 text-foreground">{action.description}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-border">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
            {JSON.stringify(action.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
