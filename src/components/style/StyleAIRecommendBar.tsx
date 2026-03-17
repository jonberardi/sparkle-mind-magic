import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useProfileStore } from "@/stores/profileStore";

interface StyleAIRecommendBarProps {
  profileId: string;
  onRecommendComplete: () => void;
  disabled?: boolean;
}

export function StyleAIRecommendBar({ profileId, onRecommendComplete, disabled }: StyleAIRecommendBarProps) {
  const [input, setInput] = useState("");
  const { aiLoading, aiRecommend } = useProfileStore();

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || aiLoading) return;
    const result = await aiRecommend(profileId, trimmed);
    if (result) {
      onRecommendComplete();
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
        <Sparkles size={11} className="text-violet-400" />
        Describe & Build
      </label>
      <div className="flex items-center gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
          placeholder="e.g. Warm soulful deep house with lush pads and rolling grooves..."
          disabled={disabled || aiLoading}
          className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || aiLoading || disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {aiLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          AI Recommend
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground/70">
        Describe the musical direction and AI will recommend style parameters for review.
      </p>
    </div>
  );
}
