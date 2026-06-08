import { Domain } from "./questions/types";

export type Band = {
  min: number;
  title: string;
  emoji: string;
  blurb: string;
  hue: number; // accent hue for the result screen
};

// Meme-forward result bands. The whole "70IQ" brand leans into the joke at the
// low end (gorilla) and the flex at the high end (alien). Emoji mascots are
// self-contained; swap in a `gif` URL later if you want animated memes.
export const BANDS: Band[] = [
  { min: -Infinity, title: "Certified Gorilla", emoji: "🦍", hue: 18, blurb: "Ook. Ook ook. Bananas were involved. We won't tell anyone." },
  { min: 80, title: "Moai Mode", emoji: "🗿", hue: 200, blurb: "Stoic. Unbothered. Possibly asleep. Either way, respect." },
  { min: 90, title: "Pleasantly Average", emoji: "😎", hue: 150, blurb: "Right in the fat part of the bell curve, exactly where the snacks are." },
  { min: 105, title: "Big Brain Energy", emoji: "🧠", hue: 265, blurb: "Sharp. You read the question twice and it paid off." },
  { min: 120, title: "Galaxy Brain", emoji: "🦉", hue: 280, blurb: "Patterns fear you. The bell curve sends its regards from way over there." },
  { min: 135, title: "Certified Alien", emoji: "👽", hue: 160, blurb: "Are you even human? Blink twice if the mothership is waiting." },
];

export function bandFor(iq: number): Band {
  let chosen = BANDS[0];
  for (const b of BANDS) if (iq >= b.min) chosen = b;
  return chosen;
}

export const DOMAIN_LABEL: Record<Domain, string> = {
  abstract: "Abstract reasoning",
  spatial: "Spatial rotation",
  pattern: "Pattern & numeric",
  logical: "Logical deduction",
};

// Map a per-domain accuracy (0..1) to a 0..100 sub-score, lightly smoothed so a
// single miss doesn't read as a catastrophe.
export function domainScore(correct: number, total: number): number {
  if (total === 0) return 50;
  const p = (correct + 0.5) / (total + 1); // Laplace smoothing
  return Math.round(p * 100);
}
