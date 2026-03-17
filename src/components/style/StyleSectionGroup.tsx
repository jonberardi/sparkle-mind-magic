import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type StyleTier = "foundation" | "character" | "fine-tuning";

const TIER_CONFIG: Record<StyleTier, { borderColor: string; label: string; labelColor: string }> = {
  foundation: {
    borderColor: "border-l-violet-500",
    label: "Foundation",
    labelColor: "text-violet-400",
  },
  character: {
    borderColor: "border-l-sky-500",
    label: "Character",
    labelColor: "text-sky-400",
  },
  "fine-tuning": {
    borderColor: "border-l-muted-foreground/30",
    label: "Fine-tuning",
    labelColor: "text-muted-foreground",
  },
};

interface StyleSectionGroupProps {
  title: string;
  tier: StyleTier;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  overriddenCount?: number;
  totalCount?: number;
  children: React.ReactNode;
}

export function StyleSectionGroup({
  title,
  tier,
  icon,
  defaultOpen = true,
  overriddenCount,
  totalCount,
  children,
}: StyleSectionGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const config = TIER_CONFIG[tier];

  return (
    <div className={cn("border-l-2 rounded-r-md", config.borderColor)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors rounded-r-md"
      >
        {open ? <ChevronDown size={13} className="text-muted-foreground shrink-0" /> : <ChevronRight size={13} className="text-muted-foreground shrink-0" />}
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide flex-1">{title}</span>
        <span className={cn("text-[9px] font-medium uppercase tracking-wider", config.labelColor)}>{config.label}</span>
        {overriddenCount !== undefined && totalCount !== undefined && (
          <span className="text-[10px] text-muted-foreground ml-1">
            {overriddenCount}/{totalCount}
          </span>
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
