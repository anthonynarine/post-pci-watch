// # Filename: src/features/learning/components/SourceList.tsx
import { BookOpen, FileType2 } from "lucide-react";

import type { Source } from "../types/learning";

/** Primary sources only: installed type definitions and library code, then official docs. */
export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {sources.map((source) => {
        const external = source.href.startsWith("https://");
        const Icon = external ? BookOpen : FileType2;

        return (
          <li key={source.href} className="flex gap-3 px-4 py-3">
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-foreground-muted" />
            <div className="min-w-0">
              {external ? (
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {source.label}
                </a>
              ) : (
                <p className="text-sm font-medium text-foreground">{source.label}</p>
              )}
              <p className="mt-0.5 break-all font-mono text-[11px] text-foreground-muted">
                {source.href}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">{source.verifies}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
