import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  size?: number;
}

export function StarRating({ rating, onChange, size = 16 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onClick={() => onChange?.(i)}
          className={cn(
            "transition-colors",
            onChange ? "cursor-pointer hover:text-star" : "cursor-default"
          )}
        >
          <Star
            size={size}
            className={cn(
              i <= (rating || 0) ? "fill-star text-star" : "text-muted"
            )}
          />
        </button>
      ))}
    </div>
  );
}
