// 2-parameter logistic IRT with an EAP (Expected A Posteriori) ability
// estimator over a fixed theta grid, plus theta -> IQ mapping.
//
// References (see /llms.txt + README): Carpenter, Just & Shell (1990) for the
// matrix rule taxonomy that drives item difficulty; standard CAT practice of
// maximum-Fisher-information item selection and EAP scoring with a N(0,1) prior.

export const D = 1.702; // logistic-to-normal scaling constant

// Probability of a correct response under 2PL.
export function p2pl(theta: number, a: number, b: number): number {
  return 1 / (1 + Math.exp(-D * a * (theta - b)));
}

// Fisher information of a 2PL item at a given ability.
export function info2pl(theta: number, a: number, b: number): number {
  const p = p2pl(theta, a, b);
  return D * D * a * a * p * (1 - p);
}

// Theta grid for numerical EAP.
const GRID_MIN = -4;
const GRID_MAX = 4;
const GRID_STEP = 0.05;
const GRID: number[] = [];
for (let t = GRID_MIN; t <= GRID_MAX + 1e-9; t += GRID_STEP) GRID.push(+t.toFixed(4));

// Standard normal pdf (prior).
function normPdf(x: number, mu = 0, sd = 1): number {
  const z = (x - mu) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

export type Response = { a: number; b: number; correct: boolean };

// EAP estimate of theta and its posterior SD given a response vector.
export function estimateTheta(responses: Response[]): { theta: number; se: number } {
  if (responses.length === 0) return { theta: 0, se: 1 };
  let sumW = 0;
  let sumWX = 0;
  let sumWX2 = 0;
  for (const t of GRID) {
    let like = normPdf(t); // prior
    for (const r of responses) {
      const p = p2pl(t, r.a, r.b);
      like *= r.correct ? p : 1 - p;
    }
    sumW += like;
    sumWX += like * t;
    sumWX2 += like * t * t;
  }
  if (sumW === 0) return { theta: 0, se: 1 };
  const mean = sumWX / sumW;
  const variance = Math.max(0, sumWX2 / sumW - mean * mean);
  return { theta: mean, se: Math.sqrt(variance) };
}

// Map ability to the conventional IQ scale (mean 100, SD 15).
export function thetaToIq(theta: number): number {
  return 100 + 15 * theta;
}

// Normal CDF -> percentile (0..100).
export function thetaToPercentile(theta: number): number {
  // Abramowitz & Stegun 7.1.26 approximation of erf.
  const z = theta / Math.SQRT2;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  const cdf = 0.5 * (1 + sign * y);
  return cdf * 100;
}

// Pick the difficulty b that is most informative right now: for 2PL with the
// item placed at the current ability estimate, info is maximized at b = theta.
// We nudge slightly so early items aren't all dead-center.
export function nextTargetB(theta: number, itemIndex: number): number {
  const jitter = itemIndex < 2 ? (itemIndex === 0 ? -0.3 : 0.3) : 0;
  return Math.max(-3, Math.min(3, theta + jitter));
}
