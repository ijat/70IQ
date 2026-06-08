// Shared SVG shape vocabulary used by all generators. Colors come from a fixed
// palette so puzzles get "dynamic colors" while outlines use currentColor so
// they adapt to light/dark themes.

export const SHAPES = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "hexagon",
  "star",
  "pentagon",
  "cross",
] as const;
export type Shape = (typeof SHAPES)[number];

export const FILLS = ["solid", "outline", "half", "dotted"] as const;
export type Fill = (typeof FILLS)[number];

// Vivid but harmonious palette (works on light & dark backgrounds).
export const PALETTE = [
  { name: "rose", hex: "#fb5d83" },
  { name: "amber", hex: "#f5a524" },
  { name: "emerald", hex: "#1bbf83" },
  { name: "sky", hex: "#3aa3f0" },
  { name: "violet", hex: "#9b6dff" },
  { name: "teal", hex: "#15c5c5" },
] as const;
export type ColorName = (typeof PALETTE)[number]["name"];

export function hexFor(name: string): string {
  return PALETTE.find((p) => p.name === name)?.hex ?? "#888";
}

// Build the SVG path/element for one shape centered at (cx,cy) with radius r.
function shapePath(shape: Shape, cx: number, cy: number, r: number): string {
  const poly = (pts: [number, number][]) =>
    pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const reg = (n: number, rot = -Math.PI / 2) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const ang = rot + (i * 2 * Math.PI) / n;
      pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
    }
    return pts;
  };
  switch (shape) {
    case "circle":
      return `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
    case "square":
      return `<rect x="${cx - r * 0.88}" y="${cy - r * 0.88}" width="${r * 1.76}" height="${r * 1.76}" rx="${r * 0.12}" />`;
    case "triangle":
      return `<polygon points="${poly(reg(3))}" />`;
    case "diamond":
      return `<polygon points="${poly(reg(4))}" />`;
    case "pentagon":
      return `<polygon points="${poly(reg(5))}" />`;
    case "hexagon":
      return `<polygon points="${poly(reg(6, 0))}" />`;
    case "star": {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push([cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)]);
      }
      return `<polygon points="${poly(pts)}" />`;
    }
    case "cross": {
      const w = r * 0.42;
      return `<path d="M${cx - w},${cy - r} h${2 * w} v${r - w} h${r - w} v${2 * w} h${-(r - w)} v${r - w} h${-2 * w} v${-(r - w)} h${-(r - w)} v${-2 * w} h${r - w} z" />`;
    }
  }
}

export type Glyph = {
  shape: Shape;
  color: string; // palette name
  fill: Fill;
  count: number; // 1..4
  rot: number; // degrees
  size: number; // 0.6..1.0 scale
};

let patId = 0;

// Render one glyph (possibly multiple copies) inside a box of given size.
export function drawGlyph(g: Glyph, box = 100): string {
  const hex = hexFor(g.color);
  const positions: [number, number][] =
    g.count === 1
      ? [[box / 2, box / 2]]
      : g.count === 2
        ? [
            [box * 0.32, box / 2],
            [box * 0.68, box / 2],
          ]
        : g.count === 3
          ? [
              [box / 2, box * 0.3],
              [box * 0.32, box * 0.68],
              [box * 0.68, box * 0.68],
            ]
          : [
              [box * 0.32, box * 0.32],
              [box * 0.68, box * 0.32],
              [box * 0.32, box * 0.68],
              [box * 0.68, box * 0.68],
            ];
  const baseR = (g.count > 1 ? box * 0.17 : box * 0.3) * g.size;
  const parts = positions.map(([cx, cy]) => {
    const path = shapePath(g.shape, cx, cy, baseR);
    let style = "";
    if (g.fill === "solid") style = `fill="${hex}" stroke="${hex}" stroke-width="2"`;
    else if (g.fill === "outline")
      style = `fill="none" stroke="${hex}" stroke-width="4"`;
    else if (g.fill === "half") {
      const id = `hp${patId++}`;
      const pat = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="50%" stop-color="${hex}"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs>`;
      style = `fill="url(#${id})" stroke="${hex}" stroke-width="3"`;
      return `<g transform="rotate(${g.rot} ${cx} ${cy})">${pat}${path.replace("/>", ` ${style}/>`).replace("</polygon>", ` ${style}></polygon>`).replace("></circle>", ` ${style}></circle>`)}</g>`;
    } else if (g.fill === "dotted") {
      const id = `dp${patId++}`;
      const pat = `<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="${hex}"/></pattern></defs>`;
      style = `fill="url(#${id})" stroke="${hex}" stroke-width="3"`;
      return `<g transform="rotate(${g.rot} ${cx} ${cy})">${pat}${injectStyle(path, style)}</g>`;
    }
    return `<g transform="rotate(${g.rot} ${cx} ${cy})">${injectStyle(path, style)}</g>`;
  });
  return parts.join("");
}

function injectStyle(path: string, style: string): string {
  // Insert attributes before the self-closing or closing tag.
  if (path.includes("/>")) return path.replace("/>", ` ${style}/>`);
  return path.replace(/></, `${style}><`);
}

// Wrap inner SVG content in a sized, theme-aware <svg>.
export function svgWrap(inner: string, w: number, h: number): string {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="qsvg" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

// Human-readable text for a glyph (LLM encoding).
export function glyphText(g: Glyph): string {
  const f =
    g.fill === "solid"
      ? "filled"
      : g.fill === "outline"
        ? "outline"
        : g.fill === "half"
          ? "half-filled"
          : "dotted";
  return `${g.count}× ${g.color} ${f} ${g.shape}${g.rot ? ` rotated ${g.rot}°` : ""}`;
}
