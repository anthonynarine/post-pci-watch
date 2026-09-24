// # Filename: src/features/learning/components/practice/PracticeParts.tsx
"use client";

import { CircleCheck, CircleX } from "lucide-react";

import type { Confidence, PracticeItem } from "../../types/learning";

/**
 * Pieces every practice card shares: the item frame, the confidence question, the verdict
 * banner, and the primary action button.
 *
 * The confidence question is asked *before* the answer is revealed on purpose. Committing
 * to a level of certainty is what later lets the summary separate confident errors — the
 * misconceptions most worth correcting — from honest guesses.
 */

export type CardProps<T extends PracticeItem> = {
  item: T;
  /** Display order for options or steps, fixed for the session. */
  order?: number[];
  onDone: (correct: boolean, confidence: Confidence) => void;
};

const KIND_LABEL: Record<PracticeItem["kind"], string> = {
  recall: "Recall — answer from memory",
  choice: "Choose — tell similar ideas apart",
  bug: "Bug hunt — find the flawed line",
  order: "Sequence — rebuild the chain",
};

export function ItemFrame({ item, children }: { item: PracticeItem; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary-text">{KIND_LABEL[item.kind]}</p>
      <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
        {item.prompt}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

const CONFIDENCE: { value: Confidence; label: string }[] = [
  { value: "guess", label: "Guessing" },
  { value: "fairly", label: "Fairly sure" },
  { value: "certain", label: "Certain" },
];

export function ConfidencePicker({
  value,
  onChange,
  disabled,
}: {
  value: Confidence | null;
  onChange: (value: Confidence) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-xs font-semibold text-foreground-muted">How sure are you?</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CONFIDENCE.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface text-foreground hover:border-border-strong"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Verdict({
  correct,
  confidence,
  children,
}: {
  correct: boolean;
  confidence: Confidence | null;
  children?: React.ReactNode;
}) {
  const confidentMiss = !correct && confidence === "certain";
  const Icon = correct ? CircleCheck : CircleX;

  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-3 ${
        correct ? "border-status-normal-line bg-status-normal-soft" : "border-status-warning-line bg-status-warning-soft"
      }`}
    >
      <p className={`flex items-center gap-2 text-sm font-semibold ${correct ? "text-status-normal" : "text-status-warning"}`}>
        <Icon aria-hidden="true" className="size-4" />
        {correct ? "Correct" : confidentMiss ? "Not quite — and you were certain" : "Not quite"}
      </p>
      {confidentMiss ? (
        <p className="mt-1 text-xs text-foreground">
          A confident miss is the most valuable result in a session: it is a belief you would
          have acted on. Read the explanation slowly.
        </p>
      ) : null}
      {children ? <div className="mt-2 space-y-2 text-sm leading-6 text-foreground">{children}</div> : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}
