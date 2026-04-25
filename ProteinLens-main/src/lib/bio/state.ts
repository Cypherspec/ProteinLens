// Workspace state: history, measurements, mutations stored in localStorage.

export interface HistoryEntry {
  pdbId: string;
  name: string;
  organism?: string;
  loadedAt: number;
}

const HISTORY_KEY = "proteinlens.history.v1";
const MAX_HISTORY = 12;

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function pushHistory(entry: HistoryEntry) {
  if (typeof window === "undefined") return;
  const cur = getHistory().filter((e) => e.pdbId !== entry.pdbId);
  cur.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(cur.slice(0, MAX_HISTORY)));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}
