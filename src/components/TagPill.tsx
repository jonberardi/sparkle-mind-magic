import type { TagCategory } from "@/types";
import { cn } from "@/lib/utils";

const categoryClasses: Record<TagCategory, string> = {
  instrument: "bg-tag-instrument/10 text-tag-instrument",
  style: "bg-tag-style/10 text-tag-style",
  mood: "bg-tag-mood/10 text-tag-mood",
  key: "bg-tag-key/10 text-tag-key",
  scale: "bg-tag-scale/10 text-tag-scale",
  tempo_range: "bg-tag-tempo/10 text-tag-tempo",
  energy: "bg-tag-energy/10 text-tag-energy",
  texture: "bg-tag-texture/10 text-tag-texture",
  technique: "bg-tag-technique/10 text-tag-technique",
};

interface TagPillProps {
  name: string;
  category: TagCategory;
  onRemove?: () => void;
  className?: string;
}

export function TagPill({ name, category, onRemove, className }: TagPillProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", categoryClasses[category], className)}>
      {name}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70 ml-0.5">×</button>
      )}
    </span>
  );
}
