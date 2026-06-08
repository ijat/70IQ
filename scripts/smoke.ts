/* Logic smoke test — runs without Next/SWC. Validates generators, the stateless
   determinism the LLM API relies on, IRT convergence, and token round-trips.
   Run with: npx tsx scripts/smoke.ts */
import assert from "assert";
import { ALL_TYPES, generateQuestion, newMasterSeed, typeForIndex } from "../src/lib/questions";
import { bToLevel, levelToB } from "../src/lib/questions/types";
import { p2pl, thetaToIq, thetaToPercentile } from "../src/lib/irt";
import { computeResult, nextItem, SessionState, MODES } from "../src/lib/engine";
import { signSession, verifySession } from "../src/lib/session-token";
import { parseAnswer } from "../src/lib/api-format";

let pass = 0;
const ok = (name: string) => {
  pass++;
  console.log("  ✓", name);
};

// 1) Every generator, across difficulties, yields exactly 6 options and a valid answer.
for (const type of ALL_TYPES) {
  for (let level = 1; level <= 10; level++) {
    for (let s = 0; s < 40; s++) {
      const q = generateQuestion({ masterSeed: 12345 + s, index: level, targetB: levelToB(level), type });
      assert(q.options.length === 6, `${type} L${level}: expected 6 options, got ${q.options.length}`);
      assert(
        q.answerIndex >= 0 && q.answerIndex < q.options.length,
        `${type} L${level}: answerIndex ${q.answerIndex} out of range`,
      );
      // options must be distinct (by text) so there's a single correct answer
      const texts = new Set(q.options.map((o) => o.text));
      assert(texts.size === q.options.length, `${type} L${level} seed${s}: duplicate options -> ambiguous answer`);
      assert(q.stimulusText.length > 0 && q.prompt.length > 0, `${type}: empty text`);
    }
  }
}
ok("all generators: 6 distinct options + valid, unambiguous answer (2000 items)");

// 2) Determinism: same inputs -> identical item (this is what makes the stateless API work).
for (let i = 0; i < 200; i++) {
  const seed = newMasterSeed();
  const idx = i % 7;
  const b = (Math.random() * 4 - 2);
  const t = typeForIndex(seed, idx);
  const q1 = generateQuestion({ masterSeed: seed, index: idx, targetB: b, type: t });
  const q2 = generateQuestion({ masterSeed: seed, index: idx, targetB: b, type: t });
  // The stateless API re-derives items to score them; what must be stable is
  // the puzzle text, the option texts, and the correct index (SVG pattern-ids
  // are cosmetic and never cross the API/SSR boundary).
  const sig = (q: typeof q1) =>
    JSON.stringify([q.stimulusText, q.options.map((o) => o.text), q.answerIndex, q.a, q.b, q.domain]);
  assert(sig(q1) === sig(q2), "non-deterministic generation (protocol fields)");
}
ok("generation is deterministic for (seed,index,b,type)");

// 3) levelToB/bToLevel round-trip stays in range.
for (let l = 1; l <= 10; l++) assert(bToLevel(levelToB(l)) === l, `level roundtrip ${l}`);
ok("level <-> b mapping round-trips");

// 4) IRT: a high-ability simulant scores high; low-ability scores low.
function simulate(trueTheta: number, mode: "quick" | "full") {
  const state: SessionState = { masterSeed: newMasterSeed(), mode, answers: [] };
  let served = nextItem(state);
  let guard = 0;
  while (served && guard++ < 60) {
    const p = p2pl(trueTheta, served.a, served.b);
    const correct = Math.random() < p;
    state.answers.push({
      index: served.index,
      type: served.type,
      domain: served.domain,
      a: served.a,
      b: served.b,
      correct,
      timeMs: 8000,
    });
    served = nextItem(state);
  }
  return computeResult(state);
}

// average over runs to beat noise
const avg = (theta: number, mode: "quick" | "full", n = 30) => {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += simulate(theta, mode).iq;
  return sum / n;
};
const low = avg(-2, "quick");
const mid = avg(0, "quick");
const high = avg(2, "full");
assert(low < mid && mid < high, `IQ ordering failed: ${low} ${mid} ${high}`);
assert(Math.abs(mid - 100) < 10, `mid IQ should be ~100, got ${mid}`);
assert(high > 120, `high-ability IQ should exceed 120, got ${high}`);
assert(low < 85, `low-ability IQ should be under 85, got ${low}`);
ok(`IRT recovers ability (θ=-2→IQ${low.toFixed(0)}, θ=0→IQ${mid.toFixed(0)}, θ=2→IQ${high.toFixed(0)})`);

// 5) theta->IQ and percentile sanity.
assert(Math.round(thetaToIq(0)) === 100 && Math.round(thetaToIq(1)) === 115, "theta->IQ");
assert(Math.abs(thetaToPercentile(0) - 50) < 0.5, "percentile @0 ~ 50");
assert(thetaToPercentile(2) > 97 && thetaToPercentile(-2) < 3, "percentile tails");
ok("theta->IQ and percentile mapping correct");

// 6) Stop rule respects mode bounds.
for (const mode of ["quick", "full"] as const) {
  for (let i = 0; i < 20; i++) {
    const r = simulate(Math.random() * 4 - 2, mode);
    assert(r.items >= MODES[mode].min && r.items <= MODES[mode].max, `${mode} item count ${r.items} out of bounds`);
  }
}
ok("adaptive stop rule respects min/max per mode");

// 7) Session token signs, verifies, and rejects tampering.
const st: SessionState = { masterSeed: 42, mode: "quick", answers: [] };
const tok = signSession(st);
assert(verifySession(tok)?.masterSeed === 42, "verify failed");
assert(verifySession(tok.slice(0, -2) + "xx") === null, "tamper not rejected");
assert(verifySession("garbage") === null, "garbage not rejected");
ok("session tokens sign / verify / reject tampering");

// 8) Answer parsing accepts letters and indices.
assert(parseAnswer("B", 6) === 1 && parseAnswer("b", 6) === 1, "letter parse");
assert(parseAnswer(1, 6) === 0 && parseAnswer(2, 6) === 1 && parseAnswer(6, 6) === 5, "number parse (1-based)");
assert(parseAnswer("3", 6) === 2, "numeric string parse");
assert(parseAnswer("Z", 6) === null && parseAnswer(9, 6) === null, "invalid rejected");
ok("answer parsing handles letters + indices");

// 9) Full end-to-end via the engine, mimicking the API loop.
{
  const state: SessionState = { masterSeed: newMasterSeed(), mode: "quick", answers: [] };
  let served = nextItem(state);
  let count = 0;
  while (served) {
    // always pick the correct option (perfect solver)
    state.answers.push({
      index: served.index,
      type: served.type,
      domain: served.domain,
      a: served.a,
      b: served.b,
      correct: true,
      timeMs: 5000,
    });
    served = nextItem(state);
    count++;
  }
  const r = computeResult(state);
  assert(r.iq >= 130, `perfect solver should top out high, got ${r.iq}`);
  assert(r.domains.length >= 1 && r.domains.every((d) => d.total > 0), "domains populated");
  ok(`end-to-end perfect run: ${count} items -> IQ ${r.iq} (${r.band.title})`);
}

console.log(`\nAll ${pass} smoke checks passed ✅`);
