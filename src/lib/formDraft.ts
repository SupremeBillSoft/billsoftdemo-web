// src/lib/formDraft.ts

const PREFIX = "billsoft-form-draft:";

export function saveFormDraft(key: string, values: unknown) {
  sessionStorage.setItem(PREFIX + key, JSON.stringify(values));
}
export function loadFormDraft<T>(key: string): T | null {
  const raw = sessionStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
export function clearFormDraft(key: string) {
  sessionStorage.removeItem(PREFIX + key);
}