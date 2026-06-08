import { hashSeed, makeRng } from "../rng";
import { genMatrix } from "./matrix";
import { genSequence } from "./sequence";
import { genRotation } from "./rotation";
import { genOddOneOut } from "./oddoneout";
import { genAnalogy } from "./analogy";
import { bToLevel, GenArgs, Question, QuestionType } from "./types";

export * from "./types";

const GENERATORS: Record<QuestionType, (a: GenArgs) => Question> = {
  matrix: genMatrix,
  sequence: genSequence,
  rotation: genRotation,
  oddoneout: genOddOneOut,
  analogy: genAnalogy,
};

export const ALL_TYPES: QuestionType[] = ["matrix", "sequence", "rotation", "oddoneout", "analogy"];

// Deterministic per-session ordering of types so every cognitive domain is
// sampled roughly evenly across the test.
export function typeOrder(masterSeed: number): QuestionType[] {
  const rng = makeRng(masterSeed ^ 0x9e3779b9);
  return rng.shuffle(ALL_TYPES);
}

export function typeForIndex(masterSeed: number, index: number): QuestionType {
  const order = typeOrder(masterSeed);
  return order[index % order.length];
}

// Generate a question deterministically from session seed + item index +
// target difficulty (b). Same inputs always yield the same item — this is what
// makes the stateless LLM protocol reproducible.
export function generateQuestion(args: {
  masterSeed: number;
  index: number;
  targetB: number;
  type?: QuestionType;
}): Question {
  const { masterSeed, index, targetB } = args;
  const type = args.type ?? typeForIndex(masterSeed, index);
  const level = bToLevel(targetB);
  const seed = hashSeed(`${masterSeed}:${index}:${type}:${level}`);
  const q = GENERATORS[type]({ level, seed });
  // override b with the precise target so the IRT bookkeeping is exact
  return { ...q, b: targetB };
}

export function newMasterSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}
