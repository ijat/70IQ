// Mental-rotation generator (spatial reasoning). A chiral motif is shown; the
// solver must pick the option that is a pure ROTATION of it (same handedness),
// among reflected distractors.
//
// LLM fairness: options are NOT labelled "rotation/mirror". Instead each figure
// is encoded by the clockwise cyclic order of three named landmarks. A rotation
// preserves that cyclic order; a reflection reverses it. A reasoning model must
// work out which option matches the reference's order — same task as the human.

import { makeRng } from "../rng";
import { GenArgs, Question, levelToB } from "./types";
import { hexFor, PALETTE, svgWrap } from "./shapes";

type Landmark = { name: string; x: number; y: number };

// Chiral motif + its three landmarks inside a 100x100 box.
function motifDef(colA: string, colB: string, variant: number): { svg: string; marks: Landmark[] } {
  const a = hexFor(colA);
  const b = hexFor(colB);
  if (variant === 0) {
    return {
      svg: `<rect x="22" y="18" width="9" height="64" rx="3" fill="${a}"/><polygon points="31,20 74,30 31,48" fill="${b}"/><circle cx="30" cy="84" r="8" fill="${b}"/>`,
      marks: [
        { name: "pole", x: 26, y: 50 },
        { name: "tip", x: 74, y: 30 },
        { name: "dot", x: 30, y: 84 },
      ],
    };
  }
  if (variant === 1) {
    return {
      svg: `<path d="M24,70 L24,40 L54,40 L54,26 L78,50 L54,74 L54,60 L40,60 L40,70 Z" fill="${a}"/><rect x="62" y="16" width="16" height="16" rx="3" fill="${b}"/>`,
      marks: [
        { name: "tip", x: 78, y: 50 },
        { name: "box", x: 70, y: 24 },
        { name: "tail", x: 30, y: 65 },
      ],
    };
  }
  return {
    svg: `<path d="M26,24 H58 V44 H46 V76 H26 Z" fill="${a}"/><circle cx="68" cy="68" r="9" fill="${b}"/><rect x="60" y="22" width="14" height="10" rx="3" fill="${b}"/>`,
    marks: [
      { name: "stem", x: 36, y: 50 },
      { name: "dot", x: 68, y: 68 },
      { name: "tab", x: 67, y: 27 },
    ],
  };
}

function applyTransform(p: Landmark, angleDeg: number, mirror: boolean): Landmark {
  let x = p.x;
  const y = p.y;
  if (mirror) x = 100 - x;
  const t = (angleDeg * Math.PI) / 180;
  const dx = x - 50;
  const dy = y - 50;
  const rx = 50 + dx * Math.cos(t) - dy * Math.sin(t);
  const ry = 50 + dx * Math.sin(t) + dy * Math.cos(t);
  return { name: p.name, x: rx, y: ry };
}

// Clockwise cyclic order of landmarks, normalised to start at marks[0].name.
function clockwiseOrder(marks: Landmark[], startName: string): string {
  const withAng = marks.map((m) => ({ name: m.name, ang: Math.atan2(m.y - 50, m.x - 50) }));
  withAng.sort((p, q) => p.ang - q.ang); // screen-space clockwise
  const names = withAng.map((m) => m.name);
  const i = names.indexOf(startName);
  const rotated = [...names.slice(i), ...names.slice(0, i)];
  return rotated.join(" → ");
}

export function genRotation({ level, seed }: GenArgs): Question {
  const rng = makeRng(seed);
  const variant = rng.int(0, 2);
  const [colA, colB] = rng.shuffle(PALETTE.map((p) => p.name)).slice(0, 2);
  const { svg: inner, marks } = motifDef(colA, colB, variant);
  const startName = marks[0].name;

  const g = (angle: number, mirror: boolean) => {
    const m = mirror ? "translate(100,0) scale(-1,1) " : "";
    return `<g transform="${m}rotate(${angle} 50 50)">${inner}</g>`;
  };

  const refOrder = clockwiseOrder(marks, startName);
  const refSvg = svgWrap(`<rect width="100" height="100" rx="14" class="cellbg"/>${g(0, false)}`, 100, 100);

  const angles = [45, 90, 135, 180, 225, 270, 315];
  const correctAngle = rng.pick(angles);
  const distAngles = rng.shuffle(angles).slice(0, 5);

  type Opt = { svg: string; correct: boolean; order: string; angle: number };
  const correct: Opt = {
    svg: g(correctAngle, false),
    correct: true,
    angle: correctAngle,
    order: clockwiseOrder(marks.map((m) => applyTransform(m, correctAngle, false)), startName),
  };
  const dist: Opt[] = distAngles.map((ang) => ({
    svg: g(ang, true),
    correct: false,
    angle: ang,
    order: clockwiseOrder(marks.map((m) => applyTransform(m, ang, true)), startName),
  }));

  const opts = rng.shuffle([correct, ...dist]);
  const answerIndex = opts.findIndex((o) => o.correct);

  return {
    type: "rotation",
    domain: "spatial",
    a: 1.2,
    b: levelToB(level),
    prompt: "Which figure is the reference simply rotated (not mirrored)?",
    stimulusSvg: refSvg,
    stimulusText:
      `A chiral reference figure has three landmarks (${marks.map((m) => m.name).join(", ")}). ` +
      `Read clockwise starting from "${startName}", the reference order is: ${refOrder}. ` +
      `A pure rotation keeps this clockwise order; a mirror image reverses it. ` +
      `Pick the option whose clockwise landmark order matches the reference.`,
    options: opts.map((o) => ({
      svg: svgWrap(`<rect width="100" height="100" rx="14" class="cellbg"/>${o.svg}`, 100, 100),
      // angle keeps options distinct; the clockwise order is what reveals
      // rotation (matches reference) vs reflection (reversed).
      text: `figure turned ${o.angle}° — clockwise landmark order: ${o.order}`,
    })),
    answerIndex,
  };
}
