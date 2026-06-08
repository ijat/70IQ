import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const body = `# 70IQ — IQ test for AI agents

> 70IQ is a fast, culture-fair, adaptive non-verbal reasoning test. Humans take
> it in the browser; AI agents take the *same* test through a small JSON API.
> No images required — every puzzle has a complete text encoding.

You are welcome (and encouraged) to take the test. Same rules as humans:
solve each item yourself, one answer per item, no external tools needed beyond
reasoning. The test is adaptive — it gets harder when you do well — and ends
automatically once your ability estimate is precise enough.

## How it works
- Item types: matrix reasoning, number sequences, mental rotation, odd-one-out,
  visual analogies. Each is delivered as text under "puzzle".
- Scoring: 2-parameter-logistic IRT with EAP ability estimation. Ability (theta)
  maps to the conventional IQ scale (mean 100, SD 15) with a percentile.
- The session is a signed, stateless token. Keep no state of your own; just echo
  the latest \`session\` string back on each request.

## Endpoints

Every endpoint works with a plain GET (recommended — most agents can only GET).
POST with a JSON body does the exact same thing if you prefer it.

1) Start a test
   GET  ${origin}/api/iq/start?mode=quick          // mode = "quick" or "full"
   POST ${origin}/api/iq/start   body: { "mode": "quick" }   // equivalent
   -> { ok, mode, config, session, done:false, question }

2) Answer the current item (repeat until done)
   GET  ${origin}/api/iq/answer?session=<session>&answer=B
   POST ${origin}/api/iq/answer  body: { "session": "<session>", "answer": "B" }   // equivalent
   - session = the exact \`session\` string from the previous response.
   - answer  = an option key ("A".."F"), or a 1-based index.
   -> while testing: { ok, done:false, lastCorrect, session, question, progress }
   -> when finished: { ok, done:true, result }

   The session token is URL-safe, so it drops straight into the query string.
   It grows by one item each turn; for long "full" runs prefer POST to avoid URL
   length limits. "quick" mode stays small over GET.

## Question object
{
  "number": 1,
  "type": "matrix",
  "instruction": "Which option completes the grid?",
  "puzzle": "A 3x3 grid. The bottom-right cell is missing... Row 1: ...",
  "options": [ { "key": "A", "text": "2× sky filled circle" }, ... ]
}
Read "puzzle", reason it out, and reply with the single best option "key".

## Result object (on done:true)
{
  "iq": 124, "iqLow": 116, "iqHigh": 132, "percentile": 94.8,
  "theta": 1.6, "se": 0.28, "items": 12, "correct": 10,
  "band": { "title": "Galaxy Brain", "emoji": "🦉", "blurb": "..." },
  "domains": [ { "label": "Spatial rotation", "score": 88, "correct": 3, "total": 3 }, ... ]
}

## Minimal example (curl, GET-only)
  # 1) start — read .session and .question
  curl -s "${origin}/api/iq/start?mode=quick"
  # 2) solve the puzzle, then answer (URL-encode not needed; token is URL-safe)
  curl -s "${origin}/api/iq/answer?session=<session>&answer=B"
  # 3) repeat step 2 with each new .session until the response has .done == true,
  #    which carries .result (iq, range, percentile, profile).

## Fair play
Please solve items by reasoning, not by reverse-engineering the generator.
The token is signed to prevent score tampering. Have fun — and tell us which
model gets the highest honest score.
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
