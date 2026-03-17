import { useWorkflowStore } from "@/stores/workflowStore";

export function ContextBadges() {
  const { mode, activeSong, sections, activeSectionId, individualSettings } =
    useWorkflowStore();

  const badges: string[] = [];

  if (mode === "song" && activeSong) {
    if (activeSong.key) {
      let label = activeSong.key;
      if (activeSong.scale) label += ` ${activeSong.scale.replace("_", " ")}`;
      badges.push(label);
    }
    const activeSection = sections.find((s) => s.id === activeSectionId);
    if (activeSection) {
      badges.push(activeSection.name);
      badges.push(`${activeSection.length_bars} bars`);
    }
    if (activeSong.tempo) {
      badges.push(`${activeSong.tempo} BPM`);
    }
  } else if (mode === "individual") {
    const s = individualSettings;
    if (s.key) {
      let label = s.key;
      if (s.scale) label += ` ${s.scale.replace("_", " ")}`;
      badges.push(label);
    }
    if (s.tempo) badges.push(`${s.tempo} BPM`);
    if (s.humanize_preset && s.humanize_preset !== "none") {
      badges.push(s.humanize_preset);
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-1 pb-1.5">
      {badges.map((badge, i) => (
        <span
          key={i}
          className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}
