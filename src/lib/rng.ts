// Deterministic, seedable PRNG so questions are reproducible (needed for the
// stateless LLM protocol) while still feeling random for humans.

export type RNG = {
  next: () => number; // [0,1)
  int: (min: number, max: number) => number; // inclusive
  pick: <T>(arr: readonly T[]) => T;
  shuffle: <T>(arr: T[]) => T[];
  bool: (p?: number) => boolean;
};

// mulberry32
export function makeRng(seed: number): RNG {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)];
  const shuffle = <T,>(arr: T[]) => {
    const a2 = arr.slice();
    for (let i = a2.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a2[i], a2[j]] = [a2[j], a2[i]];
    }
    return a2;
  };
  const bool = (p = 0.5) => next() < p;
  return { next, int, pick, shuffle, bool };
}

// Hash a string into a 32-bit seed.
export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
