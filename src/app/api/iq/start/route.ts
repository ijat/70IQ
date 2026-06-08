import { NextRequest, NextResponse } from "next/server";
import { Mode, MODES, nextItem, SessionState } from "@/lib/engine";
import { newMasterSeed } from "@/lib/questions";
import { signSession } from "@/lib/session-token";
import { formatItem } from "@/lib/api-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startSession(modeRaw: string | null) {
  const mode: Mode = modeRaw === "full" ? "full" : "quick";
  const state: SessionState = { masterSeed: newMasterSeed(), mode, answers: [] };
  const served = nextItem(state);
  if (!served) {
    return NextResponse.json({ error: "could not start" }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    mode,
    config: { min: MODES[mode].min, max: MODES[mode].max },
    session: signSession(state),
    done: false,
    question: formatItem(served, mode),
    instructions:
      "Solve the puzzle, then POST to /api/iq/answer with JSON { session, answer }. " +
      "Echo back the exact `session` string you received and put your chosen option key in `answer`.",
  });
}

export async function POST(req: NextRequest) {
  let mode: string | null = null;
  try {
    const body = await req.json();
    mode = body?.mode ?? null;
  } catch {
    /* allow empty body */
  }
  return startSession(mode);
}

export async function GET(req: NextRequest) {
  return startSession(req.nextUrl.searchParams.get("mode"));
}
