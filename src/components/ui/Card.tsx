// # Filename: src/components/ui/Card.tsx
import type { LucideIcon } from "lucide-react";

export function Card({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Rendered opposite the title: a badge or count, never a control in this phase. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            {Icon ? <Icon aria-hidden="true" className="size-4 text-foreground-muted" /> : null}
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-foreground-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
