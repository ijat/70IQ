export type QuestionType =
  | "matrix"
  | "sequence"
  | "rotation"
  | "oddoneout"
  | "analogy";

// Cognitive dimensions surfaced in the result profile.
export type Domain = "abstract" | "spatial" | "pattern" | "logical";

export type Option = {
  svg: string; // visual rendering for humans
  text: string; // canonical text encoding for LLMs / accessibility
};

export type Question = {
  type: QuestionType;
  domain: Domain;
  a: number; // IRT discrimination
  b: number; // IRT difficulty
  prompt: string; // short instruction
  stimulusSvg: string; // the puzzle figure
  stimulusText: string; // text encoding of the puzzle figure
  options: Option[];
  answerIndex: number;
};

// A level from 1 (easy) to 10 (hard). Generators translate this into the
// number of simultaneous rules / transformations and into IRT b.
export type GenArgs = {
  level: number; // 1..10
  seed: number;
};

// Convert a 1..10 level into an IRT difficulty (b) roughly spanning -2.2..2.6.
export function levelToB(level: number): number {
  return -2.6 + (level - 1) * (5.0 / 9);
}

// Map a target b back to the nearest level for generation.
export function bToLevel(b: number): number {
  const lvl = Math.round((b + 2.6) / (5.0 / 9) + 1);
  return Math.max(1, Math.min(10, lvl));
}
