// # Filename: src/features/learning/components/ArticleShell.tsx
import Link from "next/link";
import { ArrowLeft, Brain, CalendarCheck, Clock, FlaskConical, PackageCheck } from "lucide-react";

import { PRACTICE_DECKS } from "../data/practiceDecks";
import type { ArticleMeta } from "../types/learning";

/**
 * The frame every teaching article shares: back link, header, verification stamp, and a
 * sticky table of contents built from the article's metadata. The contents are plain anchor
 * links, so this stays a Server Component and ships no JavaScript. On narrow screens the
 * contents collapse into a native <details> above the article rather than disappearing.
 */
export function ArticleShell({ meta, children }: { meta: ArticleMeta; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Teaching library
      </Link>

      <header className="mt-4 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-text">
          Article {String(meta.number).padStart(2, "0")} · Phases {meta.phases.join(", ")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
          {meta.title}
        </h1>
        <p className="mt-3 text-lg leading-7 text-foreground-muted">{meta.subtitle}</p>

        <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground-muted">
          <div className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-3.5" />
            <dt className="sr-only">Reading time</dt>
            <dd>{meta.readingMinutes} min read</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarCheck aria-hidden="true" className="size-3.5" />
            <dt>Verified</dt>
            <dd className="font-mono text-foreground">{meta.verifiedOn}</dd>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <PackageCheck aria-hidden="true" className="size-3.5" />
            <dt>Against</dt>
            {meta.verifiedAgainst.map((version) => (
              <dd
                key={version}
                className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-foreground"
              >
                {version}
              </dd>
            ))}
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-text">
            <FlaskConical aria-hidden="true" className="size-3.5" />
            Synthetic data only — every example is fabricated
          </p>
          {PRACTICE_DECKS[meta.slug] ? (
            <Link
              href={`/learn/${meta.slug}/practice`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Brain aria-hidden="true" className="size-3.5" />
              Practice — try it before you read
            </Link>
          ) : null}
        </div>
      </header>

      <details className="mt-8 rounded-lg border border-border bg-surface lg:hidden">
        <summary className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          On this page
        </summary>
        <TableOfContents meta={meta} />
      </details>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_13rem]">
        <article className="min-w-0 space-y-16">{children}</article>

        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              On this page
            </p>
            <TableOfContents meta={meta} />
          </div>
        </nav>
      </div>
    </div>
  );
}

function TableOfContents({ meta }: { meta: ArticleMeta }) {
  return (
    <ol className="mt-3 space-y-1 border-l border-border px-4 pb-3 lg:px-0 lg:pb-0">
      {meta.sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="-ml-px flex gap-2 border-l border-transparent py-0.5 pl-3 text-xs text-foreground-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="font-mono">{String(index + 1).padStart(2, "0")}</span>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );
}
