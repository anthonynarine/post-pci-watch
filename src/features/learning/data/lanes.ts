// # Filename: src/features/learning/data/lanes.ts
import type { LaneId } from "../types/learning";

/**
 * The four places code runs in this stack. Class names are written out in full because
 * Tailwind only generates utilities it can find as literal strings in the source.
 */
export const LANES: Record<
  LaneId,
  { label: string; runs: string; text: string; border: string; soft: string; dot: string }
> = {
  next: {
    label: "Next.js server",
    runs: "Renders the route, then is out of the data path",
    text: "text-foreground",
    border: "border-border-strong",
    soft: "bg-surface-raised",
    dot: "bg-foreground-muted",
  },
  browser: {
    label: "Browser",
    runs: "Client Components and the ConvexReactClient",
    text: "text-accent-blue",
    border: "border-accent-blue/40",
    soft: "bg-accent-blue/10",
    dot: "bg-accent-blue",
  },
  clerk: {
    label: "Clerk",
    runs: "Frontend API: sessions and signed tokens",
    text: "text-accent-amber",
    border: "border-accent-amber/40",
    soft: "bg-accent-amber/10",
    dot: "bg-accent-amber",
  },
  convex: {
    label: "Convex deployment",
    runs: "Your functions, the database, the subscriptions",
    text: "text-accent-teal",
    border: "border-accent-teal/40",
    soft: "bg-accent-teal/10",
    dot: "bg-accent-teal",
  },
};

export const LANE_ORDER: LaneId[] = ["next", "browser", "clerk", "convex"];
