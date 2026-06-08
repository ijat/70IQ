// 3x3 matrix-reasoning generator following the Carpenter/Just/Shell (1990) rule
// taxonomy: constant-in-a-row, progression, distribution-of-three. Difficulty
// scales with the number of simultaneously varying attributes (rules).

import { makeRng } from "../rng";
import { GenArgs, Question, levelToB } from "./types";
import {
  drawGlyph,
  Fill,
  FILLS,
  Glyph,
  glyphText,
  PALETTE,
  Shape,
  SHAPES,
  svgWrap,
} from "./shapes";

type Attr = "shape" | "color" | "fill" | "count" | "rot";
type Rule = "dist3" | "constantRow" | "progression";

const ROT_SET = [0, 45, 90, 135];

function valueAt(rule: Rule, triple: number[], r: number, c: number, variant: number): number {
  if (rule === "dist3") return triple[(r + (variant ? 2 * c : c)) % 3];
  if (rule === "constantRow") return triple[r];
  return triple[c]; // progression across columns
}

export function genMatrix({ level, seed }: GenArgs): Question {
  const rng = makeRng(seed);
  const activeCount = Math.max(1, Math.min(4, 1 + Math.floor((level - 1) / 2.3)));
  const useDist3Prob = (level - 1) / 9;

  const allAttrs: Attr[] = rng.shuffle(["shape", "color", "fill", "count", "rot"]);
  const active = allAttrs.slice(0, activeCount);

  // Base (constant) values for every attribute.
  const base: Record<Attr, number> = {
    shape: rng.int(0, SHAPES.length - 1),
    color: rng.int(0, PALETTE.length - 1),
    fill: rng.int(0, FILLS.length - 1),
    count: rng.int(0, 2), // index into [1,2,3]
    rot: rng.int(0, ROT_SET.length - 1),
  };

  // Pick a distinct triple of indices for an attribute domain of size n.
  const triple = (n: number) => rng.shuffle([...Array(n).keys()]).slice(0, 3);

  const plan: Partial<Record<Attr, { rule: Rule; triple: number[]; variant: number }>> = {};
  for (const attr of active) {
    const domain =
      attr === "shape"
        ? SHAPES.length
        : attr === "color"
          ? PALETTE.length
          : attr === "fill"
            ? FILLS.length
            : attr === "count"
              ? 3
              : ROT_SET.length;
    let rule: Rule;
    if (attr === "count" || attr === "rot") {
      rule = rng.bool(useDist3Prob) ? "dist3" : rng.bool() ? "progression" : "constantRow";
    } else {
      rule = rng.bool(useDist3Prob) ? "dist3" : "constantRow";
    }
    let trip: number[];
    if (attr === "count") trip = rng.bool() ? [0, 1, 2] : rng.shuffle([0, 1, 2]);
    else if (attr === "rot") trip = [0, 1, 2].map((i) => i % ROT_SET.length);
    else trip = triple(domain);
    plan[attr] = { rule, triple: trip, variant: rng.int(0, 1) };
  }

  const cellGlyph = (r: number, c: number): Glyph => {
    const idx: Record<Attr, number> = { ...base };
    for (const attr of active) {
      const p = plan[attr]!;
      idx[attr] = valueAt(p.rule, p.triple, r, c, p.variant);
    }
    return {
      shape: SHAPES[idx.shape % SHAPES.length] as Shape,
      color: PALETTE[idx.color % PALETTE.length].name,
      fill: FILLS[idx.fill % FILLS.length] as Fill,
      count: [1, 2, 3][idx.count % 3],
      rot: ROT_SET[idx.rot % ROT_SET.length],
      size: 0.92,
    };
  };

  const grid: Glyph[][] = [0, 1, 2].map((r) => [0, 1, 2].map((c) => cellGlyph(r, c)));
  const answer = grid[2][2];

  // ---- distractors ----
  const seen = new Set([glyphText(answer)]);
  const distractors: Glyph[] = [];
  const mutate = (attr: Attr): Glyph => {
    const g: Glyph = { ...answer };
    if (attr === "shape") {
      const s = SHAPES.filter((x) => x !== g.shape);
      g.shape = rng.pick(s) as Shape;
    } else if (attr === "color") {
      const cs = PALETTE.filter((x) => x.name !== g.color);
      g.color = rng.pick(cs).name;
    } else if (attr === "fill") {
      const fs = FILLS.filter((x) => x !== g.fill);
      g.fill = rng.pick(fs) as Fill;
    } else if (attr === "count") {
      g.count = ((g.count % 3) + 1) as number;
      if (g.count === answer.count) g.count = (g.count % 3) + 1;
    } else {
      const rs = ROT_SET.filter((x) => x !== g.rot);
      g.rot = rng.pick(rs);
    }
    return g;
  };

  // Classic Raven distractors: perturb active attributes, plus copies of
  // neighbour cells (a known attractive wrong answer).
  const candidates: Glyph[] = [
    ...rng.shuffle(active).map(mutate),
    grid[2][1],
    grid[1][2],
    mutate(rng.pick(allAttrs)),
    mutate(rng.pick(allAttrs)),
    mutate(rng.pick(allAttrs)),
  ];
  for (const cand of candidates) {
    const key = glyphText(cand);
    if (!seen.has(key)) {
      seen.add(key);
      distractors.push({ ...cand });
    }
    if (distractors.length >= 5) break;
  }
  while (distractors.length < 5) {
    const g = mutate(rng.pick(allAttrs));
    const key = glyphText(g);
    if (!seen.has(key)) {
      seen.add(key);
      distractors.push(g);
    }
  }

  const optGlyphs = rng.shuffle([answer, ...distractors]);
  const answerIndex = optGlyphs.findIndex((g) => glyphText(g) === glyphText(answer));

  // ---- render stimulus ----
  const CELL = 100;
  const GAP = 12;
  const W = CELL * 3 + GAP * 2;
  let inner = "";
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = c * (CELL + GAP);
      const y = r * (CELL + GAP);
      const isQ = r === 2 && c === 2;
      inner += `<g transform="translate(${x},${y})"><rect width="${CELL}" height="${CELL}" rx="14" class="cellbg"/>`;
      if (isQ) {
        inner += `<text x="${CELL / 2}" y="${CELL / 2 + 18}" text-anchor="middle" class="qmark">?</text>`;
      } else {
        inner += drawGlyph(grid[r][c], CELL);
      }
      inner += `</g>`;
    }
  }
  const stimulusSvg = svgWrap(inner, W, W);

  // ---- text encoding for LLMs ----
  const rowsTxt = [0, 1, 2]
    .map(
      (r) =>
        `Row ${r + 1}: ` +
        [0, 1, 2]
          .map((c) => (r === 2 && c === 2 ? "[ ? ]" : glyphText(grid[r][c])))
          .join("  |  "),
    )
    .join("\n");
  const stimulusText = `A 3x3 grid. The bottom-right cell is missing. Find the option that completes the pattern.\n${rowsTxt}`;

  return {
    type: "matrix",
    domain: "abstract",
    a: 1.15,
    b: levelToB(level),
    prompt: "Which option completes the grid?",
    stimulusSvg,
    stimulusText,
    options: optGlyphs.map((g) => ({
      svg: svgWrap(`<rect width="100" height="100" rx="14" class="cellbg"/>${drawGlyph(g, 100)}`, 100, 100),
      text: glyphText(g),
    })),
    answerIndex,
  };
}
