/**
 * SectionIdentitySummary — compact human-readable musical identity for a section.
 *
 * Fetches the resolved context for the section and displays the identity summary
 * (e.g. "medium energy · syncopated · moderate density · soulful feel").
 */

import { useState, useEffect } from "react";
import type { ResolvedContextResponse } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface SectionIdentitySummaryProps {
  songId: string;
  sectionId: string;
  role?: string;
  className?: string;
}

export function SectionIdentitySummary({
  songId,
  sectionId,
  role,
  className = "",
}: SectionIdentitySummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      try {
        const body: Record<string, string | undefined> = {
          section_id: sectionId,
        };
        if (role) body.role = role;

        const res = await fetch(`${API_BASE}/api/songs/${songId}/resolved-context`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return;
        const data: ResolvedContextResponse = await res.json();
        if (!cancelled) setSummary(data.identity_summary);
      } catch {
        // silent — non-critical UI element
      }
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [songId, sectionId, role]);

  if (!summary || summary === "default") return null;

  return (
    <span className={`text-[10px] text-muted-foreground/70 italic ${className}`}>
      {summary}
    </span>
  );
}
