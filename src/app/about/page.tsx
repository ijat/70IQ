import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How 70IQ measures fluid reasoning: culture-fair adaptive items scored with 2PL IRT, mapped to an estimated IQ range. Private by design.",
};

export default function About() {
  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      <Link href="/" className="btn btn-ghost" style={{ padding: "8px 12px", marginBottom: 18, display: "inline-block" }}>
        ← Home
      </Link>

      <h1 className="display" style={{ fontSize: "clamp(32px, 9vw, 52px)", marginBottom: 8 }}>
        How it works
      </h1>
      <p className="lede" style={{ fontSize: 17 }}>
        70IQ estimates <strong style={{ color: "var(--fg)" }}>fluid reasoning</strong> — the ability to spot patterns
        and solve novel problems — using the same kind of non-verbal items psychologists consider the most
        culture-fair.
      </p>

      <Section title="Culture-fair by design">
        Every item is visual or numeric: matrix reasoning, number sequences, mental rotation, odd-one-out and visual
        analogies. There is no vocabulary, trivia or cultural knowledge, so language and background matter as little as
        possible. This mirrors the design philosophy of Raven&apos;s Progressive Matrices, the classic measure of fluid
        intelligence.
      </Section>

      <Section title="It adapts to you">
        Questions are chosen on the fly. After each answer the test re-estimates your ability and serves the next item
        right at the edge of your level — the point that reveals the most information. That&apos;s why a short test can
        still be reasonably precise, and why two people rarely see the same questions.
      </Section>

      <Section title="The score is an honest estimate">
        Responses are scored with a 2-parameter logistic{" "}
        <abbr title="Item Response Theory">IRT</abbr> model and an EAP ability estimate. Your ability is mapped to the
        conventional IQ scale (mean 100, standard deviation 15) and a percentile. We show a{" "}
        <strong style={{ color: "var(--fg)" }}>range</strong>, not just a single number, because every test has
        measurement error — the more items you answer, the tighter the range. It is a fun, well-grounded estimate, not a
        clinical or professionally normed assessment.
      </Section>

      <Section title="Private by default">
        The whole test runs and is scored in your browser. Your answers and results are saved only in this browser&apos;s
        local storage so you can see your history — they are never uploaded, sold, or used to train anything. Clear them
        any time from the History screen.
      </Section>

      <Section title="AI agents welcome">
        LLMs can take the identical test through a small JSON API, with every puzzle delivered as text. See{" "}
        <a href="/llms.txt" style={{ color: "var(--accent)" }}>
          /llms.txt
        </a>{" "}
        for the protocol.
      </Section>

      <p className="lede" style={{ fontSize: 12.5, marginTop: 28 }}>
        Method references: Carpenter, Just &amp; Shell (1990), <em>What one intelligence test measures</em>; standard
        computerized-adaptive-testing practice (maximum-information item selection, EAP scoring).
      </p>

      <Link href="/" className="btn btn-primary" style={{ marginTop: 24, display: "inline-block" }}>
        Take the test →
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26 }}>
      <h2 className="display" style={{ fontSize: 22, marginBottom: 8 }}>
        {title}
      </h2>
      <p className="lede">{children}</p>
    </div>
  );
}
