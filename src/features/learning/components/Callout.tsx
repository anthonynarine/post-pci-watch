// # Filename: src/features/learning/components/Callout.tsx
import { BadgeCheck, Info, SearchCheck, TriangleAlert } from "lucide-react";

/**
 * "correction" names a common simplification and replaces it. "evidence" says what a claim
 * was checked against. Each tone carries an icon and a word, so none depends on colour.
 */
const TONES = {
  note: {
    label: "Note",
    Icon: Info,
    className: "border-border bg-surface-raised",
    accent: "text-foreground-muted",
  },
  correction: {
    label: "Correction",
    Icon: TriangleAlert,
    className: "border-status-warning-line bg-status-warning-soft",
    accent: "text-status-warning",
  },
  evidence: {
    label: "Verified",
    Icon: SearchCheck,
    className: "border-accent-teal/40 bg-accent-teal/10",
    accent: "text-accent-teal",
  },
  principle: {
    label: "Principle",
    Icon: BadgeCheck,
    className: "border-primary/30 bg-primary-soft",
    accent: "text-primary-text",
  },
} as const;

export function Callout({
  tone,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  title?: string;
  children: React.ReactNode;
}) {
  const { label, Icon, className, accent } = TONES[tone];

  return (
    <aside className={`rounded-lg border px-4 py-3 ${className}`}>
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${accent}`}>
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
        {title ? <span className="text-foreground">— {title}</span> : null}
      </p>
      <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-foreground">{children}</div>
    </aside>
  );
}
