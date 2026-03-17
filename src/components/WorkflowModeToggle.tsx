import { Music, Disc } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflowStore";
import type { WorkflowMode } from "@/types";

const modes: { value: WorkflowMode; label: string; icon: typeof Music }[] = [
  { value: "song", label: "Song", icon: Disc },
  { value: "individual", label: "Individual", icon: Music },
];

export function WorkflowModeToggle() {
  const { mode, setMode } = useWorkflowStore();

  return (
    <div className="flex items-center bg-muted rounded-md p-0.5">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.value;
        return (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={12} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
