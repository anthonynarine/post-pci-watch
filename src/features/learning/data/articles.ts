// # Filename: src/features/learning/data/articles.ts
import type { ArticleMeta } from "../types/learning";

/**
 * The teaching library's catalogue. The index page renders whatever is listed here and the
 * article route statically generates one page per slug, so adding an article is one entry
 * here plus one content component registered in parts/index.ts. No page is written around a
 * particular article.
 */
export const ARTICLES: ArticleMeta[] = [
  {
    number: 1,
    slug: "next-clerk-convex-request-pipeline",
    title: "How Next.js, Clerk, and Convex Handle One Request",
    subtitle: "From a React hook to authenticated backend execution and a reactive UI update",
    summary:
      "One path traced end to end: which system runs each step, what crosses each boundary, what the typed ctx really contains, where authentication stops and authorization begins, and why the table rerenders without a refetch.",
    readingMinutes: 30,
    publishedOn: "2026-09-23",
    verifiedOn: "2026-09-23",
    verifiedAgainst: ["convex 1.46.0", "@clerk/nextjs 7.9.4", "next 16.3.5"],
    phases: [2, 3, 4, 5],
    topics: ["Server vs Client Components", "Clerk identity", "Convex functions", "ctx", "Authorization", "Reactivity"],
    sections: [
      { id: "architectural-sentence", title: "The architectural sentence" },
      { id: "four-systems", title: "The four systems" },
      { id: "request-pipeline", title: "End-to-end request pipeline" },
      { id: "generated-api", title: "The generated API object" },
      { id: "public-functions", title: "Public function types" },
      { id: "internal-functions", title: "Internal functions" },
      { id: "ctx", title: "ctx as a capability object" },
      { id: "authn-authz", title: "Authentication versus authorization" },
      { id: "why-rerender", title: "Why React rerenders" },
      { id: "server-client", title: "Server and Client Components" },
      { id: "security-boundary", title: "The security boundary" },
      { id: "misconceptions", title: "Common misconceptions" },
      { id: "post-pci-watch", title: "Mapped onto Post-PCI Watch" },
      { id: "mental-model", title: "Final mental model" },
      { id: "mastery-check", title: "Mastery check" },
      { id: "sources", title: "Sources" },
    ],
  },
];

export function getArticleMeta(slug: string): ArticleMeta | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}
