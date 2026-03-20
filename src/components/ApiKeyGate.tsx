import { useState, useEffect } from "react";
import { Key, Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { getApiKeyStatus, saveApiKey, testApiKey } from "@/lib/settingsApi";
import { cn } from "@/lib/utils";

interface ApiKeyGateProps {
  children: React.ReactNode;
}

export function ApiKeyGate({ children }: ApiKeyGateProps) {
  const [checking, setChecking] = useState(true);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    getApiKeyStatus()
      .then((s) => setHasKey(s.configured))
      .catch(() => setHasKey(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasKey) {
    return <ApiKeySetup onComplete={() => setHasKey(true)} />;
  }

  return <>{children}</>;
}

function ApiKeySetup({ onComplete }: { onComplete: () => void }) {
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState(false);

  async function handleSaveAndTest() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    setValid(false);

    try {
      const saveResult = await saveApiKey(trimmed);
      if (!saveResult.saved) {
        setError("Failed to save the API key. Please try again.");
        setSaving(false);
        return;
      }

      // Now test it
      setTesting(true);
      setSaving(false);
      const testResult = await testApiKey();

      if (testResult.valid) {
        setValid(true);
        // Brief pause so the user sees the success state
        setTimeout(() => onComplete(), 800);
      } else {
        setError(
          testResult.message ||
            "The API key was saved but failed validation. Please check that it's correct."
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
      setTesting(false);
    }
  }

  const busy = saving || testing;

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-full max-w-md mx-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Key size={24} className="text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Welcome to AbleThor</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AbleThor uses the Anthropic API to generate music. To get started,
            enter your API key below.
          </p>
        </div>

        {/* Key input card */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-foreground">Anthropic API Key</span>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setError(null);
                setValid(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveAndTest();
              }}
              autoFocus
              className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </label>

          <button
            onClick={handleSaveAndTest}
            disabled={busy || !keyInput.trim() || valid}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
              valid
                ? "bg-success text-success-foreground"
                : keyInput.trim() && !busy
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {testing && <Loader2 size={14} className="animate-spin" />}
            {valid && <CheckCircle2 size={14} />}
            {saving
              ? "Saving..."
              : testing
                ? "Validating..."
                : valid
                  ? "Key verified"
                  : "Save & Verify Key"}
          </button>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md text-xs bg-destructive/10 text-destructive border border-destructive/20">
              <XCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Link to Anthropic console */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Don't have an API key?
          </p>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Get one from console.anthropic.com
            <ExternalLink size={11} />
          </a>
          <p className="text-[10px] text-muted-foreground/60 mt-2 leading-relaxed">
            Your key is stored securely in your operating system's keychain
            and is only sent directly to the Anthropic API.
          </p>
        </div>
      </div>
    </div>
  );
}
