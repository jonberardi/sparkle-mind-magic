import { useState, useEffect } from "react";
import { Palette, Check, Plus } from "lucide-react";
import type { StyleProfile } from "@/types";
import { useProfileStore } from "@/stores/profileStore";
import { TagPill } from "@/components/TagPill";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ProfilesView() {
  const { profiles, activeProfileId, setActiveProfile, setProfiles } = useProfileStore();

  useEffect(() => {
    fetch(`${API_URL}/api/profiles`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setProfiles(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Style Profiles</h2>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <Plus size={14} /> New Profile
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Palette className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No profiles available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              return (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile.id)}
                  className={cn(
                    "bg-card rounded-lg border p-4 text-left space-y-2 transition-colors",
                    isActive ? "border-primary" : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{profile.name}</span>
                    <div className="flex items-center gap-2">
                      {profile.is_curated && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-medium">Curated</span>
                      )}
                      {isActive && <Check size={14} className="text-primary" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{profile.description}</p>
                  <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span className="bg-muted px-1.5 py-0.5 rounded">{profile.params.voicing_style}</span>
                    <span className="bg-muted px-1.5 py-0.5 rounded">{profile.params.chord_extensions}</span>
                    <span className="bg-muted px-1.5 py-0.5 rounded">{profile.params.mood_default}</span>
                    <span className="bg-muted px-1.5 py-0.5 rounded">{profile.params.energy_default}</span>
                  </div>
                  {profile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profile.tags.map((tag) => (
                        <TagPill key={tag.id} name={tag.name} category={tag.category} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
