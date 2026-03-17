import { Component, useState, useEffect, useCallback } from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  Palette, Check, Plus, Copy, Pencil, Trash2, X,
  ChevronDown, ChevronUp, Music, Waves, Zap, Sliders, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { StyleProfile, StyleAIResult } from "@/types";
import { STYLE_WORLD_LABELS } from "@/types";
import { useProfileStore } from "@/stores/profileStore";
import { TagPill } from "@/components/TagPill";
import { StyleIdentityHeader } from "@/components/style/StyleIdentityHeader";
import { StyleSectionGroup } from "@/components/style/StyleSectionGroup";
import { StyleDrivesInfo } from "@/components/style/StyleDrivesInfo";
import { StyleAIRecommendBar } from "@/components/style/StyleAIRecommendBar";
import { StyleAIAuthorPanel } from "@/components/style/StyleAIAuthorPanel";
import { StyleReviewModal } from "@/components/style/StyleReviewModal";
import { StyleRefineDialog } from "@/components/style/StyleRefineDialog";
import { StyleInterviewDialog } from "@/components/style/StyleInterviewDialog";
import { cn } from "@/lib/utils";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

/** Prevents crashes in expanded panels from taking down the whole page. */
class SafeRender extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("ProfilesView render error:", error, info); }
  render() {
    if (this.state.error) return <div className="p-3 text-xs text-destructive">Render error: {this.state.error}</div>;
    return this.props.children;
  }
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const VOICING_STYLES = ["spread", "tight", "rootless", "shell"] as const;
const CHORD_EXTENSIONS = ["triads", "7ths", "9ths+", "13ths+"] as const;
const ATTACK_CHARACTERS = ["soft", "moderate", "percussive"] as const;
const MOODS = ["uplifting", "dark", "melancholic", "neutral", "aggressive", "dreamy"] as const;
const ENERGIES = ["low", "medium", "high"] as const;

// ── Reusable param editors ──

function ParamSlider({ label, value, onChange, min = 0, max = 1, step = 0.05 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-mono">{value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer" />
    </label>
  );
}

function ParamSelect<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly T[]; onChange: (v: T) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className="w-full px-2 py-1 text-xs rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function RangeInput({ label, value, onChange, min = 0, max = 127 }: {
  label: string; value: [number, number]; onChange: (v: [number, number]) => void; min?: number; max?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" min={min} max={max} value={value[0]}
          onChange={(e) => onChange([parseInt(e.target.value) || min, value[1]])}
          className="w-16 px-2 py-1 text-xs rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        <span className="text-[10px] text-muted-foreground">to</span>
        <input type="number" min={min} max={max} value={value[1]}
          onChange={(e) => onChange([value[0], parseInt(e.target.value) || max])}
          className="w-16 px-2 py-1 text-xs rounded-md bg-input border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>
    </label>
  );
}

function TagListInput({ label, value, onChange, placeholder }: {
  label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 px-2 py-1 text-xs rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        <button type="button" onClick={add} className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors">+</button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary">
              {v}
              <button onClick={() => onChange(value.filter((x) => x !== v))} className="hover:text-destructive"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
    </label>
  );
}

function ParamReadonly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

// ── Safe param defaults ──

function safeParams(raw: Record<string, unknown> | null | undefined): StyleProfile["params"] {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    voicing_style: (r.voicing_style ?? r.voicing_strategy ?? "spread") as StyleProfile["params"]["voicing_style"],
    chord_extensions: (r.chord_extensions ?? "7ths") as StyleProfile["params"]["chord_extensions"],
    rhythm_density: typeof r.rhythm_density === "number" ? r.rhythm_density : 0.5,
    syncopation: typeof r.syncopation === "number" ? r.syncopation : 0.3,
    velocity_range: Array.isArray(r.velocity_range) ? r.velocity_range as [number, number] : [60, 110],
    humanization_amount: typeof r.humanization_amount === "number" ? r.humanization_amount : 0.3,
    attack_character: (r.attack_character ?? "moderate") as StyleProfile["params"]["attack_character"],
    default_effects: Array.isArray(r.default_effects) ? r.default_effects as string[] : Array.isArray(r.preferred_effects) ? r.preferred_effects as string[] : [],
    tempo_range: Array.isArray(r.tempo_range) ? r.tempo_range as [number, number] : [80, 140],
    key_tendencies: Array.isArray(r.key_tendencies) ? r.key_tendencies as string[] : Array.isArray(r.key_preferences) ? r.key_preferences as string[] : [],
    mood_default: (r.mood_default ?? "neutral") as StyleProfile["params"]["mood_default"],
    energy_default: (r.energy_default ?? "medium") as StyleProfile["params"]["energy_default"],
  };
}

