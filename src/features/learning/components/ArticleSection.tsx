// # Filename: src/features/learning/components/ArticleSection.tsx

/**
 * One numbered article section, plus the small inline elements prose needs. Running text
 * (paragraphs and lists that are direct children) is held to a comfortable reading measure;
 * figures, tables, and explorers placed alongside it keep the full column width. The id is
 * the anchor the table of contents links to and must match the article's metadata.
 */
export function ArticleSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2
        id={`${id}-heading`}
        className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight text-foreground"
      >
        <span className="font-mono text-sm font-medium text-primary-text">
          {String(number).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <div className="mt-5 space-y-5 text-[15px] leading-7 text-foreground [&>ol]:max-w-[44rem] [&>ol]:list-decimal [&>ol]:space-y-1.5 [&>ol]:pl-5 [&>p]:max-w-[44rem] [&>ul]:max-w-[44rem] [&>ul]:list-disc [&>ul]:space-y-1.5 [&>ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/** A lettered sub-heading inside a section. */
export function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 text-lg font-semibold tracking-tight text-foreground">{children}</h3>;
}

/** Inline code inside prose. */
export function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-border bg-surface-raised px-1 py-0.5 font-mono text-[0.85em] break-words">
      {children}
    </code>
  );
}
