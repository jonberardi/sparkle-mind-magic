import { useState } from "react";
import { Sparkles, Loader2, Wand2, Copy, FileText, MessageCircle } from "lucide-react";
import type { StyleProfile, StyleAIResult } from "@/types";
import { useProfileStore, type StyleWorldSummary } from "@/stores/profileStore";
import { STYLE_WORLD_LABELS } from "@/types";
import { cn } from "@/lib/utils";

type NewStylePath = "describe" | "curated" | "blank" | null;

interface StyleAIAuthorPanelProps {
  /** Called when a new profile is created and ready for review/editing */
  onProfileCreated: (profile: StyleProfile, aiResult?: StyleAIResult) => void;
  /** Called when user chooses Interview Me mode — parent opens the interview dialog */
  onStartInterview?: (description: string, profileId: string) => void;
  /** All available profiles (for curated selection) */
  profiles: StyleProfile[];
  styleWorlds: StyleWorldSummary[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function StyleAIAuthorPanel({
  onProfileCreated,
  onStartInterview,
  profiles,
  styleWorlds,
}: StyleAIAuthorPanelProps) {
  const [activePath, setActivePath] = useState<NewStylePath>(null);
  const [description, setDescription] = useState("");
  const [selectedCuratedId, setSelectedCuratedId] = useState<string | null>(null);
  const { aiLoading, aiRecommend } = useProfileStore();

  const curatedProfiles = profiles.filter((p) => p.is_curated);

  const handleDescribeAndBuild = async () => {
    if (!description.trim() || aiLoading) return;

    // 1. Create a new blank profile
    try {
      const createRes = await fetch(`${API_URL}/api/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Style", description: description.trim() }),
      });
      if (!createRes.ok) return;
      const newProfile: StyleProfile = await createRes.json();

      // 2. Run AI recommend on it
      const result = await aiRecommend(newProfile.id, description.trim());
      onProfileCreated(newProfile, result ?? undefined);
    } catch {
      // silent
    }
  };

  const handleStartFromCurated = async () => {
    if (!selectedCuratedId) return;

    try {
      const curated = curatedProfiles.find((p) => p.id === selectedCuratedId);
      const res = await fetch(`${API_URL}/api/profiles/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: selectedCuratedId,
          new_name: curated ? `${curated.name} (Custom)` : "Custom Style",
        }),
      });
      if (!res.ok) return;
      const newProfile: StyleProfile = await res.json();
      // Signal to parent — curated path, no AI result yet (user chooses next action)
      onProfileCreated(newProfile);
    } catch {
      // silent
    }
  };

  const handleBlankStyle = async () => {
    try {
      const res = await fetch(`${API_URL}/api/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Style", description: "Custom style" }),
      });
      if (!res.ok) return;
      const newProfile: StyleProfile = await res.json();
      onProfileCreated(newProfile);
    } catch {
      // silent
    }
  };

  // Collapsed state — show the three entry paths
  if (activePath === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Create a New Style</h3>
        <div className="grid gap-2">
          {/* Primary: Describe & Build */}
          <button
            onClick={() => setActivePath("describe")}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors text-left"
          >
            <div className="p-2 rounded-md bg-violet-500/15">
              <Sparkles size={16} className="text-violet-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Describe Your Style</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Tell the AI what you want and it will build a style for you
              </div>
            </div>
          </button>

          {/* Secondary: Start from Curated */}
          <button
            onClick={() => setActivePath("curated")}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-sky-500/30 hover:bg-sky-500/5 transition-colors text-left"
          >
            <div className="p-2 rounded-md bg-sky-500/10">
              <Copy size={16} className="text-sky-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Start from Curated</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Pick a curated style, duplicate it, then customize or refine with AI
              </div>
            </div>
          </button>

          {/* Tertiary: Blank */}
          <button
            onClick={() => { setActivePath("blank"); handleBlankStyle(); }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors text-left opacity-70 hover:opacity-100"
          >
            <div className="p-2 rounded-md bg-muted/50">
              <FileText size={16} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Start Blank</div>
              <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                Create an empty style and set everything manually
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const handleInterviewMe = async () => {
    if (!description.trim() || aiLoading || !onStartInterview) return;

    // Create a new blank profile, then hand off to parent for interview
    try {
      const createRes = await fetch(`${API_URL}/api/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Style", description: description.trim() }),
      });
      if (!createRes.ok) return;
      const newProfile: StyleProfile = await createRes.json();
      onStartInterview(description.trim(), newProfile.id);
      onProfileCreated(newProfile);
    } catch {
      // silent
    }
  };

  // Describe & Build flow
  if (activePath === "describe") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles size={12} className="text-violet-400" />
            Describe Your Style
          </h3>
          <button
            onClick={() => { setActivePath(null); setDescription(""); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe the musical style you want to create. Include genre, mood, energy, influences, or any musical characteristics...\n\nExample: Warm soulful deep house with lush jazzy chords, rolling grooves, and a dreamy late-night vibe. Think Kerri Chandler meets Moodymann."
          disabled={aiLoading}
          className="w-full px-3 py-2 text-xs rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none disabled:opacity-50 leading-relaxed"
        />
        <div className="flex items-center gap-2">
          {/* Primary: Interview Me (recommended for nuanced prompts) */}
          {onStartInterview && (
            <button
              onClick={handleInterviewMe}
              disabled={!description.trim() || aiLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {aiLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <MessageCircle size={12} />
              )}
              Interview Me
            </button>
          )}
          {/* Secondary: Quick Recommend */}
          <button
            onClick={handleDescribeAndBuild}
            disabled={!description.trim() || aiLoading}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              onStartInterview
                ? "text-muted-foreground border border-border hover:border-violet-500/30 hover:text-foreground hover:bg-muted/30"
                : "bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25",
            )}
          >
            <Wand2 size={12} />
            Quick Recommend
          </button>
          {aiLoading && (
            <span className="text-[10px] text-muted-foreground animate-pulse">
              AI is analyzing your description...
            </span>
          )}
        </div>
        {onStartInterview && (
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            Interview Me guides you through clarifying questions for a more precise result.
            Quick Recommend generates a style in one shot.
          </p>
        )}
      </div>
    );
  }

  // Start from Curated flow (adjustment #6: duplicate -> refine/use/edit)
  if (activePath === "curated") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Copy size={12} className="text-sky-400" />
            Start from Curated
          </h3>
          <button
            onClick={() => { setActivePath(null); setSelectedCuratedId(null); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
        </div>
        <div className="grid gap-1.5 max-h-48 overflow-y-auto">
          {curatedProfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedCuratedId(p.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors",
                selectedCuratedId === p.id
                  ? "border-sky-500/50 bg-sky-500/10"
                  : "border-border/50 hover:border-border hover:bg-muted/20",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{p.name}</div>
                {p.style_summary && (
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">{p.style_summary}</div>
                )}
              </div>
              {p.style_world && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                  {STYLE_WORLD_LABELS[p.style_world] || p.style_world}
                </span>
              )}
            </button>
          ))}
        </div>
        {selectedCuratedId && (
          <button
            onClick={handleStartFromCurated}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition-colors"
          >
            <Copy size={12} />
            Duplicate & Customize
          </button>
        )}
      </div>
    );
  }

  return null;
}
