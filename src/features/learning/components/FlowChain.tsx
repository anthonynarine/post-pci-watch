// # Filename: src/features/learning/components/FlowChain.tsx
import { ArrowDown, ArrowRight } from "lucide-react";

/**
 * A short "A → B → C" chain rendered as an ordered list, so a screen reader hears the steps
 * in order. It stacks vertically on phones and wraps horizontally from the sm breakpoint, so
 * it never forces the page to scroll sideways. Arrows are decoration and hidden from
 * assistive technology; the list order carries the meaning.
 */
export function FlowChain({
  label,
  steps,
  tone = "neutral",
}: {
  label: string;
  steps: string[];
  tone?: "neutral" | "return";
}) {
  const accent =
    tone === "return" ? "border-accent-teal/40 bg-accent-teal/10" : "border-border bg-surface-raised";

  return (
    <figure className={`rounded-lg border px-4 py-3 ${accent}`}>
      <figcaption className="text-xs font-semibold text-foreground-muted">{label}</figcaption>
      <ol className="mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5 sm:gap-y-2">
        {steps.map((step, index) => (
          <li key={`${index}-${step}`} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
            {index > 0 ? (
              <>
                <ArrowDown aria-hidden="true" className="size-3 text-foreground-muted sm:hidden" />
                <ArrowRight aria-hidden="true" className="hidden size-3 text-foreground-muted sm:block" />
              </>
            ) : null}
            <span className="w-fit rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] leading-5 text-foreground">
              {step}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
