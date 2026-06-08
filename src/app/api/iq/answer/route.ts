import { NextRequest, NextResponse } from "next/server";
import { computeResult, MODES, nextItem, SessionState } from "@/lib/engine";
import { verifySession, signSession } from "@/lib/session-token";
import { formatItem, parseAnswer } from "@/lib/api-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Core logic shared by POST (JSON body) and GET (query params). GET is offered
// because many agents/tools can only issue GET requests; the session token is
// URL-safe base64, so it fits directly in ?session=...
function handleAnswer(token: string | null | undefined, answerRaw: string | number | null | undefined) {
  if (!token) return NextResponse.json({ error: "missing `session`" }, { status: 400 });

  const state = verifySession(token);
  if (!state) return NextResponse.json({ error: "invalid or tampered session" }, { status: 400 });

  const pending = nextItem(state);
  if (!pending) {
    return NextResponse.json({ ok: true, done: true, result: computeResult(state) });
  }

  const idx = parseAnswer(answerRaw ?? "", pending.question.options.length);
  if (idx === null) {
    return NextResponse.json(
      { error: `invalid \`answer\`; expected one of ${pending.question.options.map((_, i) => "ABCDEF"[i]).join(", ")}` },
      { status: 400 },
    );
  }

  const correct = idx === pending.question.answerIndex;
  const newState: SessionState = {
    ...state,
    answers: [
      ...state.answers,
      { index: pending.index, type: pending.type, domain: pending.domain, a: pending.a, b: pending.b, correct, timeMs: 0 },
    ],
  };

  const next = nextItem(newState);
  if (!next) {
    return NextResponse.json({
      ok: true,
      done: true,
      lastCorrect: correct,
      answered: newState.answers.length,
      result: computeResult(newState),
    });
  }

  return NextResponse.json({
    ok: true,
    done: false,
    lastCorrect: correct,
    answered: newState.answers.length,
    progress: { answered: newState.answers.length, min: MODES[newState.mode].min, max: MODES[newState.mode].max },
    session: signSession(newState),
    question: formatItem(next, newState.mode),
  });
}

export async function POST(req: NextRequest) {
  let body: { session?: string; answer?: string | number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  return handleAnswer(body.session, body.answer);
}

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return handleAnswer(sp.get("session"), sp.get("answer"));
}
