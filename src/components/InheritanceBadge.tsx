/**
 * InheritanceBadge — compact indicator showing where a field's value comes from.
 *
 * States:
 *   locked     — hard-locked from song level (key, scale, bpm, role)
 *   inherited  — value flows from a parent level or style world default
 *   overridden — explicitly set at this level, overriding parent
 *   style_world — filled by style world defaults
 *   unset      — no value at any level
 */

import { Lock, ArrowDown, Pencil, Palette } from "lucide-react";
import type { InheritanceState } from "@/types";

const CONFIG: Record<
  InheritanceState,
  { icon: typeof Lock; label: string; className: string; title: string }
> = {
  locked: {
    icon: Lock,
    label: "Locked",
    className: "text-amber-500/70",
    title: "Locked at song level — cannot be overridden",
  },
  inherited: {
    icon: ArrowDown,
    label: "Inherited",
    className: "text-muted-foreground/50",
    title: "Inherited from parent level",
  },
  overridden: {
    icon: Pencil,
    label: "Overridden",
    className: "text-primary/70",
    title: "Overridden at this level",
  },
  unset: {
    icon: ArrowDown,
    label: "",
    className: "text-muted-foreground/30",
    title: "Not set at any level",
  },
};

// Also handle "style_world" as a variant of inherited
const STYLE_WORLD_CONFIG = {
  icon: Palette,
  label: "Style default",
  className: "text-violet-400/60",
  title: "Filled by style world defaults",
};

interface InheritanceBadgeProps {
  state: InheritanceState | "style_world";
  size?: number;
  showLabel?: boolean;
}

export function InheritanceBadge({ state, size = 10, showLabel = false }: InheritanceBadgeProps) {
  if (state === "unset") return null;

  const config = state === "style_world" ? STYLE_WORLD_CONFIG : CONFIG[state];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${config.className}`}
      title={config.title}
    >
      <Icon size={size} />
      {showLabel && config.label && (
        <span className="text-[8px] uppercase tracking-wide">{config.label}</span>
      )}
    </span>
  );
}
