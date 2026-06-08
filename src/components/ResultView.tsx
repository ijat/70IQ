"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mode, Result } from "@/lib/engine";
import { sfxResult, sfxThud } from "@/lib/sound";

export default function ResultView({
  result,
  mode,
  onRestart,
  onHome,
  onHistory,
}: {
  result: Result;
  mode: Mode;
  onRestart: () => void;
  onHome: () => void;
  onHistory: () => void;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    if (result.iq < 80) sfxThud();
    else sfxResult();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = result.percentile;
  const pctLabel = pct >= 50 ? `Top ${(100 - pct).toFixed(1)}%` : `${pct.toFixed(1)}th percentile`;

  const summary = `🧠 70IQ — I scored ${result.iq} (${result.band.emoji} ${result.band.title})\nEstimated range ${result.iqLow}–${result.iqHigh} · ${pctLabel}\nTake the test: `;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary + location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    const url = location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: "70IQ", text: summary, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    copy();
  };

  const downloadCard = () => {
    drawCard(canvasRef.current, result, pctLabel);
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = `70iq-${result.iq}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="wrap center-screen" style={{ ["--accent-h" as string]: String(result.band.hue) }}>
      <canvas ref={canvasRef} width={1200} height={630} style={{ display: "none" }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 24 }}>
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          style={{ textAlign: "center" }}
        >
          <div className="mascot float" role="img" aria-label={result.band.title}>
            {result.band.emoji}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: show ? 1 : 0, y: show ? 0 : 14 }}
          transition={{ delay: 0.15 }}
          style={{ textAlign: "center", marginTop: 8 }}
        >
          <div className="chip" style={{ marginBottom: 12 }}>
            {result.band.title}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10 }}>
            <span className="display tnum" style={{ fontSize: "clamp(72px, 22vw, 132px)" }}>
              {result.iq}
            </span>
            <span className="display" style={{ fontSize: 22, color: "var(--muted)" }}>
              IQ
            </span>
          </div>
          <p className="lede" style={{ maxWidth: 440, margin: "6px auto 0" }}>
            Estimated range{" "}
            <strong style={{ color: "var(--fg)" }} className="tnum">
              {result.iqLow}–{result.iqHigh}
            </strong>{" "}
            · <strong style={{ color: "var(--fg)" }}>{pctLabel}</strong>
          </p>
          <p className="lede" style={{ maxWidth: 460, margin: "14px auto 0", fontStyle: "italic" }}>
            “{result.band.blurb}”
          </p>
        </motion.div>
      </div>

      {/* cognitive profile */}
      <motion.div
        className="card"
        style={{ padding: 18, marginTop: 18 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Cognitive profile
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {result.domains.map((d, i) => (
            <div key={d.domain}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 600 }}>{d.label}</span>
                <span className="tnum" style={{ color: "var(--muted)" }}>
                  {d.correct}/{d.total}
                </span>
              </div>
              <div className="bar">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${d.score}%` }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
        <hr className="divider" style={{ margin: "16px 0" }} />
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "var(--muted)" }}>
          <Stat label="Items" value={String(result.items)} />
          <Stat label="Correct" value={String(result.correct)} />
          <Stat label="Avg / item" value={`${(result.avgTimeMs / 1000).toFixed(1)}s`} />
          <Stat label="Speed" value={`${result.speedScore}/100`} />
          <Stat label="Mode" value={mode === "quick" ? "Quick" : "Full"} />
        </div>
      </motion.div>

      <p className="lede" style={{ fontSize: 11.5, textAlign: "center", marginTop: 14 }}>
        An estimate from an adaptive culture-fair test — not a clinical assessment. Scored locally on your device.
      </p>

      {/* actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        <button className="btn btn-primary" onClick={share}>
          {copied ? "Copied ✓" : "Share result"}
        </button>
        <button className="btn" onClick={downloadCard}>
          Download card
        </button>
        <button className="btn" onClick={onRestart}>
          Try again
        </button>
        <button className="btn" onClick={onHistory}>
          History
        </button>
      </div>
      <button className="btn btn-ghost" onClick={onHome} style={{ marginTop: 8 }}>
        ← Home
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tnum" style={{ fontWeight: 800, fontSize: 18, color: "var(--fg)" }}>
        {value}
      </div>
      <div style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

// Render a 1200x630 share card to canvas.
function drawCard(canvas: HTMLCanvasElement | null, r: Result, pctLabel: string) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = 1200;
  const H = 630;
  const hue = r.band.hue;
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const bg = dark ? "#0c0c0f" : "#fbfaf8";
  const fg = dark ? "#f4f3ef" : "#17150f";
  const muted = dark ? "#9a99a2" : "#6c6a64";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(160, 80, 0, 160, 80, 700);
  grad.addColorStop(0, `hsla(${hue}, 80%, 55%, 0.22)`);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = muted;
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText("70IQ", 80, 96);

  ctx.font = "120px system-ui, sans-serif";
  ctx.fillText(r.band.emoji, 80, 250);

  ctx.fillStyle = fg;
  ctx.font = "800 220px system-ui, sans-serif";
  ctx.fillText(String(r.iq), 70, 470);
  const w = ctx.measureText(String(r.iq)).width;
  ctx.fillStyle = muted;
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillText("IQ", 90 + w, 470);

  ctx.fillStyle = `hsl(${hue}, 70%, ${dark ? 66 : 48}%)`;
  ctx.font = "800 54px system-ui, sans-serif";
  ctx.fillText(r.band.title, 80, 545);

  ctx.fillStyle = muted;
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(`Range ${r.iqLow}–${r.iqHigh}   ·   ${pctLabel}`, 80, 595);
}
