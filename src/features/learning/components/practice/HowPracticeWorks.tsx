// # Filename: src/features/learning/components/practice/HowPracticeWorks.tsx
import { CalendarClock, Gauge, PenLine, Shuffle, Target, TimerReset } from "lucide-react";

/**
 * The practice page's explanation of its own design: each technique it uses, and the
 * mechanism behind it, in one line each. A Server Component. It says plainly that these
 * feel harder than re-reading, because that is the most common reason people abandon them.
 */
const TECHNIQUES = [
  {
    Icon: Target,
    name: "Retrieval practice",
    how: "Every item asks before it tells. Pulling an answer out of memory strengthens it far more than reading it again.",
  },
  {
    Icon: PenLine,
    name: "Generation",
    how: "Recall items make you write the answer. Producing it is harder than recognising it, and that is the point.",
  },
  {
    Icon: CalendarClock,
    name: "Spacing",
    how: "Items return after 0, 1, 3, 7, then 16 days — each time close to the point of forgetting.",
  },
  {
    Icon: Shuffle,
    name: "Interleaving",
    how: "Topics are mixed, so each item first makes you decide which concept applies.",
  },
  {
    Icon: Gauge,
    name: "Confidence first",
    how: "You rate certainty before seeing the answer. Confident misses are flagged: they are the beliefs worth fixing.",
  },
  {
    Icon: TimerReset,
    name: "Pretesting and relearning",
    how: "Trying before you have read helps the reading stick. A miss comes back once later in the same session.",
  },
];

export function HowPracticeWorks() {
  return (
    <details className="group rounded-xl border border-border bg-surface">
      <summary className="cursor-pointer rounded-xl px-5 py-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Why this feels harder than reading — and why that is deliberate
      </summary>
      <div className="border-t border-border px-5 py-4">
        <ul className="grid gap-3 sm:grid-cols-2">
          {TECHNIQUES.map(({ Icon, name, how }) => (
            <li key={name} className="flex gap-3">
              <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-text" />
              <div className="text-sm leading-6">
                <p className="font-semibold text-foreground">{name}</p>
                <p className="text-foreground-muted">{how}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-foreground-muted">
          Re-reading feels productive because the page becomes familiar. Familiarity is not
          recall. If a session feels effortful and you get things wrong, it is working.
        </p>
      </div>
    </details>
  );
}
