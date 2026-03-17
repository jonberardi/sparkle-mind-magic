import { useState } from "react";
import { Sparkles, GitBranch, Palette } from "lucide-react";
import type { StyleProfile, StyleSourceType } from "@/types";
import { STYLE_WORLD_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import type { StyleWorldSummary } from "@/stores/profileStore";

const SOURCE_TYPE_CONFIG: Record<StyleSourceType, { label: string; className: string }> = {
  curated: { label: "Curated", className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  custom: { label: "Custom", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  derived: { label: "Derived", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  song_applied: { label: "Song Style", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

interface StyleIdentityHeaderProps {
  profile: StyleProfile;
  editing: boolean;
  parentName: string | null;
  styleWorlds: StyleWorldSummary[];
  editState: {
    name: string;
    style_world: string | null;
    style_summary: string | null;
    reference_artists: string[];
  } | null;
  onEditChange: (updates: Partial<{
    name: string;
    style_world: string | null;
    style_summary: string | null;
    reference_artists: string[];
  }>) => void;
  onRefineWithAI: () => void;
}

export function StyleIdentityHeader({
  profile,
  editing,
  parentName,
  styleWorlds,
  editState,
  onEditChange,
  onRefineWithAI,
}: StyleIdentityHeaderProps) {
  const sourceType = profile.source_type || (profile.is_curated ? "curated" : "custom");
  const sourceConfig = SOURCE_TYPE_CONFIG[sourceType];
  const styleWorld = editing && editState ? editState.style_world : profile.style_world;
  const styleSummary = editing && editState ? editState.style_summary : profile.style_summary;
  const referenceArtists = editing && editState ? editState.reference_artists : profile.reference_artists;

  return (
    <div className="space-y-3">
      {/* Name + badges row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {editing && editState ? (
            <input
              value={editState.name}
              onChange={(e) => onEditChange({ name: e.target.value })}
              className="w-full px-2 py-1 text-sm font-semibold rounded bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Style name..."
            />
          ) : (
            <h3 className="text-sm font-semibold text-foreground truncate">{profile.name}</h3>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded border", sourceConfig.className)}>
            {sourceConfig.label}
          </span>
          {styleWorld && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border bg-primary/10 text-primary border-primary/20">
              <Palette size={10} />
              {STYLE_WORLD_LABELS[styleWorld] || styleWorld}
            </span>
          )}
        </div>
      </div>

      {/* Lineage */}
      {parentName && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <GitBranch size={11} />
          <span>Derived from <span className="text-foreground font-medium">{parentName}</span></span>
        </div>
      )}

      {/* Style World selector (edit mode) */}
      {editing && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground font-medium">Style World</label>
          <select
            value={editState?.style_world || ""}
            onChange={(e) => onEditChange({ style_world: e.target.value || null })}
            className="w-full px-2 py-1.5 text-xs rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">No style world</option>
            {styleWorlds.map((sw) => (
              <option key={sw.name} value={sw.name}>{sw.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Style summary */}
      <div className="space-y-1">
        {editing ? (
          <>
            <label className="text-[11px] text-muted-foreground font-medium">Style Summary</label>
            <textarea
              value={editState?.style_summary || ""}
              onChange={(e) => onEditChange({ style_summary: e.target.value || null })}
              rows={3}
              className="w-full px-2 py-1.5 text-xs rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
              placeholder="Describe this style's musical character in natural language..."
            />
          </>
        ) : styleSummary ? (
          <p className="text-xs text-muted-foreground leading-relaxed italic">"{styleSummary}"</p>
        ) : null}
      </div>

      {/* Reference artists */}
      {(editing || (referenceArtists && referenceArtists.length > 0)) && (
        <div className="space-y-1">
          {editing ? (
            <ReferenceArtistsEditor
              artists={editState?.reference_artists || []}
              onChange={(artists) => onEditChange({ reference_artists: artists })}
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Influences:</span>
              {referenceArtists.map((artist) => (
                <span key={artist} className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
                  {artist}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI action button */}
      {editing && (
        <button
          onClick={onRefineWithAI}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
        >
          <Sparkles size={13} />
          Refine with AI
        </button>
      )}
    </div>
  );
}

function ReferenceArtistsEditor({ artists, onChange }: { artists: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !artists.includes(trimmed)) {
      onChange([...artists, trimmed]);
      setInput("");
    }
  };
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-muted-foreground font-medium">Reference Artists / Influences</label>
      <div className="flex items-center gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="e.g. Kerri Chandler, Larry Heard..."
          className="flex-1 px-2 py-1 text-xs rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button type="button" onClick={add} className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors">+</button>
      </div>
      {artists.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {artists.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary">
              {a}
              <button onClick={() => onChange(artists.filter((x) => x !== a))} className="hover:text-destructive">
                <span className="text-[9px]">&times;</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
