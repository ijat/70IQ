"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mode, MODES } from "@/lib/engine";
import { isMuted, setMuted, sfxTap } from "@/lib/sound";

export default function Landing({
  onStart,
  onHistory,
  hasHistory,
}: {
  onStart: (m: Mode) => void;
  onHistory: () => void;
  hasHistory: boolean;
}) {
  const [muted, setMutedState] = useState(false);
  useEffect(() => setMutedState(isMuted()), []);
  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
    if (!m) sfxTap();
  };

  return (
    <div className="wrap center-screen">
      {/* top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
        <strong style={{ letterSpacing: "-0.02em", fontSize: 18 }}>70IQ</strong>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" style={{ padding: "8px 12px" }} onClick={toggleMute} aria-label="Toggle sound">
            {muted ? "🔇" : "🔊"}
          </button>
          {hasHistory && (
            <button className="btn btn-ghost" style={{ padding: "8px 12px" }} onClick={onHistory}>
              History
            </button>
          )}
        </div>
      </div>

      {/* privacy-first line */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="chip"
        style={{ alignSelf: "center", marginTop: 22, background: "var(--cell)", color: "var(--muted)" }}
      >
        🔒 Private by default — everything is scored on your device. We never store or train on your answers.
      </motion.div>

      {/* hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 18, padding: "28px 0" }}>
        <motion.h1
          className="display"
          style={{ fontSize: "clamp(56px, 17vw, 120px)" }}
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          How sharp
          <br />
          are you?
        </motion.h1>
        <motion.p
          className="lede"
          style={{ fontSize: 17, maxWidth: 460, margin: "0 auto" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          A fast, fun, <strong style={{ color: "var(--fg)" }}>culture-fair</strong> IQ test. No vocabulary, no trivia —
          just patterns, shapes and logic. It <strong style={{ color: "var(--fg)" }}>adapts</strong> to you and gives an
          honest estimate.
        </motion.p>
      </div>

      {/* mode cards */}
      <div style={{ display: "grid", gap: 12 }}>
        {(["quick", "full"] as Mode[]).map((m, i) => {
          const cfg = MODES[m];
          return (
            <motion.button
              key={m}
              className="card"
              onClick={() => onStart(m)}
              onPointerEnter={() => sfxTap()}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              whileTap={{ scale: 0.98 }}
              style={{
                textAlign: "left",
                padding: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span style={{ fontSize: 30 }}>{m === "quick" ? "⚡" : "🎯"}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 18 }}>
                  {cfg.label} test {m === "quick" ? "" : ""}
                </span>
                <span className="lede" style={{ fontSize: 13.5 }}>
                  {m === "quick"
                    ? `${cfg.min}–${cfg.max} adaptive questions · ${cfg.estMin}`
                    : `${cfg.min}–${cfg.max} adaptive questions · ${cfg.estMin} · more precise`}
                </span>
              </span>
              <span style={{ fontSize: 22, color: "var(--accent)" }}>→</span>
            </motion.button>
          );
        })}
      </div>

      {/* footer */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 22, flexWrap: "wrap" }}>
        <a className="btn btn-ghost" href="/llms.txt" style={{ fontSize: 13 }}>
          🤖 For AI agents
        </a>
        <a className="btn btn-ghost" href="/about" style={{ fontSize: 13 }}>
          How it works
        </a>
        <a
          className="btn btn-ghost"
          href="https://github.com/ijat/70IQ"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13 }}
        >
          ⭐ Source
        </a>
      </div>
    </div>
  );
}
