// # Filename: src/app/learn/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ARTICLES, ARTICLE_CONTENT, ArticleShell, getArticleMeta } from "@/features/learning";

/**
 * One route for every teaching article. Orchestration only: resolve the slug to its
 * metadata and its content component, then frame the content in the shared shell.
 *
 * generateStaticParams lists every catalogued slug and dynamicParams = false turns any
 * other slug into a 404 instead of an attempted render. Public by design — no patient data —
 * so there is no auth.protect(). (The root layout's header reads the Clerk session, so this
 * route is still rendered per request; that is a property of the layout, not of this page.)
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const meta = getArticleMeta(slug);

  if (!meta) return {};

  return {
    title: `${meta.title} · Post-PCI Watch`,
    description: meta.subtitle,
  };
}

export default async function ArticlePage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const meta = getArticleMeta(slug);
  const Content = ARTICLE_CONTENT[slug];

  if (!meta || !Content) notFound();

  return (
    <ArticleShell meta={meta}>
      <Content />
    </ArticleShell>
  );
}
