export const FAVORITES_STORAGE_KEY = "model-benchmarks:model-favorites:v1";
const changedEvent = "model-benchmarks:favorites-changed";

export function readModelFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1
      || !Array.isArray((parsed as { identities?: unknown }).identities)) return [];
    return [...new Set((parsed as { identities: unknown[] }).identities.filter((value): value is string => typeof value === "string" && value.length > 0))];
  } catch { return []; }
}

export function writeModelFavorites(identities: string[]): boolean {
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ version: 1, identities: [...new Set(identities)] }));
    window.dispatchEvent(new Event(changedEvent));
    return true;
  } catch { return false; }
}

export function subscribeToModelFavorites(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(changedEvent, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(changedEvent, onChange);
  };
}
