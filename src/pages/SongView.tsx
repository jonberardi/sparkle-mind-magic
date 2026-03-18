import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Send,
  Loader2,
  Music2,
  Trash2,
  MessageSquare,
  Pencil,
  Check,
  X,
  Wand2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useProfileStore } from "@/stores/profileStore";
import { useWebSocketStore } from "@/stores/websocketStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { ChatMessage, StreamingMessage } from "@/components/ChatMessage";
import { SectionPills } from "@/components/SectionPills";
import { SectionEditor } from "@/components/SectionEditor";
import { SongSetupDialog } from "@/components/SongSetupDialog";
import { GenerationPanel } from "@/components/generation";
import type { ExploreSentSummary } from "@/components/ExplorePanel";
import { SectionClipList } from "@/components/SectionClipList";
import { SectionIdentitySummary } from "@/components/SectionIdentitySummary";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import type { Song, SongSection, ChordEntry, Generation } from "@/types";
import { STYLE_WORLD_LABELS } from "@/types";

import { API_BASE } from "@/lib/api";

export default function SongView() {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();

  // Stores
  const {
    activeSong,
    sections,
    activeSectionId,
    setActiveSong,
    setActiveSection,
    addSection,
    updateSong,
    updateSection,
    removeSection,
  } = useWorkflowStore();

  const {
    activeConversationId,
    streamingContent,
    isStreaming,
    isProcessing,
    statusMessage,
    addUserMessage,
    getActiveConversation,
    setActiveConversation,
    startNewConversation,
    loadSongConversations,
  } = useChatStore();

  const { send, abletonConnected } = useWebSocketStore();
  const { activeProfileId, profiles } = useProfileStore();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // Local state
  const [loading, setLoading] = useState(true);
  const [showSongDialog, setShowSongDialog] = useState(false);
  const [isNewSongSetup, setIsNewSongSetup] = useState(false);
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [editingSection, setEditingSection] = useState<SongSection | null>(null);
  const [input, setInput] = useState("");
  const [sectionClips, setSectionClips] = useState<Generation[]>([]);
  const [songClips, setSongClips] = useState<Generation[]>([]);
  const [wizardOpen, setWizardOpen] = useState(true);
  const [renamingSong, setRenamingSong] = useState(false);
  const [renameSongValue, setRenameSongValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const [pendingDeleteSectionId, setPendingDeleteSectionId] = useState<string | null>(null);

  const conversation = getActiveConversation();
  const messages = conversation?.messages || [];
  const activeSection = sections.find((s) => s.id === activeSectionId);

  // Load song on mount
  useEffect(() => {
    if (!songId) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/songs/${songId}`);
        if (!res.ok) { navigate("/songs"); return; }
        const song: Song = await res.json();
        setActiveSong(song, song.sections || []);
        useWorkflowStore.getState().setMode("song");
      } catch { navigate("/songs"); }
      finally { setLoading(false); }
    };
    load();
  }, [songId]);

  // Reset conversation state and load song-scoped conversations
  useEffect(() => {
    if (!songId) return;
    startNewConversation();
    loadSongConversations(songId);
  }, [songId]);

  // Auto-open setup dialog for unconfigured songs
  useEffect(() => {
    if (!loading && activeSong && !activeSong.key && !activeSong.style_world && sections.length === 0) {
      setIsNewSongSetup(true);
      setShowSongDialog(true);
    }
  }, [loading, activeSong?.id]);

  // Fetch song-level clips
  const fetchSongClips = useCallback(async () => {
    if (!songId) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${songId}/generations`);
      if (res.ok) setSongClips(await res.json());
    } catch { /* silent */ }
  }, [songId]);

  // Fetch section-level clips
  const fetchSectionClips = useCallback(async () => {
    if (!songId || !activeSectionId) { setSectionClips([]); return; }
    try {
      const res = await fetch(`${API_BASE}/api/songs/${songId}/sections/${activeSectionId}/generations`);
      if (res.ok) setSectionClips(await res.json());
    } catch { /* silent */ }
  }, [songId, activeSectionId]);

  useEffect(() => { fetchSongClips(); }, [fetchSongClips]);
  useEffect(() => { fetchSectionClips(); }, [fetchSectionClips]);

  // Refresh clips after generation completes
  useEffect(() => {
    if (!isStreaming && !isProcessing) {
      fetchSectionClips();
      fetchSongClips();
    }
  }, [isStreaming, isProcessing]);

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamingContent, statusMessage]);

  // Scroll chat into view and focus the input
  const activateChat = useCallback(() => {
    requestAnimationFrame(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      textareaRef.current?.focus();
    });
  }, []);

  // Handlers
  const handleSend = (text?: string) => {
    const content = (text || input).trim();
    if (!content || isStreaming) return;
    addUserMessage(content);
    send({
      type: "chat_message",
      conversation_id: activeConversationId,
      content,
      style_profile_id: activeProfileId || "default",
      workflow_context: useWorkflowStore.getState().getWorkflowContext(),
    });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleUpdateSong = async (data: { name: string; key: string | null; scale: string | null; tempo: number | null; style_tags: string[]; reference_artists: string[]; style_world: string | null; overall_feel: string | null; groove_tendency: string | null }) => {
    if (!activeSong) return;
    const res = await fetch(`${API_BASE}/api/songs/${activeSong.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) updateSong(await res.json());
  };

  const handleAddSection = async (data: Record<string, any>) => {
    if (!activeSong) return;
    const res = await fetch(`${API_BASE}/api/songs/${activeSong.id}/sections`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const section = await res.json();
    addSection(section);
    setActiveSection(section.id);
  };

  const handleEditSection = async (data: Record<string, any>) => {
    if (!activeSong || !editingSection) return;
    const res = await fetch(`${API_BASE}/api/songs/${activeSong.id}/sections/${editingSection.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    updateSection(editingSection.id, await res.json());
    setEditingSection(null);
  };

  const confirmDeleteSection = async () => {
    if (!activeSong || !pendingDeleteSectionId) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${activeSong.id}/sections/${pendingDeleteSectionId}`, { method: "DELETE" });
      if (res.ok) removeSection(pendingDeleteSectionId);
    } catch { /* silent */ }
    setPendingDeleteSectionId(null);
  };

  // Count clips per section for the pills
  const clipCountBySection = songClips.reduce<Record<string, number>>((acc, g) => {
    if (g.section_id) acc[g.section_id] = (acc[g.section_id] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading...</div>;
  if (!activeSong) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Song not found</div>;

  return (
    <div className="flex flex-col h-full">
      {/* ── Song Header ── */}
      <div className="px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/songs")} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
            </button>
            {renamingSong ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={renameSongValue}
                  onChange={(e) => setRenameSongValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const name = renameSongValue.trim();
                      if (name) handleUpdateSong({ name, key: activeSong.key, scale: activeSong.scale, tempo: activeSong.tempo, style_tags: activeSong.style_tags || [], reference_artists: activeSong.reference_artists || [], style_world: activeSong.style_world || null, overall_feel: activeSong.overall_feel || null, groove_tendency: activeSong.groove_tendency || null });
                      setRenamingSong(false);
                    }
                    if (e.key === "Escape") setRenamingSong(false);
                  }}
                  className="bg-input border border-border rounded px-2 py-0.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => {
                    const name = renameSongValue.trim();
                    if (name) handleUpdateSong({ name, key: activeSong.key, scale: activeSong.scale, tempo: activeSong.tempo, style_tags: activeSong.style_tags || [], reference_artists: activeSong.reference_artists || [], style_world: activeSong.style_world || null, overall_feel: activeSong.overall_feel || null, groove_tendency: activeSong.groove_tendency || null });
                    setRenamingSong(false);
                  }}
                  className="p-0.5 text-primary hover:text-primary/80"
                ><Check size={14} /></button>
                <button onClick={() => setRenamingSong(false)} className="p-0.5 text-muted-foreground hover:text-foreground"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group/songname">
                <h2 className="text-sm font-semibold text-foreground">{activeSong.name}</h2>
                <button
                  onClick={() => { setRenameSongValue(activeSong.name); setRenamingSong(true); }}
                  className="p-0.5 text-muted-foreground opacity-0 group-hover/songname:opacity-60 hover:!opacity-100 hover:text-primary transition-all"
                  title="Rename song"
                ><Pencil size={11} /></button>
              </div>
            )}
            {activeSong.key && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-medium">
                {activeSong.key}{activeSong.scale ? ` ${activeSong.scale.replace("_", " ")}` : ""}
              </span>
            )}
            {activeSong.tempo && <span className="text-[11px] text-muted-foreground">{activeSong.tempo} BPM</span>}
            {activeSong.style_world && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/15 text-primary font-medium">
                {STYLE_WORLD_LABELS[activeSong.style_world] || activeSong.style_world}
              </span>
            )}
            {activeSong.style_tags?.length > 0 && (
              <div className="flex items-center gap-1">
                {activeSong.style_tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 text-[9px] rounded bg-muted text-muted-foreground">{tag}</span>
                ))}
              </div>
            )}
            {activeSong.reference_artists?.length > 0 && (
              <span className="text-[10px] text-muted-foreground italic">
                Inspired by {activeSong.reference_artists.join(", ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeProfile && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-medium">{activeProfile.name}</span>
            )}
            <button onClick={() => { setIsNewSongSetup(false); setShowSongDialog(true); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors" title="Edit song settings">
              <Settings size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section Tabs ── */}
      <div className="px-6 py-2 border-b border-border shrink-0 bg-muted/20">
        <SectionPills
          sections={sections}
          activeSectionId={activeSectionId}
          onSelect={setActiveSection}
          onAddSection={() => { setEditingSection(null); setShowSectionEditor(true); }}
          clipCounts={clipCountBySection}
        />
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Section detail + clip inventory + chat */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Active section detail bar */}
          {activeSection && (
            <div className="px-6 py-2.5 border-b border-border bg-card/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-medium text-foreground">{activeSection.name}</span>
                  <span className="text-muted-foreground">{activeSection.length_bars} bars</span>
                  {activeSection.chord_progression && activeSection.chord_progression.length > 0 && (
                    <span className="text-primary/80 font-mono text-[11px]">
                      {activeSection.chord_progression.map((c) => `${c.root}${c.quality}`).join(" → ")}
                    </span>
                  )}
                  {activeSection.energy && <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">{activeSection.energy}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {!wizardOpen && (
                    <button
                      onClick={() => setWizardOpen(true)}
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 px-1.5 transition-colors"
                      title="Open generation panel"
                    >
                      <Wand2 size={11} />
                      Generate
                    </button>
                  )}
                  <button onClick={() => { setEditingSection(activeSection); setShowSectionEditor(true); }} className="text-[10px] text-muted-foreground hover:text-primary px-1.5 transition-colors">Edit</button>
                  <button onClick={() => setPendingDeleteSectionId(activeSection.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Delete section"><Trash2 size={11} /></button>
                </div>
              </div>
              {/* Secondary row: feel and identity summary */}
              {(activeSection.feel || (songId && activeSection.id)) && (
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  {activeSection.feel && <span className="italic text-muted-foreground">{activeSection.feel}</span>}
                  {songId && <SectionIdentitySummary songId={songId} sectionId={activeSection.id} />}
                </div>
              )}
            </div>
          )}

          {/* Clip inventory — scrollable with bounded height */}
          <div className="px-6 py-3 shrink-0 max-h-[40vh] overflow-y-auto">
            {activeSection ? (
              <SectionClipList
                clips={sectionClips}
                sectionName={activeSection.name}
                onRefresh={fetchSectionClips}
                activeConversationId={activeConversationId}
                onSelectTrack={(convId) => {
                  setActiveConversation(convId);
                  activateChat();
                }}
                onNewTrack={() => {
                  startNewConversation();
                  activateChat();
                }}
                song={activeSong}
                section={activeSection}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Music2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-medium text-foreground mb-1">Select or create a section</h3>
                <p className="text-xs text-muted-foreground">Add a section using the tabs above to get started.</p>
              </div>
            )}
          </div>

          {/* Chat — pinned with minimum height */}
          {activeSection && (
            <div ref={chatSectionRef} className="flex-1 flex flex-col border-t border-border min-h-[200px]">
              {/* Chat header */}
              <div className="flex items-center gap-2 px-6 py-2 border-b border-border/50 shrink-0 bg-muted/20">
                <MessageSquare size={12} className="text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground truncate">
                  {conversation?.title || "New track"}
                  {messages.length > 0 && ` (${messages.length})`}
                </span>
              </div>

              {/* Chat messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
                {messages.length === 0 && !isStreaming && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {activeConversationId
                      ? "No messages yet."
                      : "Describe what you want below, or use the wizard panel to generate a new track."}
                  </p>
                )}
                {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
                {isStreaming && <StreamingMessage content={streamingContent} />}
                {isProcessing && !isStreaming && statusMessage && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-card border border-border rounded-bl-sm">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">{statusMessage}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div className="px-6 py-2 border-t border-border/50 shrink-0">
                <div className="flex items-end gap-2 bg-input rounded-lg border border-border focus-within:ring-1 focus-within:ring-ring px-3 py-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    placeholder={conversation ? "Continue this conversation..." : `Describe a track for ${activeSection.name}...`}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-[120px]"
                  />
                  {(isStreaming || isProcessing) ? (
                    <button
                      onClick={() => {
                        send({ type: "abort" });
                        useChatStore.getState().setStatus("done", "");
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shrink-0 text-xs font-medium"
                    >
                      <X size={14} />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim()}
                      className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Generation Panel — collapsible */}
        {wizardOpen && (
          <div className="w-[320px] border-l border-border bg-card/30 shrink-0 flex flex-col overflow-hidden">
            {/* Panel collapse toggle */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/50 shrink-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Generate</span>
              <button
                onClick={() => setWizardOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Close generation panel"
              >
                <PanelRightClose size={14} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <GenerationPanel
                section={activeSection || null}
                song={activeSong}
                onGenerate={(prompt) => {
                  startNewConversation();
                  setTimeout(() => handleSend(prompt), 50);
                }}
                disabled={!activeSection || isStreaming || isProcessing || !abletonConnected}
                onExploreComplete={(summary?: ExploreSentSummary) => {
                  fetchSectionClips();
                  fetchSongClips();
                  // Add a summary message to the chat for the Explore generation
                  if (summary && summary.candidates.length > 0) {
                    const lines: string[] = ["**Explore Ideas — sent to Ableton**\n"];
                    if (summary.role) lines.push(`**Role:** ${summary.role}`);
                    lines.push(`**Prompt:** ${summary.prompt}\n`);
                    for (const c of summary.candidates) {
                      lines.push(`- **${c.label}** — ${c.clipName} (${c.noteCount} notes, ${c.clipLengthBars} bars)`);
                      if (c.description) lines.push(`  ${c.description}`);
                      if (c.variationLabel) lines.push(`  _Variation: ${c.variationLabel}_`);
                    }
                    const summaryText = lines.join("\n");
                    // Use the same conversation ID that was saved with the generations
                    useChatStore.getState().onConversationStarted(
                      summary.conversationId,
                      `Explore: ${summary.role || summary.candidates[0]?.clipName || "Ideas"}`,
                    );
                    setTimeout(() => {
                      useChatStore.getState().appendStreamChunk(summaryText, true);
                    }, 50);
                    // Persist summary to DB so it survives page reloads
                    fetch(`${API_BASE}/api/conversations/${summary.conversationId}/messages`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ role: "assistant", content: summaryText }),
                    }).catch(() => { /* best-effort */ });
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <SongSetupDialog
        open={showSongDialog}
        onClose={() => { setShowSongDialog(false); setIsNewSongSetup(false); }}
        onSave={handleUpdateSong}
        initial={{ name: activeSong.name, key: activeSong.key, scale: activeSong.scale, tempo: activeSong.tempo, style_tags: activeSong.style_tags, reference_artists: activeSong.reference_artists, style_world: activeSong.style_world, overall_feel: activeSong.overall_feel, groove_tendency: activeSong.groove_tendency }}
        songId={songId}
        isNewSong={isNewSongSetup}
      />
      <SectionEditor
        open={showSectionEditor}
        onClose={() => { setShowSectionEditor(false); setEditingSection(null); }}
        onSave={editingSection ? handleEditSection : handleAddSection}
        initial={editingSection ? { name: editingSection.name, length_bars: editingSection.length_bars, chord_progression: editingSection.chord_progression, feel: editingSection.feel, energy: editingSection.energy, style_world: editingSection.style_world, mood: editingSection.mood, density_tendency: editingSection.density_tendency, rhythmic_tendency: editingSection.rhythmic_tendency, phrase_behavior: editingSection.phrase_behavior, harmonic_tension: editingSection.harmonic_tension, brightness: editingSection.brightness } : undefined}
        songId={songId}
        sectionId={editingSection?.id}
        songKey={activeSong.key}
        songScale={activeSong.scale}
        songTempo={activeSong.tempo}
      />
      <ConfirmDeleteDialog
        open={!!pendingDeleteSectionId}
        onClose={() => setPendingDeleteSectionId(null)}
        onConfirm={confirmDeleteSection}
        title={`Delete "${sections.find((s) => s.id === pendingDeleteSectionId)?.name || "section"}"?`}
        description="This will permanently delete this section and all associated clips. This action cannot be undone."
      />
    </div>
  );
}
