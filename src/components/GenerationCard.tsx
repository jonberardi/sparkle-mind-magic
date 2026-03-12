import { ThumbsUp, ThumbsDown, Copy, GitBranch } from "lucide-react";
import type { Generation } from "@/types";
import { TagPill } from "@/components/TagPill";
import { StarRating } from "@/components/StarRating";
import { useWebSocketStore } from "@/stores/websocketStore";
import { cn } from "@/lib/utils";

interface GenerationCardProps {
  generation: Generation;
}

export function GenerationCard({ generation }: GenerationCardProps) {
  const { send } = useWebSocketStore();

  const handleRate = (rating: number) => {
    send({ type: "rate_generation", generation_id: generation.id, rating, thumbs: null });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="text-sm font-medium text-foreground">{generation.description}</div>

      {/* Tags */}
      {generation.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {generation.tags.map((tag) => (
            <TagPill key={tag.id} name={tag.name} category={tag.category} />
          ))}
        </div>
      )}

      {/* Rating */}
      <div className="flex items-center gap-3">
        <StarRating rating={generation.rating} onChange={handleRate} />
        <div className="flex items-center gap-1">
          <button className={cn("p-1 rounded hover:bg-muted transition-colors", generation.thumbs === "up" && "text-success")}>
            <ThumbsUp size={14} />
          </button>
          <button className={cn("p-1 rounded hover:bg-muted transition-colors", generation.thumbs === "down" && "text-destructive")}>
            <ThumbsDown size={14} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors">
          <Copy size={12} /> Duplicate
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors">
          <GitBranch size={12} /> Fork
        </button>
      </div>
    </div>
  );
}
