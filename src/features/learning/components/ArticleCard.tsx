// # Filename: src/features/learning/components/ArticleCard.tsx
import Link from "next/link";
import { ArrowRight, Brain, Clock } from "lucide-react";

import { PRACTICE_DECKS } from "../data/practiceDecks";
import type { ArticleMeta } from "../types/learning";

/**
 * One entry in the teaching library. Renders whatever metadata it is given, so the index
 * page never needs to know which articles exist. The whole card is one link, with the
 * article title as its accessible name source — so the practice mode is mentioned as text
 * here, not as a second link nested inside the first.
 */
export function ArticleCard({ article }: { article: ArticleMeta }) {
  return (
    <Link
      href={`/learn/${article.slug}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-mono font-semibold text-primary-text">
          Article {String(article.number).padStart(2, "0")}
        </span>
        <span className="inline-flex items-center gap-1 text-foreground-muted">
          <Clock aria-hidden="true" className="size-3.5" />
          {article.readingMinutes} min read
        </span>
      </div>

      <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{article.title}</h2>
      <p className="mt-1 text-sm font-medium text-foreground-muted">{article.subtitle}</p>
      <p className="mt-3 flex-1 text-sm leading-6 text-foreground-muted">{article.summary}</p>

      {PRACTICE_DECKS[article.slug] ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Brain aria-hidden="true" className="size-3.5 text-primary-text" />
          Includes a {PRACTICE_DECKS[article.slug].length}-item spaced practice set
        </p>
      ) : null}

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Topics">
        {article.topics.map((topic) => (
          <li
            key={topic}
            className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] text-foreground-muted"
          >
            {topic}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-foreground-muted">
        <span>
          Published <time dateTime={article.publishedOn} className="font-mono">{article.publishedOn}</time>
          {" · "}Phases {article.phases.join(", ")}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          Read the article
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
