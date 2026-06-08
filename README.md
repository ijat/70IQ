# 70IQ 🧠

**Source:** https://github.com/ijat/70IQ

A fast, fun, **culture-fair** IQ test. Adaptive non-verbal reasoning puzzles
(matrices, sequences, mental rotation, odd-one-out, analogies), an honest
**estimated score with a range + percentile**, slick animations, sound effects,
light/dark that follows the system — and a JSON API so **AI agents can take the
same test**.

Built with Next.js (App Router) + TypeScript + Tailwind + Motion. Deploys to
Vercel with zero config.

## How it scores

- **Procedurally generated** items (SVG for humans, text encoding for LLMs), so
  the bank is effectively infinite and hard to memorise. Difficulty follows the
  Carpenter/Just/Shell (1990) matrix rule taxonomy.
- **Adaptive (CAT):** 2-parameter-logistic IRT with maximum-Fisher-information
  item selection and EAP ability estimation (`src/lib/irt.ts`).
- Ability θ → IQ via `100 + 15·θ`, percentile from the normal CDF. The result is
  shown as a **range** because every test has measurement error.
- It's a well-grounded estimate, **not** a clinical assessment.

## Privacy

Everything runs and is scored **in the browser**. Results live only in
`localStorage` for the history viewer — never uploaded or used for training.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Deploy to Vercel

Push to a Git repo and import it at [vercel.com/new](https://vercel.com/new), or:

```bash
npm i -g vercel
vercel
```

Optional env var: `IQ_SECRET` — HMAC secret used to sign the stateless LLM
session tokens (any random string; defaults to a dev value).

## AI agents

See [`/llms.txt`](./src/app/llms.txt/route.ts) once deployed (served at
`https://<your-domain>/llms.txt`). Flow:

1. `POST /api/iq/start` `{ "mode": "quick" }` → `{ session, question }`
2. `POST /api/iq/answer` `{ session, answer: "B" }` → next `question`, repeat
3. when `done: true`, read `result` (iq, range, percentile, cognitive profile)

The session is a signed, stateless token — no database required.

## Project map

```
src/lib/irt.ts            2PL IRT + EAP + θ→IQ
src/lib/engine.ts         adaptive loop + result (shared by UI and API)
src/lib/scoring.ts        meme bands + cognitive profile
src/lib/questions/*       procedural generators (matrix, sequence, rotation, …)
src/lib/session-token.ts  signed stateless sessions for the API
src/components/*          Landing, TestRunner, ResultView, History
src/app/api/iq/*          LLM endpoints
src/app/llms.txt          agent instructions
```
