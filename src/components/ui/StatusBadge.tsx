// # Filename: src/components/ui/StatusBadge.tsx
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";

/**
 * Visual vocabulary for status. The monitoring feature declares the same three names for
 * its own domain meaning; this file only decides how they look.
 */
export type StatusTone = "normal" | "watch" | "critical" | "neutral";

/** Each tone carries an icon and a word, so the state never depends on colour alone. */
const TONES = {
  normal: {
    label: "In range",
    Icon: CircleCheck,
    className: "border-status-normal-line bg-status-normal-soft text-status-normal",
  },
  watch: {
    label: "Watch",
    Icon: TriangleAlert,
    className: "border-status-warning-line bg-status-warning-soft text-status-warning",
  },
  critical: {
    label: "Attention",
    Icon: OctagonAlert,
    className:
      "border-status-critical-line bg-status-critical-soft text-status-critical font-semibold ring-1 ring-status-critical/40",
  },
  neutral: {
    label: "Information",
    Icon: Info,
    className: "border-border bg-surface-raised text-foreground-muted",
  },
} as const;

export function StatusBadge({ tone, label }: { tone: StatusTone; label?: string }) {
  const { Icon, className, label: defaultLabel } = TONES[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label ?? defaultLabel}
    </span>
  );
}
