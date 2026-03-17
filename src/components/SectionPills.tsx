import { Plus } from "lucide-react";
import type { SongSection } from "@/types";

interface SectionPillsProps {
  sections: SongSection[];
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
  onAddSection: () => void;
  clipCounts?: Record<string, number>;
}

export function SectionPills({
  sections,
  activeSectionId,
  onSelect,
  onAddSection,
  clipCounts,
}: SectionPillsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
      {sections.map((section) => {
        const isActive = section.id === activeSectionId;
        return (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            {section.name}
            <span className="opacity-60">{section.length_bars}b</span>
            {clipCounts && clipCounts[section.id] > 0 && (
              <span className={`w-4 h-4 text-[9px] rounded-full flex items-center justify-center ${
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary"
              }`}>
                {clipCounts[section.id]}
              </span>
            )}
          </button>
        );
      })}
      <button
        onClick={onAddSection}
        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary rounded-full border border-dashed border-border hover:border-primary transition-colors whitespace-nowrap"
      >
        <Plus size={10} />
        Section
      </button>
    </div>
  );
}
