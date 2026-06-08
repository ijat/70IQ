// Visual analogy generator (abstract reasoning). A : B :: C : ?  — infer the
// transformation that maps A->B and apply it to C. Difficulty scales with the
// number of simultaneous transformations.

import { makeRng } from "../rng";
import { GenArgs, Question, levelToB } from "./types";
import { drawGlyph, Fill, FILLS, Glyph, glyphText, PALETTE, Shape, SHAPES, svgWrap } from "./shapes";

type Tform = "rotate" | "recolor" | "refill" | "count" | "reshape";

function apply(g: Glyph, tforms: Tform[]): Glyph {
  const n: Glyph = { ...g };
  for (const t of tforms) {
    if (t === "rotate") n.rot = (n.rot + 90) % 360;
    else if (t === "recolor") {
      const i = PALETTE.findIndex((p) => p.name === n.color);
      n.color = PALETTE[(i + 2) % PALETTE.length].name;
    } else if (t === "refill") {
      const i = FILLS.indexOf(n.fill);
      n.fill = FILLS[(i + 1) % FILLS.length] as Fill;
    } else if (t === "count") {
      n.count = (n.count % 3) + 1;
    } else if (t === "reshape") {
      const i = SHAPES.indexOf(n.shape);
      n.shape = SHAPES[(i + 1) % SHAPES.length] as Shape;
    }
  }
  return n;
}

export function genAnalogy({ level, seed }: GenArgs): Question {
  const rng = makeRng(seed);
  const nT = Math.max(1, Math.min(3, Math.round(level / 3.5)));
  const tforms = rng.shuffle(["rotate", "recolor", "refill", "count", "reshape"]).slice(0, nT) as Tform[];

  const A: Glyph = {
    shape: rng.pick(SHAPES) as Shape,
    color: rng.pick(PALETTE).name,
    fill: rng.pick(FILLS) as Fill,
    count: rng.int(1, 2),
    rot: 0,
    size: 0.92,
  };
  const B = apply(A, tforms);
  const C: Glyph = {
    shape: rng.pick(SHAPES) as Shape,
    color: rng.pick(PALETTE).name,
    fill: rng.pick(FILLS) as Fill,
    count: rng.int(1, 2),
    rot: 0,
    size: 0.92,
  };
  const D = apply(C, tforms);

  // distractors: apply wrong transform sets to C
  const seen = new Set([glyphText(D)]);
  const dist: Glyph[] = [];
  const wrongSets: Tform[][] = [
    apply(C, tforms.slice(0, Math.max(1, tforms.length - 1))) === C ? [] : tforms.slice(0, Math.max(1, tforms.length - 1)),
    rng.shuffle(["rotate", "recolor", "refill", "count", "reshape"]).slice(0, nT) as Tform[],
    [...tforms, rng.pick(["rotate", "recolor", "refill", "count", "reshape"]) as Tform],
    rng.shuffle(["rotate", "recolor", "refill", "count", "reshape"]).slice(0, Math.max(1, nT)) as Tform[],
  ];
  // also a "applied to A instead of C" distractor (attractive error)
  const candidates: Glyph[] = [...wrongSets.map((s) => apply(C, s)), B, apply(A, tforms)];
  for (const c of candidates) {
    const k = glyphText(c);
    if (!seen.has(k)) {
      seen.add(k);
      dist.push(c);
    }
    if (dist.length >= 5) break;
  }
  while (dist.length < 5) {
    const c = apply(C, rng.shuffle(["rotate", "recolor", "refill", "count", "reshape"]).slice(0, rng.int(1, 3)) as Tform[]);
    const k = glyphText(c);
    if (!seen.has(k)) {
      seen.add(k);
      dist.push(c);
    } else {
      // perturb to avoid infinite loop
      c.color = rng.pick(PALETTE).name;
      if (!seen.has(glyphText(c))) {
        seen.add(glyphText(c));
        dist.push(c);
      }
    }
  }

  const opts = rng.shuffle([D, ...dist.slice(0, 5)]);
  const answerIndex = opts.findIndex((g) => glyphText(g) === glyphText(D));

  const cell = (g: Glyph | null) =>
    `<g><rect width="100" height="100" rx="14" class="cellbg"/>${g ? drawGlyph(g, 100) : `<text x="50" y="68" text-anchor="middle" class="qmark">?</text>`}</g>`;

  const W = 470;
  const inner =
    `<g transform="translate(0,30)">${cell(A)}</g>` +
    `<text x="118" y="86" text-anchor="middle" class="arrow">→</text>` +
    `<g transform="translate(135,30)">${cell(B)}</g>` +
    `<text x="250" y="86" text-anchor="middle" class="arrow">::</text>` +
    `<g transform="translate(270,30)">${cell(C)}</g>` +
    `<text x="388" y="86" text-anchor="middle" class="arrow">→</text>` +
    `<g transform="translate(370,30)">${cell(null)}</g>`;

  return {
    type: "analogy",
    domain: "abstract",
    a: 1.15,
    b: levelToB(level),
    prompt: "A is to B as C is to ?",
    stimulusSvg: svgWrap(inner, W, 160),
    stimulusText:
      `Visual analogy. A → B applies a transformation; apply the same to C.\n` +
      `A = ${glyphText(A)}\nB = ${glyphText(B)}\nC = ${glyphText(C)}\nFind ? (= the same transformation applied to C).`,
    options: opts.map((g) => ({
      svg: svgWrap(`<rect width="100" height="100" rx="14" class="cellbg"/>${drawGlyph(g, 100)}`, 100, 100),
      text: glyphText(g),
    })),
    answerIndex,
  };
}
