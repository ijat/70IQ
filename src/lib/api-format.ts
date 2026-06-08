import { MODES, Served, SessionState } from "./engine";

export const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

export type ApiQuestion = {
  index: number; // 0-based item number
  number: number; // 1-based, for humans/LLMs
  type: string;
  instruction: string;
  puzzle: string; // text encoding of the stimulus
  options: { key: string; text: string }[];
  note: string;
};

export function formatItem(served: Served, mode: SessionState["mode"]): ApiQuestion {
  const cfg = MODES[mode];
  return {
    index: served.index,
    number: served.index + 1,
    type: served.type,
    instruction: served.question.prompt,
    puzzle: served.question.stimulusText,
    options: served.question.options.map((o, i) => ({ key: OPTION_KEYS[i], text: o.text })),
    note: `Reply with one option key (e.g. "B"). ${cfg.label} test: ${cfg.min}-${cfg.max} adaptive items.`,
  };
}

// Parse an answer given as a letter ("A"), lowercase, or a 1/0-based number.
export function parseAnswer(answer: string | number, optionCount: number): number | null {
  if (typeof answer === "number") {
    if (Number.isInteger(answer)) {
      if (answer >= 1 && answer <= optionCount) return answer - 1; // 1-based (preferred)
      if (answer === 0) return 0; // tolerate 0 as "first"
    }
    return null;
  }
  const s = String(answer).trim().toUpperCase();
  const k = OPTION_KEYS.indexOf(s);
  if (k >= 0 && k < optionCount) return k;
  const n = parseInt(s, 10);
  if (!Number.isNaN(n)) return parseAnswer(n, optionCount);
  return null;
}
