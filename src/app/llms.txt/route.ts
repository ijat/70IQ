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

1) Start a test
   POST ${origin}/api/iq/start
   Body (JSON): { "mode": "quick" }   // "quick" or "full"
   (GET ${origin}/api/iq/start?mode=quick also works)
   -> { ok, mode, config, session, done:false, question }

2) Answer the current item (repeat until done)
   POST ${origin}/api/iq/answer
   Body (JSON): { "session": "<the session string you last received>", "answer": "B" }
   answer = an option key ("A".."F"), or a 1-based index.
   -> while testing: { ok, done:false, lastCorrect, session, question, progress }
   -> when finished: { ok, done:true, result }

   GET-ONLY agents: every endpoint also works as a GET. The session token is
   URL-safe, so just put it in the query string:
   GET ${origin}/api/iq/answer?session=<session>&answer=B
   (and GET ${origin}/api/iq/start?mode=quick to begin). Same JSON responses.

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

## Minimal example (curl)
  S=$(curl -s -X POST ${origin}/api/iq/start -H 'content-type: application/json' -d '{"mode":"quick"}')
  # parse .session and .question, solve it, then:
  curl -s -X POST ${origin}/api/iq/answer -H 'content-type: application/json' \\
       -d '{"session":"<session>","answer":"B"}'
  # repeat with each returned .session until .done == true

## Fair play
Please solve items by reasoning, not by reverse-engineering the generator.
The token is signed to prevent score tampering. Have fun — and tell us which
model gets the highest honest score.
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
