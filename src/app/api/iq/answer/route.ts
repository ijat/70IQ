import { NextRequest, NextResponse } from "next/server";
import { computeResult, MODES, nextItem, SessionState } from "@/lib/engine";
import { verifySession, signSession } from "@/lib/session-token";
import { formatItem, parseAnswer } from "@/lib/api-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { session?: string; answer?: string | number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const token = body.session;
  if (!token) return NextResponse.json({ error: "missing `session`" }, { status: 400 });

  const state = verifySession(token);
  if (!state) return NextResponse.json({ error: "invalid or tampered session" }, { status: 400 });

  // Re-derive the pending item this answer is for.
  const pending = nextItem(state);
  if (!pending) {
    return NextResponse.json({ ok: true, done: true, result: computeResult(state) });
  }

  const idx = parseAnswer(body.answer ?? "", pending.question.options.length);
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
      {
        index: pending.index,
        type: pending.type,
        domain: pending.domain,
        a: pending.a,
        b: pending.b,
        correct,
        timeMs: 0,
      },
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
