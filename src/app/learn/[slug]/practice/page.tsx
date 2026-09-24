// # Filename: src/app/learn/[slug]/practice/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";

import { HowPracticeWorks, PRACTICE_DECKS, PracticeSession, getArticleMeta } from "@/features/learning";

/**
 * Practice mode for one article. Orchestration only: resolve the article and its deck,
 * then hand the deck to the PracticeSession island. Public, like the article — it holds no
 * patient data and calls no backend function; progress stays in this browser.
 *
 * Params are generated only for slugs that have a deck, and dynamicParams = false turns any
 * other slug into a 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PRACTICE_DECKS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]/practice">): Promise<Metadata> {
  const { slug } = await params;
  const meta = getArticleMeta(slug);
  return meta ? { title: `Practice: ${meta.title} · Post-PCI Watch`, description: meta.subtitle } : {};
}

export default async function PracticePage({ params }: PageProps<"/learn/[slug]/practice">) {
  const { slug } = await params;
  const meta = getArticleMeta(slug);
  const deck = PRACTICE_DECKS[slug];

  if (!meta || !deck) notFound();

  const articleHref = `/learn/${slug}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={articleHref}
        className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Back to the article
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-text">
          Practice · Article {String(meta.number).padStart(2, "0")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{meta.title}</h1>
        <p className="mt-3 text-base leading-7 text-foreground-muted">
          Short sessions, answered from memory. Ten minutes every few days will do more than
          reading the article three times.
        </p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-text">
          <FlaskConical aria-hidden="true" className="size-3.5" />
          Synthetic examples · progress stays in this browser
        </p>
      </header>

      <PracticeSession deckId={slug} items={deck} sections={meta.sections} articleHref={articleHref} />

      <HowPracticeWorks />
    </div>
  );
}
