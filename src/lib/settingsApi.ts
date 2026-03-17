/**
 * API functions for app-level settings.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
