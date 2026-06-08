// Persist test results to the browser (localStorage) and read history back.

import type { Result } from "./engine";
import type { Mode } from "./engine";

const KEY = "70iq.history.v1";

export type HistoryEntry = {
  id: string;
  date: number; // epoch ms
  mode: Mode;
  iq: number;
  iqLow: number;
  iqHigh: number;
  percentile: number;
  items: number;
  correct: number;
  bandTitle: string;
  bandEmoji: string;
  domains: { domain: string; label: string; score: number }[];
};

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(arr) ? arr.sort((a, b) => b.date - a.date) : [];
  } catch {
    return [];
  }
}

export function saveResult(mode: Mode, r: Result): HistoryEntry {
  const entry: HistoryEntry = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    date: Date.now(),
    mode,
    iq: r.iq,
    iqLow: r.iqLow,
    iqHigh: r.iqHigh,
    percentile: r.percentile,
    items: r.items,
    correct: r.correct,
    bandTitle: r.band.title,
    bandEmoji: r.band.emoji,
    domains: r.domains.map((d) => ({ domain: d.domain, label: d.label, score: d.score })),
  };
  const hist = loadHistory();
  hist.unshift(entry);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(hist.slice(0, 100)));
  } catch {
    /* quota — ignore */
  }
  return entry;
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
