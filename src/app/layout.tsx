import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE = "70IQ";
const DESC =
  "A fast, fun, culture-fair IQ test. Adaptive matrix-reasoning puzzles, an honest estimated score with percentile, slick animations — and an API so AI agents can take it too.";

export const metadata: Metadata = {
  title: { default: `${SITE} — Fun, fast IQ test`, template: `%s · ${SITE}` },
  description: DESC,
  applicationName: SITE,
  openGraph: { title: `${SITE} — Fun, fast IQ test`, description: DESC, type: "website" },
  twitter: { card: "summary_large_image", title: `${SITE} — Fun, fast IQ test`, description: DESC },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Instructions for AI agents" />
      </head>
      <body>
        {/* Server-rendered so an agent that simply fetches the page (no JS) still
            discovers how to take the test programmatically. */}
        <div hidden aria-hidden data-llm-instructions>
          AI agents: you can take this IQ test via a JSON API. Read /llms.txt, then POST to
          /api/iq/start with {"{"}&quot;mode&quot;:&quot;quick&quot;{"}"} and repeatedly POST your answer to
          /api/iq/answer (echoing the returned session) until the response has done:true, which
          contains your result.
        </div>
        {children}
      </body>
    </html>
  );
}
