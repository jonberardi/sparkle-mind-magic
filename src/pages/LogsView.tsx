import { useState, useEffect, useRef, useCallback } from "react";
import { Search, RefreshCw, Trash2, ArrowDown, Pause, Play, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

const SOURCE_FILTERS = [
  { value: "agent.loop", label: "Agent" },
  { value: "agent.executor", label: "Tools" },
  { value: "music_engine.candidates", label: "Candidates" },
  { value: "evaluator", label: "Evaluator" },
  { value: "music_engine.resolved_context", label: "Context" },
  { value: "osc_bridge", label: "OSC" },
] as const;

const LEVEL_FILTERS = ["ALL", "INFO", "WARNING", "ERROR"] as const;

type LevelFilter = (typeof LEVEL_FILTERS)[number];

export default function LogsView() {
  const [lines, setLines] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ lines: "500" });
      if (sourceFilter.length > 0) params.set("filter", sourceFilter.join(","));
      if (levelFilter !== "ALL") params.set("level", levelFilter);
      if (search) params.set("search", search);

      const res = await fetch(`${API_BASE}/api/dev/logs?${params}`);
      const data = await res.json();
      setLines(data.lines || []);
    } catch {
      // silently fail — backend may be restarting
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, levelFilter, search]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 2000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLogs, autoRefresh]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const getLineClass = (line: string) => {
    if (line.includes(" ERROR ") || line.includes(" CRITICAL ")) return "text-red-400";
    if (line.includes(" WARNING ")) return "text-yellow-400";
    if (line.includes("elapsed=")) return "text-blue-400";
    if (line.includes("verdict=")) return "text-emerald-400";
    if (line.includes("overall=")) return "text-emerald-400";
    return "text-muted-foreground";
  };

  const highlightSearch = (line: string) => {
    if (!search) return line;
    const idx = line.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return line;
    return (
      <>
        {line.slice(0, idx)}
        <mark className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{line.slice(idx, idx + search.length)}</mark>
        {line.slice(idx + search.length)}
      </>
    );
  };

  const toggleSource = (value: string) => {
    setSourceFilter((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-4 pb-3 border-b border-border shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Pipeline Logs</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{lines.length} lines</span>
            {loading && <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Level filter */}
          <div className="flex rounded-md border border-border overflow-hidden">
            {LEVEL_FILTERS.map((lv) => (
              <button
                key={lv}
                onClick={() => setLevelFilter(lv)}
                className={cn(
                  "px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  levelFilter === lv
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {lv}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md border transition-colors",
              autoRefresh
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
            title={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
          >
            {autoRefresh ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {autoRefresh ? "Live" : "Paused"}
          </button>

          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-3 h-3" />
          </button>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Source filter chips */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-muted-foreground shrink-0" />
          {SOURCE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleSource(value)}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded-full border transition-colors",
                sourceFilter.includes(value)
                  ? "border-primary/40 text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/20"
              )}
            >
              {label}
            </button>
          ))}
          {sourceFilter.length > 0 && (
            <button
              onClick={() => setSourceFilter([])}
              className="px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-black/30"
        onScroll={() => {
          if (!scrollRef.current) return;
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
          setAutoScroll(isAtBottom);
        }}
      >
        <pre className="p-4 text-[11px] leading-[1.6] font-mono">
          {lines.length > 0 ? (
            lines.map((line, i) => (
              <div key={i} className={cn("hover:bg-white/5 px-1 -mx-1 rounded", getLineClass(line))}>
                {highlightSearch(line)}
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">No logs matching filters</span>
          )}
        </pre>
      </div>
    </div>
  );
}
