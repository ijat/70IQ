// Lightweight Web Audio sound effects — no audio files, all synthesised. Honors
// a persisted mute flag. Must be triggered from a user gesture (browsers gate
// AudioContext until then), which the test flow always is.

let ctx: AudioContext | null = null;
const MUTE_KEY = "70iq.muted";

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(m: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
}

function blip(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.06, delay = 0) {
  const c = ac();
  if (!c || isMuted()) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + delay;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Soft click for selecting an option.
export const sfxClick = () => blip(420, 0.06, "triangle", 0.05);
// Tactile tap for touch/hover.
export const sfxTap = () => blip(640, 0.04, "sine", 0.035);
// "Next" — a rising two-note.
export const sfxNext = () => {
  blip(523, 0.08, "triangle", 0.05, 0);
  blip(784, 0.1, "triangle", 0.05, 0.07);
};
// Result fanfare — a little arpeggio.
export const sfxResult = () => {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.18, "triangle", 0.06, i * 0.1));
};
// Low "gorilla" thud reserved for low scores.
export const sfxThud = () => {
  blip(110, 0.25, "sawtooth", 0.07, 0);
  blip(82, 0.3, "sawtooth", 0.06, 0.08);
};
