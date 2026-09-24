// # Filename: src/features/learning/parts/request-pipeline/ClosingSections.tsx
import Link from "next/link";
import { Brain } from "lucide-react";

import { ArticleSection } from "../../components/ArticleSection";
import { MasteryCheck } from "../../components/MasteryCheck";
import { SourceList } from "../../components/SourceList";
import {
  REQUEST_PIPELINE_MASTERY,
  REQUEST_PIPELINE_SOURCES,
} from "../../data/requestPipelineReference";

/**
 * Sections 14–16 of Article 01: the final mental model, the mastery questions, and the
 * primary sources. Grouped in one file because each is a thin frame around data that lives
 * in data/requestPipelineReference.ts. Static; Server Components.
 */
export function MentalModelSection() {
  return (
    <ArticleSection id="mental-model" number={14} title="Final mental model">
      <blockquote className="max-w-[44rem] border-l-4 border-primary pl-5 text-lg leading-8 text-foreground">
        The React hook selects a public backend function. Clerk supplies verifiable identity.
        Convex verifies the token and gives the function a capability-limited context. Our code
        validates and authorizes the operation. Queries read, mutations write transactionally,
        and actions communicate with the outside world. When backend truth changes, reactive
        queries deliver that truth to React.
      </blockquote>
    </ArticleSection>
  );
}

export function MasteryCheckSection() {
  return (
    <ArticleSection id="mastery-check" number={15} title="Mastery check">
      <MasteryCheck questions={REQUEST_PIPELINE_MASTERY} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft px-5 py-4">
        <p className="max-w-[36rem] text-sm leading-6 text-foreground">
          Reading this once will fade within days. The practice set brings each idea back just
          before you would forget it — 21 items, about ten minutes a session.
        </p>
        <Link
          href="/learn/next-clerk-convex-request-pipeline/practice"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Brain aria-hidden="true" className="size-4" />
          Start practising
        </Link>
      </div>
    </ArticleSection>
  );
}

export function SourcesSection() {
  return (
    <ArticleSection id="sources" number={16} title="Sources">
      <p>
        Primary sources only. Installed type definitions and library code decide questions of
        fact for the exact versions in this project; the official documentation is cited where
        it states a guarantee.
      </p>
      <SourceList sources={REQUEST_PIPELINE_SOURCES} />
    </ArticleSection>
  );
}
