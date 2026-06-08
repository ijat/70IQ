// Number-sequence generator (culture-fair: digits are language-independent).
// Rules scale from simple arithmetic to interleaved / second-order patterns.

import { makeRng } from "../rng";
import { GenArgs, Question, levelToB } from "./types";
import { svgWrap } from "./shapes";

type SeqRule =
  | "arith"
  | "geom"
  | "fib"
  | "interleave"
  | "seconddiff"
  | "square"
  | "altops";

function buildSequence(rng: ReturnType<typeof makeRng>, level: number): { terms: number[]; answer: number; label: string } {
  const pool: SeqRule[] =
    level <= 2
      ? ["arith", "geom"]
      : level <= 4
        ? ["arith", "geom", "fib", "square"]
        : level <= 7
          ? ["geom", "fib", "interleave", "seconddiff", "altops"]
          : ["interleave", "seconddiff", "altops", "fib"];
  const rule = rng.pick(pool);
  const n = 6;
  let terms: number[] = [];
  let label = "";

  if (rule === "arith") {
    const a = rng.int(1, 9);
    const d = rng.int(2, 9) * (rng.bool(0.3) ? -1 : 1);
    terms = Array.from({ length: n }, (_, i) => a + i * d);
    label = "arithmetic";
  } else if (rule === "geom") {
    const a = rng.int(1, 4);
    const r = rng.int(2, 3);
    terms = Array.from({ length: n }, (_, i) => a * r ** i);
    label = "geometric";
  } else if (rule === "fib") {
    let x = rng.int(1, 4);
    let y = rng.int(2, 6);
    terms = [x, y];
    for (let i = 2; i < n; i++) {
      const z = x + y;
      terms.push(z);
      x = y;
      y = z;
    }
    label = "sum of previous two";
  } else if (rule === "square") {
    const off = rng.int(0, 3);
    terms = Array.from({ length: n }, (_, i) => (i + 1 + off) ** 2);
    label = "perfect squares";
  } else if (rule === "interleave") {
    const a0 = rng.int(1, 6);
    const da = rng.int(2, 6);
    const b0 = rng.int(10, 20);
    const db = rng.int(2, 7) * (rng.bool() ? -1 : 1);
    terms = [];
    for (let i = 0; i < 3; i++) {
      terms.push(a0 + i * da);
      terms.push(b0 + i * db);
    }
    label = "two interleaved sequences";
  } else if (rule === "seconddiff") {
    const a = rng.int(1, 5);
    const d0 = rng.int(1, 4);
    const dd = rng.int(1, 3);
    terms = [a];
    let d = d0;
    for (let i = 1; i < n; i++) {
      terms.push(terms[i - 1] + d);
      d += dd;
    }
    label = "increasing differences";
  } else {
    // altops: alternately add and multiply
    const a = rng.int(2, 6);
    const add = rng.int(2, 6);
    const mul = rng.int(2, 3);
    terms = [a];
    for (let i = 1; i < n; i++) {
      terms.push(i % 2 === 1 ? terms[i - 1] + add : terms[i - 1] * mul);
    }
    label = "alternating add / multiply";
  }

  const answer = terms[n - 1];
  return { terms: terms.slice(0, n - 1), answer, label };
}

export function genSequence({ level, seed }: GenArgs): Question {
  const rng = makeRng(seed);
  const { terms, answer } = buildSequence(rng, level);

  // distractors near the answer
  const seen = new Set([answer]);
  const distractors: number[] = [];
  const deltas = rng.shuffle([1, -1, 2, -2, 3, -3, 4, 5, -5, 10]);
  const span = Math.max(2, Math.round(Math.abs(answer) * 0.12));
  for (const d of deltas) {
    const cand = answer + d * (rng.bool() ? 1 : span);
    if (!seen.has(cand) && cand !== answer) {
      seen.add(cand);
      distractors.push(cand);
    }
    if (distractors.length >= 5) break;
  }
  while (distractors.length < 5) {
    const cand = answer + rng.int(-15, 15);
    if (!seen.has(cand)) {
      seen.add(cand);
      distractors.push(cand);
    }
  }

  const opts = rng.shuffle([answer, ...distractors]);
  const answerIndex = opts.indexOf(answer);

  const seqStr = [...terms, "?"];
  const W = 520;
  const H = 120;
  const cellW = W / seqStr.length;
  const inner = seqStr
    .map((t, i) => {
      const x = i * cellW + cellW / 2;
      const cls = t === "?" ? "qmark" : "seqnum";
      return `<rect x="${i * cellW + 5}" y="22" width="${cellW - 10}" height="76" rx="14" class="cellbg"/><text x="${x}" y="72" text-anchor="middle" class="${cls}">${t}</text>`;
    })
    .join("");

  return {
    type: "sequence",
    domain: "pattern",
    a: 1.1,
    b: levelToB(level),
    prompt: "What number comes next?",
    stimulusSvg: svgWrap(inner, W, H),
    stimulusText: `Number sequence: ${terms.join(", ")}, ? — what number comes next?`,
    options: opts.map((o) => ({
      svg: svgWrap(`<rect width="100" height="64" rx="14" class="cellbg"/><text x="50" y="42" text-anchor="middle" class="seqnum">${o}</text>`, 100, 64),
      text: String(o),
    })),
    answerIndex,
  };
}
