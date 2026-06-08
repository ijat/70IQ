"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  computeResult,
  Mode,
  MODES,
  nextItem,
  Result,
  SessionState,
} from "@/lib/engine";
import { Served } from "@/lib/engine";
import { sfxClick, sfxNext, sfxTap } from "@/lib/sound";
import Svg from "./Svg";

const KEYS = ["A", "B", "C", "D", "E", "F"];

export default function TestRunner({
  mode,
  masterSeed,
  onFinish,
  onQuit,
}: {
  mode: Mode;
  masterSeed: number;
  onFinish: (r: Result) => void;
  onQuit: () => void;
}) {
  const [session, setSession] = useState<SessionState>({ masterSeed, mode, answers: [] });
  const [served, setServed] = useState<Served | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  const cfg = MODES[mode];

  // Pull the next item whenever the session advances.
  useEffect(() => {
    const item = nextItem(session);
    if (!item) {
      onFinish(computeResult(session));
      return;
    }
    setServed(item);
    setSelected(null);
    startRef.current = Date.now();
    setElapsed(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.answers.length]);

  // soft timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [served]);

  const choose = useCallback((i: number) => {
    setSelected(i);
    sfxClick();
  }, []);

  const submit = useCallback(() => {
    if (served == null || selected == null) return;
    sfxNext();
    const correct = selected === served.question.answerIndex;
    const timeMs = Date.now() - startRef.current;
    setSession((s) => ({
      ...s,
      answers: [
        ...s.answers,
        {
          index: served.index,
          type: served.type,
          domain: served.domain,
          a: served.a,
          b: served.b,
          correct,
          timeMs,
        },
      ],
    }));
  }, [served, selected]);

  // keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!served) return;
      const k = e.key.toUpperCase();
      const idx = KEYS.indexOf(k);
      if (idx >= 0 && idx < served.question.options.length) choose(idx);
      if ((e.key === "Enter" || e.key === " ") && selected != null) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [served, selected, choose, submit]);

  const progress = useMemo(() => {
    const n = session.answers.length;
    return Math.min(100, Math.round((n / cfg.min) * 100));
  }, [session.answers.length, cfg.min]);

  if (!served) return null;
  const q = served.question;
  const qNum = session.answers.length + 1;

  return (
    <div className="wrap center-screen" style={{ justifyContent: "flex-start" }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button className="btn btn-ghost" style={{ padding: "8px 10px" }} onClick={onQuit} aria-label="Quit test">
          ✕
        </button>
        <div style={{ flex: 1 }}>
          <div className="progress" aria-hidden>
            <span style={{ width: `${Math.max(8, progress)}%` }} />
          </div>
        </div>
        <span className="tnum" style={{ fontWeight: 700, fontSize: 14 }}>
          {String(elapsed).padStart(2, "0")}s
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={served.index}
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span className="eyebrow">Question {qNum}</span>
            <span className="chip" style={{ textTransform: "capitalize" }}>
              {labelFor(served.type)}
            </span>
          </div>
          <h2 className="display" style={{ fontSize: "clamp(20px, 5vw, 28px)", margin: "2px 0 18px" }}>
            {q.prompt}
          </h2>

          {/* stimulus */}
          <div className="card" style={{ padding: 18, marginBottom: 18, display: "flex", justifyContent: "center" }}>
            <Svg markup={q.stimulusSvg} className="qsvg" />
          </div>

          {/* options */}
          <div className={`opt-grid${q.options.length <= 4 ? " cols-2" : ""}`}>
            {q.options.map((o, i) => (
              <motion.button
                key={i}
                className={`opt${selected === i ? " selected" : ""}`}
                onClick={() => choose(i)}
                onPointerEnter={() => sfxTap()}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.2 }}
                aria-pressed={selected === i}
              >
                <span className="opt-key">{KEYS[i]}</span>
                <Svg markup={o.svg} className="qsvg" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="lede" style={{ fontSize: 13 }}>
          {session.answers.length >= cfg.min ? "Finishing up…" : `Adapting to you · ${cfg.label} mode`}
        </span>
        <button className="btn btn-primary" disabled={selected == null} onClick={submit} style={{ opacity: selected == null ? 0.5 : 1 }}>
          {session.answers.length + 1 >= cfg.max ? "Finish" : "Next"} →
        </button>
      </div>
    </div>
  );
}

function labelFor(t: string): string {
  return (
    {
      matrix: "Matrix",
      sequence: "Sequence",
      rotation: "Rotation",
      oddoneout: "Odd one out",
      analogy: "Analogy",
    }[t] ?? t
  );
}
