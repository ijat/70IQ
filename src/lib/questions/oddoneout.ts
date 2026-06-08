// Odd-one-out generator (logical reasoning). Five figures share a category
// property; one violates it. Other attributes vary as noise so the
// discriminating property is harder to spot at higher levels.

import { makeRng } from "../rng";
import { GenArgs, Question, levelToB } from "./types";
import { drawGlyph, Fill, FILLS, Glyph, glyphText, PALETTE, Shape, SHAPES, svgWrap } from "./shapes";

const SIDES: Record<Shape, number> = {
  circle: 0,
  triangle: 3,
  square: 4,
  diamond: 4,
  pentagon: 5,
  hexagon: 6,
  star: 10,
  cross: 12,
};

type Category = "shape" | "fill" | "color" | "countParity" | "sidesParity";

export function genOddOneOut({ level, seed }: GenArgs): Question {
  const rng = makeRng(seed);
  const cat: Category =
    level <= 2
      ? "shape"
      : level <= 4
        ? rng.pick(["fill", "color"])
        : level <= 7
          ? rng.pick(["countParity", "fill"])
          : rng.pick(["sidesParity", "countParity"]);

  const rand = (): Glyph => ({
    shape: rng.pick(SHAPES) as Shape,
    color: rng.pick(PALETTE).name,
    fill: rng.pick(FILLS) as Fill,
    count: rng.int(1, 3),
    rot: 0,
    size: 0.92,
  });

  const glyphs: Glyph[] = [];
  let oddIndex = 0;

  if (cat === "shape") {
    const shared = rng.pick(SHAPES) as Shape;
    let odd = rng.pick(SHAPES) as Shape;
    while (odd === shared) odd = rng.pick(SHAPES) as Shape;
    for (let i = 0; i < 6; i++) {
      const g = rand();
      g.shape = shared;
      glyphs.push(g);
    }
    oddIndex = rng.int(0, 5);
    glyphs[oddIndex].shape = odd;
  } else if (cat === "fill") {
    const shared = rng.pick(FILLS) as Fill;
    let odd = rng.pick(FILLS) as Fill;
    while (odd === shared) odd = rng.pick(FILLS) as Fill;
    for (let i = 0; i < 6; i++) {
      const g = rand();
      g.fill = shared;
      glyphs.push(g);
    }
    oddIndex = rng.int(0, 5);
    glyphs[oddIndex].fill = odd;
  } else if (cat === "color") {
    const shared = rng.pick(PALETTE).name;
    let odd = rng.pick(PALETTE).name;
    while (odd === shared) odd = rng.pick(PALETTE).name;
    for (let i = 0; i < 6; i++) {
      const g = rand();
      g.color = shared;
      glyphs.push(g);
    }
    oddIndex = rng.int(0, 5);
    glyphs[oddIndex].color = odd;
  } else if (cat === "countParity") {
    const evenShared = rng.bool();
    for (let i = 0; i < 6; i++) {
      const g = rand();
      g.count = evenShared ? 2 : rng.pick([1, 3]);
      glyphs.push(g);
    }
    oddIndex = rng.int(0, 5);
    glyphs[oddIndex].count = evenShared ? rng.pick([1, 3]) : 2;
  } else {
    // sidesParity: even-sided vs odd-sided shapes (circle excluded)
    const evenShapes = SHAPES.filter((s) => SIDES[s] > 0 && SIDES[s] % 2 === 0);
    const oddShapes = SHAPES.filter((s) => SIDES[s] > 0 && SIDES[s] % 2 === 1);
    const sharedEven = rng.bool();
    const pool = sharedEven ? evenShapes : oddShapes;
    const oddPool = sharedEven ? oddShapes : evenShapes;
    for (let i = 0; i < 6; i++) {
      const g = rand();
      g.shape = rng.pick(pool) as Shape;
      glyphs.push(g);
    }
    oddIndex = rng.int(0, 5);
    glyphs[oddIndex].shape = rng.pick(oddPool) as Shape;
  }

  // Ensure all six figures are visually/textually distinct without disturbing
  // the category property that defines the odd one out.
  const used = new Set<string>();
  const colorAt = (name: string, step: number) => {
    const i = PALETTE.findIndex((p) => p.name === name);
    return PALETTE[(i + step) % PALETTE.length].name;
  };
  for (const g of glyphs) {
    let guard = 0;
    while (used.has(glyphText(g)) && guard++ < 30) {
      if (cat === "color") g.fill = FILLS[(FILLS.indexOf(g.fill) + 1) % FILLS.length] as Fill;
      else g.color = colorAt(g.color, 1);
      if (guard > 12) g.rot = (g.rot + 30) % 360; // last-resort tiebreak
    }
    used.add(glyphText(g));
  }

  const opts = glyphs.map((g) => ({
    svg: svgWrap(`<rect width="100" height="100" rx="14" class="cellbg"/>${drawGlyph(g, 100)}`, 100, 100),
    text: glyphText(g),
  }));

  return {
    type: "oddoneout",
    domain: "logical",
    a: 1.05,
    b: levelToB(level),
    prompt: "Which one does not belong?",
    stimulusSvg: svgWrap(
      `<text x="200" y="30" text-anchor="middle" class="seqlabel">Pick the figure that breaks the pattern</text>`,
      400,
      40,
    ),
    stimulusText:
      "Six figures are shown as options. Five share a hidden property; one breaks it. Pick the odd one out.\n" +
      glyphs.map((g, i) => `(${i + 1}) ${glyphText(g)}`).join("\n"),
    options: opts,
    answerIndex: oddIndex,
  };
}
