"use client";

import { useEffect, useState } from "react";
import Landing from "@/components/Landing";
import TestRunner from "@/components/TestRunner";
import ResultView from "@/components/ResultView";
import History from "@/components/History";
import { Mode, Result } from "@/lib/engine";
import { newMasterSeed } from "@/lib/questions";
import { loadHistory, saveResult } from "@/lib/storage";

type Screen = "home" | "test" | "result" | "history";

export default function Page() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("quick");
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => setHasHistory(loadHistory().length > 0), [screen]);

  const start = (m: Mode) => {
    setMode(m);
    setSeed(newMasterSeed());
    setResult(null);
    setScreen("test");
  };

  const finish = (r: Result) => {
    saveResult(mode, r);
    setResult(r);
    setScreen("result");
  };

  if (screen === "test") {
    return <TestRunner mode={mode} masterSeed={seed} onFinish={finish} onQuit={() => setScreen("home")} />;
  }
  if (screen === "result" && result) {
    return (
      <ResultView
        result={result}
        mode={mode}
        onRestart={() => start(mode)}
        onHome={() => setScreen("home")}
        onHistory={() => setScreen("history")}
      />
    );
  }
  if (screen === "history") {
    return <History onHome={() => setScreen("home")} onStart={() => start("quick")} />;
  }
  return <Landing onStart={start} onHistory={() => setScreen("history")} hasHistory={hasHistory} />;
}
