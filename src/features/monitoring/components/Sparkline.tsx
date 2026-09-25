// # Filename: src/features/monitoring/components/Sparkline.tsx
"use client";

import { useState } from "react";

/**
 * A single-series trend line for one vital. Plain SVG — no chart library for one line.
 *
 * The line is in the muted ink so it reads as context; the latest point is in the accent, since
 * that is the value the row is about. Pointing at the line shows a crosshair and the nearest
 * point's time and value. The exact numbers are always in the same table row, so the chart is
 * never the only way to read them.
 */

type Point = { at: number; value: number };

const WIDTH = 120;
const HEIGHT = 32;
const PAD = 4;

function formatTime(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(11, 19);
}

export function Sparkline({
  points,
  label,
  unit,
}: {
  points: Point[];
  label: string;
  unit: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (points.length < 2) {
    return <span className="text-xs text-foreground-muted">—</span>;
  }

  const first = points[0].at;
  const last = points[points.length - 1].at;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // A flat series still needs a vertical range, or every point divides by zero.
  const span = max - min || 1;

  const x = (at: number) => PAD + ((at - first) / (last - first || 1)) * (WIDTH - PAD * 2);
  const y = (value: number) => HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2);

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(point.at).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(" ");

  const end = points[points.length - 1];
  const shown = active === null ? null : points[active];

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - box.left) / box.width) * WIDTH;

    let nearest = 0;
    for (let index = 1; index < points.length; index += 1) {
      if (Math.abs(x(points[index].at) - pointerX) < Math.abs(x(points[nearest].at) - pointerX)) {
        nearest = index;
      }
    }
    setActive(nearest);
  }

  return (
    <span className="relative inline-block align-middle">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={`${label} trend: ${points.length} points from ${points[0].value} to ${end.value} ${unit}, range ${min}–${max}`}
        className="block touch-none overflow-visible"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActive(null)}
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground-muted"
        />

        {shown ? (
          <line
            x1={x(shown.at)}
            x2={x(shown.at)}
            y1={0}
            y2={HEIGHT}
            stroke="currentColor"
            strokeWidth={1}
            className="text-border"
          />
        ) : null}

        <circle
          cx={x((shown ?? end).at)}
          cy={y((shown ?? end).value)}
          r={3.5}
          fill="currentColor"
          stroke="var(--color-surface, transparent)"
          strokeWidth={2}
          className="text-primary"
        />
      </svg>

      {shown ? (
        <span
          role="status"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 font-sans text-xs text-foreground shadow-sm"
        >
          <span className="font-medium">
            {shown.value} {unit}
          </span>{" "}
          <span className="text-foreground-muted">at {formatTime(shown.at)} UTC</span>
        </span>
      ) : null}
    </span>
  );
}
