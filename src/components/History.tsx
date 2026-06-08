"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { clearHistory, HistoryEntry, loadHistory } from "@/lib/storage";

export default function History({ onHome, onStart }: { onHome: () => void; onStart: () => void }) {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  useEffect(() => setItems(loadHistory()), []);

  const wipe = () => {
    clearHistory();
    setItems([]);
  };

  const best = items.length ? Math.max(...items.map((i) => i.iq)) : 0;
  const avg = items.length ? Math.round(items.reduce((s, i) => s + i.iq, 0) / items.length) : 0;

  return (
    <div className="wrap center-screen" style={{ justifyContent: "flex-start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginBottom: 18 }}>
        <button className="btn btn-ghost" onClick={onHome} style={{ padding: "8px 12px" }}>
          ← Home
        </button>
        <strong>Your history</strong>
        {items.length > 0 ? (
          <button className="btn btn-ghost" onClick={wipe} style={{ padding: "8px 12px", color: "#e5484d" }}>
            Clear
          </button>
        ) : (
          <span style={{ width: 60 }} />
        )}
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 46, marginBottom: 8 }}>🗒️</div>
          <p className="lede">No results yet. Take a test and your scores will show up here — stored only in this browser.</p>
          <button className="btn btn-primary" onClick={onStart} style={{ marginTop: 16 }}>
            Take a test
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <Stat label="Tests" value={String(items.length)} />
            <Stat label="Best" value={String(best)} />
            <Stat label="Average" value={String(avg)} />
          </div>

          {items.length >= 2 && <Sparkline values={[...items].reverse().map((i) => i.iq)} />}

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {items.map((it, idx) => (
              <motion.div
                key={it.id}
                className="card"
                style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <span style={{ fontSize: 30 }}>{it.bandEmoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    {it.bandTitle} · <span className="tnum">{it.iq}</span>
                  </div>
                  <div className="lede" style={{ fontSize: 12.5 }}>
                    {new Date(it.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                    {it.mode === "quick" ? "Quick" : "Full"} · range {it.iqLow}–{it.iqHigh}
                  </div>
                </div>
                <span className="chip">{it.percentile >= 50 ? `Top ${(100 - it.percentile).toFixed(0)}%` : `${it.percentile.toFixed(0)}th`}</span>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 14, textAlign: "center" }}>
      <div className="tnum" style={{ fontWeight: 800, fontSize: 24 }}>
        {value}
      </div>
      <div className="lede" style={{ fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 680;
  const H = 90;
  const pad = 10;
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Trend
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="var(--accent)" />
        ))}
      </svg>
    </div>
  );
}
