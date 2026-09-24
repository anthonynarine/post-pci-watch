// # Filename: src/app/learn/page.tsx
import type { Metadata } from "next";
import { FlaskConical, GraduationCap } from "lucide-react";

import { ARTICLES, ArticleCard } from "@/features/learning";

/**
 * The teaching library index. Orchestration only: the heading, then one card per entry in
 * the article catalogue. Public by design — it holds no patient data — so there is no
 * auth.protect() here. A Server Component with no client JavaScript of its own.
 */
export const metadata: Metadata = {
  title: "Teaching library · Post-PCI Watch",
  description: "Concept articles explaining how this Next.js, Clerk, and Convex application works.",
};

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-text">
          <GraduationCap aria-hidden="true" className="size-4" />
          Teaching library
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          The big concepts, explained against real code
        </h1>
        <p className="mt-3 text-base leading-7 text-foreground-muted">
          Each article takes one idea this project depends on and traces it through the files that
          implement it. Every technical claim is checked against the exact library versions
          installed here and against official documentation, and each article records when it was
          last verified.
        </p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-text">
          <FlaskConical aria-hidden="true" className="size-3.5" />
          Synthetic data only — no article uses real patient data
        </p>
      </header>

      <section aria-labelledby="articles-heading">
        <h2 id="articles-heading" className="sr-only">
          Articles
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {ARTICLES.map((article) => (
            <li key={article.slug}>
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