// ── Edit state ──

interface EditState {
  name: string;
  description: string;
  style_world: string | null;
  style_summary: string | null;
  reference_artists: string[];
  params: StyleProfile["params"];
}

// ── Main component ──

export default function ProfilesView() {
  const {
    profiles, activeProfileId, setActiveProfile, setProfiles,
    styleWorlds, setStyleWorlds, lastAIResult, aiApply, aiLoading, clearAIState,
  } = useProfileStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewStylePanel, setShowNewStylePanel] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewProfileId, setReviewProfileId] = useState<string | null>(null);
  const [refineDialogOpen, setRefineDialogOpen] = useState(false);
  const [refineProfileId, setRefineProfileId] = useState<string | null>(null);
  const [applySummary, setApplySummary] = useState<string | null>(null);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewProfileId, setInterviewProfileId] = useState<string | null>(null);
  const [pendingDeleteProfileId, setPendingDeleteProfileId] = useState<string | null>(null);
  const [interviewDescription, setInterviewDescription] = useState("");

  const fetchProfiles = useCallback(() => {
    fetch(`${API_URL}/api/profiles`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setProfiles(data);
      })
      .catch(() => {});
  }, [setProfiles]);

  const fetchStyleWorlds = useCallback(() => {
    fetch(`${API_URL}/api/style-worlds`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStyleWorlds(data.map((sw: { name: string; label: string; description: string }) => ({
            name: sw.name,
            label: sw.label,
            description: sw.description,
          })));
        }
      })
      .catch(() => {});
  }, [setStyleWorlds]);

  useEffect(() => { fetchProfiles(); fetchStyleWorlds(); }, [fetchProfiles, fetchStyleWorlds]);

  // Clear apply summary after 4 seconds
  useEffect(() => {
    if (applySummary) {
      const t = setTimeout(() => setApplySummary(null), 4000);
      return () => clearTimeout(t);
    }
  }, [applySummary]);

  const handleDuplicate = async (profile: StyleProfile) => {
    try {
      const res = await fetch(`${API_URL}/api/profiles/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: profile.id, new_name: `${profile.name} (Copy)` }),
      });
      if (res.ok) {
        const newProfile = await res.json();
        fetchProfiles();
        startEdit(newProfile);
      }
    } catch { /* silent */ }
  };

  const confirmDeleteProfile = async () => {
    if (!pendingDeleteProfileId) return;
    try {
      const res = await fetch(`${API_URL}/api/profiles/${pendingDeleteProfileId}`, { method: "DELETE" });
      if (res.ok) {
        fetchProfiles();
        if (editingId === pendingDeleteProfileId) {
          setEditingId(null);
          setEditState(null);
        }
      }
    } catch { /* silent */ }
    setPendingDeleteProfileId(null);
  };

  const startEdit = (profile: StyleProfile) => {
    if (profile.is_curated) {
      toast.info("Curated styles are read-only. Duplicate to customize.");
      return;
    }
    setEditingId(profile.id);
    setEditState({
      name: profile.name,
      description: profile.description,
      style_world: profile.style_world,
      style_summary: profile.style_summary,
      reference_artists: [...(profile.reference_artists || [])],
      params: safeParams(profile.params),
    });
    setExpandedId(profile.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editState) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/profiles/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editState.name,
          description: editState.description,
          style_world: editState.style_world,
          style_summary: editState.style_summary,
          reference_artists: editState.reference_artists,
          params: editState.params,
        }),
      });
      if (res.ok) {
        fetchProfiles();
        setEditingId(null);
        setEditState(null);
        toast.success("Style saved");
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const updateParam = <K extends keyof StyleProfile["params"]>(key: K, value: StyleProfile["params"][K]) => {
    if (!editState) return;
    setEditState({ ...editState, params: { ...editState.params, [key]: value } });
  };

  const handleIdentityChange = (updates: Partial<Pick<EditState, "name" | "style_world" | "style_summary" | "reference_artists">>) => {
    if (!editState) return;
    setEditState({ ...editState, ...updates });
  };

  // ── AI flow handlers ──

  const openReviewModal = (profileId: string) => {
    setReviewProfileId(profileId);
    setReviewModalOpen(true);
  };

  const handleAIRecommendComplete = () => {
    // lastAIResult is set by the store; open review modal
    if (editingId) {
      openReviewModal(editingId);
    }
  };

  const handleRefineWithAI = () => {
    if (editingId) {
      setRefineProfileId(editingId);
      setRefineDialogOpen(true);
    }
  };

  const handleRefineComplete = (result: StyleAIResult) => {
    setRefineDialogOpen(false);
    // result is now in lastAIResult via the store
    if (refineProfileId) {
      openReviewModal(refineProfileId);
    }
  };

  const handleApplyChanges = async (acceptedChanges: Record<string, unknown>) => {
    if (!reviewProfileId) return;
    const result = await aiApply(reviewProfileId, acceptedChanges);
    if (result) {
      setReviewModalOpen(false);
      setReviewProfileId(null);
      fetchProfiles();
      // Refresh edit state if we're editing this profile
      if (editingId === reviewProfileId) {
        const updated = result.profile;
        setEditState({
          name: updated.name,
          description: updated.description,
          style_world: updated.style_world,
          style_summary: updated.style_summary,
          reference_artists: [...(updated.reference_artists || [])],
          params: safeParams(updated.params),
        });
      }
      // Show compact summary (adjustment #9)
      setApplySummary(result.summary);
      toast.success(result.summary);
    }
  };

  // ── M3: Interview flow handlers ──

  const handleStartInterview = (description: string, profileId: string) => {
    setInterviewDescription(description);
    setInterviewProfileId(profileId);
    setInterviewDialogOpen(true);
    setShowNewStylePanel(false);
  };

  const handleInterviewComplete = (result: StyleAIResult) => {
    setInterviewDialogOpen(false);
    // result is now in lastAIResult via the store
    if (interviewProfileId) {
      openReviewModal(interviewProfileId);
    }
  };

  const handleNewProfileCreated = (profile: StyleProfile, aiResult?: StyleAIResult) => {
    fetchProfiles();
    setShowNewStylePanel(false);
    startEdit(profile);
    // If AI result came with the creation (Describe & Build path),
    // open the review modal immediately
    if (aiResult && aiResult.grouped_diffs.length > 0) {
      setReviewProfileId(profile.id);
      setReviewModalOpen(true);
    }
  };

  const isEditing = (id: string) => editingId === id;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Style Authoring</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define, refine, and evolve musical styles that shape how music is generated.
            </p>
          </div>
          <button
            onClick={() => setShowNewStylePanel(!showNewStylePanel)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              showNewStylePanel
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {showNewStylePanel ? <X size={14} /> : <Plus size={14} />}
            {showNewStylePanel ? "Cancel" : "New Style"}
          </button>
        </div>
      </div>

      {/* Apply summary banner (adjustment #9) */}
      {applySummary && (
        <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
          <Sparkles size={12} />
          {applySummary}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── New Style Panel (AI-first creation flow) ── */}
        {showNewStylePanel && (
          <div className="bg-card rounded-lg border border-violet-500/20 p-5">
            <StyleAIAuthorPanel
              onProfileCreated={handleNewProfileCreated}
              onStartInterview={handleStartInterview}
              profiles={profiles}
              styleWorlds={styleWorlds}
            />
          </div>
        )}

        {/* ── Profile list ── */}
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Palette className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No styles available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              const editing = isEditing(profile.id);
              const expanded = expandedId === profile.id;
              const p = editing && editState ? editState.params : safeParams(profile.params);
              const parentProfile = profile.parent_id ? profiles.find((pp) => pp.id === profile.parent_id) : null;

              return (
                <div
                  key={profile.id}
                  className={cn(
                    "bg-card rounded-lg border transition-colors",
                    isActive ? "border-primary" : "border-border"
                  )}
                >
                  {/* Card header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setActiveProfile(profile.id)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                        isActive ? "border-primary bg-primary" : "border-muted-foreground/30 hover:border-primary/50"
                      )}
                    >
                      {isActive && <Check size={10} className="text-primary-foreground" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-foreground truncate">{profile.name}</div>
                        {profile.style_world && !expanded && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary shrink-0">
                            <Palette size={9} />
                            {STYLE_WORLD_LABELS[profile.style_world] || profile.style_world}
                          </span>
                        )}
                      </div>
                      {!expanded && profile.style_summary && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{profile.style_summary}</p>
                      )}
                      {!expanded && !profile.style_summary && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{profile.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {profile.source_type === "curated" || profile.is_curated ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded border bg-violet-500/15 text-violet-400 border-violet-500/30 font-medium mr-1">Curated</span>
                      ) : profile.source_type === "derived" ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded border bg-sky-500/15 text-sky-400 border-sky-500/30 font-medium mr-1">Derived</span>
                      ) : null}
                      <button onClick={() => handleDuplicate(profile)} title="Duplicate to customize"
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-muted/50">
                        <Copy size={13} />
                      </button>
                      {!profile.is_curated && (
                        <button onClick={() => editing ? cancelEdit() : startEdit(profile)} title={editing ? "Cancel edit" : "Edit style"}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-muted/50">
                          {editing ? <X size={13} /> : <Pencil size={13} />}
                        </button>
                      )}
                      {!profile.is_curated && (
                        <button onClick={() => setPendingDeleteProfileId(profile.id)} title="Delete style"
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded hover:bg-muted/50">
                          <Trash2 size={13} />
                        </button>
                      )}
                      <button onClick={() => setExpandedId(expanded ? null : profile.id)}
                        title={expanded ? "Collapse" : "Expand"}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50">
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Quick summary pills (collapsed) */}
                  {!expanded && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded">{p.voicing_style}</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded">{p.chord_extensions}</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded">{p.mood_default}</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded">{p.energy_default}</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded">{p.attack_character}</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded">{p.tempo_range[0]}&ndash;{p.tempo_range[1]} BPM</span>
                      {(profile.reference_artists || []).length > 0 && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          {(profile.reference_artists || []).slice(0, 2).join(", ")}
                          {(profile.reference_artists || []).length > 2 && "..."}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tags (collapsed) */}
                  {!expanded && (profile.tags ?? []).length > 0 && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1">
                      {(profile.tags ?? []).map((tag) => (
                        <TagPill key={tag.id} name={tag.name} category={tag.category} />
                      ))}
                    </div>
                  )}

                  {/* ── Expanded: Style Authoring Panel ── */}
                  {expanded && (
                    <SafeRender><div className="border-t border-border px-4 py-4 space-y-4">

                      {/* Style Identity Header */}
                      <StyleIdentityHeader
                        profile={profile}
                        editing={editing}
                        parentName={parentProfile?.name || null}
                        styleWorlds={styleWorlds}
                        editState={editing && editState ? {
                          name: editState.name,
                          style_world: editState.style_world,
                          style_summary: editState.style_summary,
                          reference_artists: editState.reference_artists,
                        } : null}
                        onEditChange={handleIdentityChange}
                        onRefineWithAI={handleRefineWithAI}
                      />

                      {/* AI Recommend Bar (edit mode only) */}
                      {editing && (
                        <StyleAIRecommendBar
                          profileId={profile.id}
                          onRecommendComplete={handleAIRecommendComplete}
                        />
                      )}

                      {/* Style Drives Info */}
                      <StyleDrivesInfo />

                      {/* Description (edit mode) */}
                      {editing && editState && (
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground font-medium">Description</label>
                          <textarea
                            value={editState.description}
                            onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                            rows={2}
                            className="w-full px-2 py-1 text-xs rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            placeholder="Short description of this style..."
                          />
                        </div>
                      )}

                      {/* Tags */}
                      {(profile.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(profile.tags ?? []).map((tag) => (
                            <TagPill key={tag.id} name={tag.name} category={tag.category} />
                          ))}
                        </div>
                      )}

                      {/* ── Section Groups ── */}

                      {/* 1. Harmonic Language */}
                      <StyleSectionGroup
                        title="Harmonic Language"
                        tier="character"
                        icon={<Music size={13} />}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {editing ? (
                            <>
                              <ParamSelect label="Voicing Style" value={p.voicing_style} options={VOICING_STYLES} onChange={(v) => updateParam("voicing_style", v)} />
                              <ParamSelect label="Chord Extensions" value={p.chord_extensions} options={CHORD_EXTENSIONS} onChange={(v) => updateParam("chord_extensions", v)} />
                              <ParamSelect label="Mood Color" value={p.mood_default} options={MOODS} onChange={(v) => updateParam("mood_default", v)} />
                            </>
                          ) : (
                            <>
                              <ParamReadonly label="Voicing Style" value={p.voicing_style} />
                              <ParamReadonly label="Chord Extensions" value={p.chord_extensions} />
                              <ParamReadonly label="Mood Color" value={p.mood_default} />
                            </>
                          )}
                        </div>
                        {editing ? (
                          <div className="mt-3">
                            <TagListInput label="Key Tendencies" value={p.key_tendencies} onChange={(v) => updateParam("key_tendencies", v)} placeholder="e.g. Eb, Ab, Bb..." />
                          </div>
                        ) : p.key_tendencies.length > 0 ? (
                          <div className="mt-2">
                            <ParamReadonly label="Key Tendencies" value={p.key_tendencies.join(", ")} />
                          </div>
                        ) : null}
                      </StyleSectionGroup>

                      {/* 2. Groove & Motion */}
                      <StyleSectionGroup
                        title="Groove & Motion"
                        tier="character"
                        icon={<Waves size={13} />}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {editing ? (
                            <>
                              <ParamSlider label="Rhythm Density" value={p.rhythm_density} onChange={(v) => updateParam("rhythm_density", v)} />
                              <ParamSlider label="Syncopation" value={p.syncopation} onChange={(v) => updateParam("syncopation", v)} />
                              <ParamSlider label="Humanization" value={p.humanization_amount} onChange={(v) => updateParam("humanization_amount", v)} />
                              <ParamSelect label="Attack Character" value={p.attack_character} options={ATTACK_CHARACTERS} onChange={(v) => updateParam("attack_character", v)} />
                            </>
                          ) : (
                            <>
                              <ParamReadonly label="Rhythm Density" value={p.rhythm_density.toFixed(2)} />
                              <ParamReadonly label="Syncopation" value={p.syncopation.toFixed(2)} />
                              <ParamReadonly label="Humanization" value={p.humanization_amount.toFixed(2)} />
                              <ParamReadonly label="Attack Character" value={p.attack_character} />
                            </>
                          )}
                        </div>
                      </StyleSectionGroup>

                      {/* 3. Energy & Expression */}
                      <StyleSectionGroup
                        title="Energy & Expression"
                        tier="character"
                        icon={<Zap size={13} />}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {editing ? (
                            <>
                              <ParamSelect label="Default Energy" value={p.energy_default} options={ENERGIES} onChange={(v) => updateParam("energy_default", v)} />
                              <RangeInput label="Velocity Range" value={p.velocity_range} onChange={(v) => updateParam("velocity_range", v)} />
                              <RangeInput label="Tempo Range (BPM)" value={p.tempo_range} onChange={(v) => updateParam("tempo_range", v)} min={40} max={300} />
                            </>
                          ) : (
                            <>
                              <ParamReadonly label="Default Energy" value={p.energy_default} />
                              <ParamReadonly label="Velocity Range" value={`${p.velocity_range[0]} \u2013 ${p.velocity_range[1]}`} />
                              <ParamReadonly label="Tempo Range" value={`${p.tempo_range[0]} \u2013 ${p.tempo_range[1]} BPM`} />
                            </>
                          )}
                        </div>
                      </StyleSectionGroup>

                      {/* 4. Production Character */}
                      <StyleSectionGroup
                        title="Production Character"
                        tier="character"
                        icon={<Sliders size={13} />}
                      >
                        {editing ? (
                          <TagListInput label="Effects Tendencies" value={p.default_effects} onChange={(v) => updateParam("default_effects", v)} placeholder="e.g. reverb, delay, chorus..." />
                        ) : p.default_effects.length > 0 ? (
                          <ParamReadonly label="Effects Tendencies" value={p.default_effects.join(", ")} />
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">No production preferences set.</p>
                        )}
                      </StyleSectionGroup>

                      {/* 5. Advanced (collapsed by default) */}
                      <StyleSectionGroup
                        title="Advanced"
                        tier="fine-tuning"
                        defaultOpen={false}
                      >
                        <p className="text-[11px] text-muted-foreground italic">
                          Lower-level scalar and technical controls will be available in a future update.
                        </p>
                      </StyleSectionGroup>

                      {/* Parent lineage (read-only view) */}
                      {!editing && parentProfile && (
                        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                          Derived from: {parentProfile.name}
                        </div>
                      )}

                      {/* Save / cancel buttons */}
                      {editing && (
                        <div className="flex items-center gap-2 pt-3 border-t border-border">
                          <button onClick={saveEdit} disabled={saving}
                            className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors">
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                          <button onClick={cancelEdit}
                            className="px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors">
                            Cancel
                          </button>
                        </div>
                      )}
                    </div></SafeRender>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Review Modal (trust layer) ── */}
      {reviewModalOpen && lastAIResult && (
        <StyleReviewModal
          open={reviewModalOpen}
          groupedDiffs={lastAIResult.grouped_diffs}
          onApply={handleApplyChanges}
          onCancel={() => {
            setReviewModalOpen(false);
            setReviewProfileId(null);
            clearAIState();
          }}
          loading={aiLoading}
          interpretationSummary={lastAIResult.interpretation_summary}
          clarificationSummary={lastAIResult.clarification_summary}
        />
      )}

      {/* ── Refine Dialog ── */}
      {refineDialogOpen && refineProfileId && (
        <StyleRefineDialog
          open={refineDialogOpen}
          profileId={refineProfileId}
          onComplete={handleRefineComplete}
          onCancel={() => {
            setRefineDialogOpen(false);
            setRefineProfileId(null);
            clearAIState();
          }}
        />
      )}

      {/* ── M3: Interview Dialog ── */}
      {interviewDialogOpen && interviewProfileId && (
        <StyleInterviewDialog
          open={interviewDialogOpen}
          profileId={interviewProfileId}
          description={interviewDescription}
          onComplete={handleInterviewComplete}
          onCancel={() => {
            setInterviewDialogOpen(false);
            setInterviewProfileId(null);
            setInterviewDescription("");
            clearAIState();
          }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!pendingDeleteProfileId}
        onClose={() => setPendingDeleteProfileId(null)}
        onConfirm={confirmDeleteProfile}
        title={`Delete "${profiles.find((p) => p.id === pendingDeleteProfileId)?.name || "style"}"?`}
        description="This will permanently delete this style profile. This action cannot be undone."
      />
    </div>
  );
}
