import { useState, useEffect } from "react";
import { Plus, Settings2 } from "lucide-react";
import type { Preference } from "@/types";
import { TagPill } from "@/components/TagPill";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type TabFilter = "all" | "explicit" | "inferred";

export default function PreferencesView() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [tab, setTab] = useState<TabFilter>("all");

  useEffect(() => {
    fetch(`${API_URL}/api/preferences`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPreferences(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filtered = tab === "all" ? preferences : preferences.filter((p) => p.source === tab);

  const tabs: { value: TabFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "explicit", label: "Explicit" },
    { value: "inferred", label: "Inferred" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Preferences</h2>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <Plus size={14} /> Add Preference
          </button>
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md transition-colors",
                tab === t.value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Settings2 className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No preferences yet. Add rules or let AbleThor learn from your feedback.</p>
          </div>
        ) : (
          filtered.map((pref) => (
            <div key={pref.id} className="bg-card rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-foreground flex-1">{pref.rule}</p>
                <span className={cn(
                  "px-2 py-0.5 text-[10px] rounded-full font-medium shrink-0",
                  pref.source === "explicit" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {pref.source} {pref.source === "inferred" && `${Math.round(pref.confidence * 100)}%`}
                </span>
              </div>
              {pref.scope_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pref.scope_tags.map((tag) => (
                    <TagPill key={tag.id} name={tag.name} category={tag.category} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
