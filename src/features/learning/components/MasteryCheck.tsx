// # Filename: src/features/learning/components/MasteryCheck.tsx
import { ChevronRight, MessageSquareQuote } from "lucide-react";

import type { MasteryQuestion } from "../types/learning";

/**
 * Questions with collapsible reference answers built on native <details>/<summary>: keyboard
 * operable, announced as expandable by screen readers, and working with no JavaScript — so
 * this stays a Server Component. Nothing is recorded. Reading these does not close a roadmap
 * phase; phase mastery checks are answered in the learner's own words in docs/PHASE_LOG.md.
 */
export function MasteryCheck({ questions }: { questions: MasteryQuestion[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquareQuote aria-hidden="true" className="size-4 text-primary-text" />
        Answer out loud first, then open the reference answer
      </p>
      <p className="mt-1 text-xs text-foreground-muted">
        These do not close any roadmap phase. Phase mastery checks stay open until answered in
        your own words.
      </p>

      <ol className="mt-4 space-y-2">
        {questions.map((item, index) => (
          <li key={item.question}>
            <details className="group rounded-lg border border-border bg-surface-raised">
              <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 font-mono text-xs text-foreground-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">{item.question}</span>
                <ChevronRight
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-foreground-muted transition-transform group-open:rotate-90"
                />
              </summary>
              <div className="border-t border-border px-3 py-3 pl-10 text-sm leading-6 text-foreground">
                <p>{item.answer}</p>
                <p className="mt-2 text-xs text-foreground-muted">Revisit: {item.revisit}</p>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
