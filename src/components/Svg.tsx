"use client";

// Renders a trusted, app-generated SVG string. Content is produced entirely by
// our own generators (no user input), so dangerouslySetInnerHTML is safe here.
export default function Svg({ markup, className }: { markup: string; className?: string }) {
  return <span className={className} aria-hidden dangerouslySetInnerHTML={{ __html: markup }} />;
}
