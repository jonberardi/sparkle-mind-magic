import { useState, useEffect, useCallback } from "react";
import { Search, BookOpen } from "lucide-react";
import type { Generation, TagCategory } from "@/types";
import { TagPill } from "@/components/TagPill";
import { StarRating } from "@/components/StarRating";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LibraryView() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`${API_URL}/api/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGenerations(Array.isArray(data) ? data : data.items || []);
      }
    } catch {
      // Backend not available
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchLibrary, 300);
    return () => clearTimeout(timer);
  }, [fetchLibrary]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Library</h2>
        <div className="flex items-center gap-2 bg-input rounded-md border border-border px-3 py-1.5 focus-within:ring-1 focus-within:ring-ring">
          <Search size={14} className="text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search generations..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading..." : "No generations yet. Start creating in Chat!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {generations.map((gen) => (
              <div key={gen.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
                <div className="text-sm font-medium text-foreground">{gen.description}</div>
                <div className="text-xs text-muted-foreground font-mono">{gen.output_type}</div>
                {gen.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {gen.tags.map((tag) => (
                      <TagPill key={tag.id} name={tag.name} category={tag.category} />
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <StarRating rating={gen.rating} size={14} />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(gen.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
