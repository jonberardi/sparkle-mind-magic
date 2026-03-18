import { useState, useEffect } from "react";
import { Plus, Settings2, Key, Loader2, CheckCircle2, XCircle, AlertTriangle, Trash2, HardDrive, Info } from "lucide-react";
import type { Preference } from "@/types";
import { TagPill } from "@/components/TagPill";
import { EvaluatorTab } from "@/components/EvaluatorTab";
import { cn } from "@/lib/utils";
import {
  getApiKeyStatus,
  saveApiKey,
  clearApiKey,
  testApiKey,
  getRuntimeInfo,
  type ApiKeyStatus,
  type ApiKeyTestResult,
  type RuntimeInfo,
} from "@/lib/settingsApi";

import { API_BASE } from "@/lib/api";

type TabFilter = "all" | "explicit" | "inferred";
type Section = "preferences" | "evaluator" | "settings";

export default function PreferencesView() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [tab, setTab] = useState<TabFilter>("all");
  const [section, setSection] = useState<Section>("preferences");

  useEffect(() => {
    fetch(`${API_BASE}/api/preferences`)
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

  const sections: { value: Section; label: string }[] = [
    { value: "preferences", label: "Preferences" },
    { value: "evaluator", label: "Evaluator" },
    { value: "settings", label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="px-6 pt-4 border-b border-border shrink-0">
        <div className="flex gap-4 mb-0">
          {sections.map((s) => (
            <button
              key={s.value}
              onClick={() => setSection(s.value)}
              className={cn(
                "px-1 pb-2.5 text-sm font-medium border-b-2 transition-colors",
                section === s.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {section === "preferences" && (
        <>
          {/* Preferences header with filter tabs */}
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
        </>
      )}

      {section === "evaluator" && (
        <div className="flex-1 overflow-y-auto p-6">
          <EvaluatorTab />
        </div>
      )}

      {section === "settings" && (
        <div className="flex-1 overflow-y-auto p-6">
          <SettingsPanel />
        </div>
      )}
    </div>
  );
}


// ── Settings Panel (API Key Management) ──

function SettingsPanel() {
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [testResult, setTestResult] = useState<ApiKeyTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial status
  useEffect(() => {
    loadStatus();
    getRuntimeInfo().then(setRuntimeInfo).catch(() => {});
  }, []);

  async function loadStatus() {
    try {
      const s = await getApiKeyStatus();
      setStatus(s);
    } catch {
      setError("Failed to load API key status");
    }
  }

  async function handleSave() {
    if (!keyInput.trim()) return;
    setSaving(true);
    setError(null);
    setTestResult(null);
    try {
      await saveApiKey(keyInput.trim());
      setKeyInput("");
      await loadStatus();
    } catch (e: any) {
      setError(e.message || "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await testApiKey();
      setTestResult(result);
    } catch (e: any) {
      setError(e.message || "Failed to test key");
    } finally {
      setTesting(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    setError(null);
    setTestResult(null);
    try {
      await clearApiKey();
      await loadStatus();
    } catch (e: any) {
      setError(e.message || "Failed to clear key");
    } finally {
      setClearing(false);
    }
  }

  const sourceLabel: Record<string, string> = {
    keyring: "Saved (OS keychain)",
    env: "Environment variable",
    runtime: "Session (not persisted)",
    none: "Not configured",
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Settings</h2>
        <p className="text-xs text-muted-foreground">Manage your Anthropic API key and app configuration.</p>
      </div>

      {/* API Key Card */}
      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Anthropic API Key</h3>
        </div>

        {/* Status */}
        {status && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full shrink-0",
              status.configured ? "bg-success" : "bg-destructive"
            )} />
            <span className="text-xs text-muted-foreground">
              {status.configured ? (
                <>
                  Configured
                  <span className="text-muted-foreground/60 ml-1">
                    ({sourceLabel[status.source] || status.source})
                  </span>
                  {status.hint && (
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground/50">
                      {status.hint}
                    </span>
                  )}
                </>
              ) : (
                "No API key configured — AI features are disabled"
              )}
            </span>
          </div>
        )}

        {/* Input */}
        <div className="space-y-2">
          <input
            type="password"
            placeholder={status?.configured ? "Enter new key to replace..." : "Paste your Anthropic API key (sk-ant-...)"}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            className="w-full px-3 py-2 text-sm rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !keyInput.trim()}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors",
                keyInput.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              Save Key
            </button>

            {status?.configured && (
              <>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {testing ? <Loader2 size={12} className="animate-spin" /> : null}
                  Test Key
                </button>

                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md text-destructive hover:bg-destructive/10 transition-colors ml-auto"
                >
                  {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={cn(
            "flex items-start gap-2 px-3 py-2 rounded-md text-xs",
            testResult.valid
              ? "bg-success/10 text-success border border-success/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          )}>
            {testResult.valid ? (
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            ) : (
              <XCircle size={14} className="shrink-0 mt-0.5" />
            )}
            <span>
              {testResult.valid
                ? `Key is valid (model: ${testResult.model})`
                : testResult.message || "Key validation failed"}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md text-xs bg-warning/10 text-warning border border-warning/20">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Your API key is stored in your operating system's secure keychain and is never sent anywhere except directly to the Anthropic API.
          You can get a key from{" "}
          <span className="font-mono">console.anthropic.com</span>.
        </p>
      </div>

      {/* Runtime Info Card */}
      {runtimeInfo && (
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Runtime Info</h3>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <span className="text-muted-foreground">Environment</span>
            <span className="font-mono text-foreground">{runtimeInfo.environment}</span>

            <span className="text-muted-foreground">Frontend</span>
            <span className="font-mono text-foreground">{runtimeInfo.frontend_serving}</span>

            <span className="text-muted-foreground">Packaged</span>
            <span className="font-mono text-foreground">{runtimeInfo.frozen ? "Yes" : "No"}</span>

            <span className="text-muted-foreground">Data Directory</span>
            <span className="font-mono text-foreground text-[10px] break-all">{runtimeInfo.data_dir}</span>

            <span className="text-muted-foreground">Database</span>
            <span className="font-mono text-foreground text-[10px] break-all">{runtimeInfo.db_path}</span>
          </div>
        </div>
      )}
    </div>
  );
}
