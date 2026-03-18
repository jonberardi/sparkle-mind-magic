/**
 * API functions for app-level settings.
 */

import { API_BASE } from "@/lib/api";

export interface AppSettings {
  auto_save_to_library: boolean;
}

export async function getSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error(`Failed to fetch settings: ${res.statusText}`);
  return res.json();
}

export async function updateSettings(
  updates: Partial<AppSettings>,
): Promise<{ updated: Partial<AppSettings> }> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update settings: ${res.statusText}`);
  return res.json();
}

// ── API Key Management ──

export interface ApiKeyStatus {
  configured: boolean;
  source: "env" | "keyring" | "runtime" | "none";
  hint: string | null;
}

export interface ApiKeyTestResult {
  valid: boolean;
  error?: "no_key" | "invalid_key" | "rate_limit" | "network" | "unknown";
  message?: string;
  model?: string;
}

export interface RuntimeInfo {
  environment: string;
  frontend_serving: string;
  api_key_source: string;
  api_key_configured: boolean;
  frozen: boolean;
  data_dir: string;
  db_path: string;
}

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const res = await fetch(`${API_BASE}/api/settings/api-key/status`);
  if (!res.ok) throw new Error(`Failed to fetch API key status: ${res.statusText}`);
  return res.json();
}

export async function saveApiKey(key: string): Promise<{ saved: boolean; hint: string }> {
  const res = await fetch(`${API_BASE}/api/settings/api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error(`Failed to save API key: ${res.statusText}`);
  return res.json();
}

export async function clearApiKey(): Promise<{ cleared: boolean }> {
  const res = await fetch(`${API_BASE}/api/settings/api-key`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to clear API key: ${res.statusText}`);
  return res.json();
}

export async function testApiKey(): Promise<ApiKeyTestResult> {
  const res = await fetch(`${API_BASE}/api/settings/api-key/test`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to test API key: ${res.statusText}`);
  return res.json();
}

export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  const res = await fetch(`${API_BASE}/api/settings/runtime-info`);
  if (!res.ok) throw new Error(`Failed to fetch runtime info: ${res.statusText}`);
  return res.json();
}
