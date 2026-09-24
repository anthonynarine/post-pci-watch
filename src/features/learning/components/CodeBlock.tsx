// # Filename: src/features/learning/components/CodeBlock.tsx
import { FileCode2 } from "lucide-react";

/**
 * Excerpts are copied from the files they name and must be kept in step with them. No
 * syntax highlighter: it would be the first dependency this feature needs, for decoration.
 */
export function CodeBlock({ path, code }: { path: string; code: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-surface-raised">
      <figcaption className="flex items-center gap-2 border-b border-border px-3 py-2 font-mono text-[11px] text-foreground-muted">
        <FileCode2 aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{path}</span>
      </figcaption>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground">
        <code>{code.trim()}</code>
      </pre>
    </figure>
  );
}
