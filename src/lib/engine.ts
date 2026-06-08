// The shared adaptive engine used by BOTH the human UI and the LLM API. Given a
// session's response history it estimates ability, decides whether to stop, and
// produces the next item or the final result.

import {
  estimateTheta,
  nextTargetB,
  Response,
  thetaToIq,
  thetaToPercentile,
} from "./irt";
import { generateQuestion, Question, QuestionType, typeForIndex } from "./questions";
import { Domain } from "./questions/types";
import { bandFor, domainScore, DOMAIN_LABEL } from "./scoring";

export type Mode = "quick" | "full";

export const MODES: Record<Mode, { label: string; min: number; max: number; seTarget: number; estMin: string }> = {
  quick: { label: "Quick", min: 9, max: 14, seTarget: 0.42, estMin: "4–6 min" },
  full: { label: "Full", min: 16, max: 24, seTarget: 0.33, estMin: "10–14 min" },
};

export type AnsweredItem = {
  index: number;
  type: QuestionType;
  domain: Domain;
  a: number;
  b: number;
  correct: boolean;
  timeMs: number;
};

export type SessionState = {
  masterSeed: number;
  mode: Mode;
  answers: AnsweredItem[];
};

export type Served = {
  index: number;
  type: QuestionType;
  domain: Domain;
  a: number;
  b: number;
  question: Question;
};

function responsesOf(s: SessionState): Response[] {
  return s.answers.map((a) => ({ a: a.a, b: a.b, correct: a.correct }));
}

// What item to serve next given the current state (or null if the test is done).
export function nextItem(s: SessionState): Served | null {
  const cfg = MODES[s.mode];
  const { theta, se } = estimateTheta(responsesOf(s));
  const index = s.answers.length;
  const done = (index >= cfg.min && se <= cfg.seTarget) || index >= cfg.max;
  if (done) return null;
  const targetB = nextTargetB(theta, index);
  const type = typeForIndex(s.masterSeed, index);
  const q = generateQuestion({ masterSeed: s.masterSeed, index, targetB, type });
  return { index, type, domain: q.domain, a: q.a, b: q.b, question: q };
}

export function isDone(s: SessionState): boolean {
  return nextItem(s) === null;
}

export type DomainResult = { domain: Domain; label: string; score: number; correct: number; total: number };

export type Result = {
  iq: number;
  iqLow: number;
  iqHigh: number;
  percentile: number;
  theta: number;
  se: number;
  items: number;
  correct: number;
  avgTimeMs: number;
  speedScore: number; // 0..100
  band: { title: string; emoji: string; blurb: string; hue: number };
  domains: DomainResult[];
};

const clampIq = (x: number) => Math.max(55, Math.min(160, Math.round(x)));

export function computeResult(s: SessionState): Result {
  const resp = responsesOf(s);
  const { theta, se } = estimateTheta(resp);
  const iq = thetaToIq(theta);
  const margin = 1.96 * se * 15; // 95% CI in IQ points
  const percentile = thetaToPercentile(theta);

  const domains: Domain[] = ["abstract", "spatial", "pattern", "logical"];
  const domainResults: DomainResult[] = domains
    .map((d) => {
      const items = s.answers.filter((a) => a.domain === d);
      const correct = items.filter((a) => a.correct).length;
      return { domain: d, label: DOMAIN_LABEL[d], score: domainScore(correct, items.length), correct, total: items.length };
    })
    .filter((d) => d.total > 0);

  const correctCount = s.answers.filter((a) => a.correct).length;
  const times = s.answers.map((a) => a.timeMs).filter((t) => t > 0);
  const avg = times.length ? times.reduce((x, y) => x + y, 0) / times.length : 0;
  // Speed score: faster correct answers score higher. Reference ~ 14s/item.
  const speedScore = Math.max(
    0,
    Math.min(100, Math.round(100 - ((avg - 6000) / 14000) * 50)),
  );

  const band = bandFor(iq);
  return {
    iq: clampIq(iq),
    iqLow: clampIq(iq - margin),
    iqHigh: clampIq(iq + margin),
    percentile: Math.max(0.1, Math.min(99.9, +percentile.toFixed(1))),
    theta: +theta.toFixed(3),
    se: +se.toFixed(3),
    items: s.answers.length,
    correct: correctCount,
    avgTimeMs: Math.round(avg),
    speedScore,
    band: { title: band.title, emoji: band.emoji, blurb: band.blurb, hue: band.hue },
    domains: domainResults,
  };
}
