// # Filename: src/features/learning/components/practice/ChoiceCard.tsx
"use client";

import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";

import type { ChoiceItem, Confidence } from "../../types/learning";
import { CardProps, ConfidencePicker, ItemFrame, PrimaryButton, Verdict } from "./PracticeParts";

/**
 * Discrimination. Every option is a near-miss someone plausibly believes, and after
 * checking, *every* option shows why it is right or wrong — the explanation of the tempting
 * wrong answer is usually the lesson. Options are a radio group: arrow keys move between
 * them, and the order is fixed for the session but differs between sessions.
 */
export function ChoiceCard({ item, order, onDone }: CardProps<ChoiceItem>) {
  const displayOrder = order ?? item.options.map((_, index) => index);
  const [chosen, setChosen] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [checked, setChecked] = useState(false);

  const correct = chosen !== null && item.options[chosen].correct;

  return (
    <ItemFrame item={item}>
      <div role="radiogroup" aria-label="Options" className="space-y-2">
        {displayOrder.map((optionIndex) => {
          const option = item.options[optionIndex];
          const selected = chosen === optionIndex;
          const showState = checked && (selected || option.correct);

          return (
            <div key={option.label}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${
                  showState && option.correct
                    ? "border-status-normal-line bg-status-normal-soft"
                    : showState
                      ? "border-status-warning-line bg-status-warning-soft"
                      : selected
                        ? "border-foreground bg-surface-raised"
                        : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <input
                  type="radio"
                  name={item.id}
                  checked={selected}
                  disabled={checked}
                  onChange={() => setChosen(optionIndex)}
                  className="mt-1 size-4 accent-[var(--primary)]"
                />
                <span className="min-w-0 flex-1 text-foreground">
                  {option.label}
                  {checked ? (
                    <span className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-foreground-muted">
                      {option.correct ? (
                        <CircleCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-status-normal" />
                      ) : (
                        <CircleX aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
                      )}
                      <span>
                        <span className="font-semibold text-foreground">{option.correct ? "Right: " : "Wrong: "}</span>
                        {option.why}
                      </span>
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {!checked ? (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <PrimaryButton disabled={chosen === null || !confidence} onClick={() => setChecked(true)}>
            Check
          </PrimaryButton>
        </>
      ) : (
        <>
          <Verdict correct={correct} confidence={confidence} />
          <PrimaryButton onClick={() => onDone(correct, confidence ?? "guess")}>Continue</PrimaryButton>
        </>
      )}
    </ItemFrame>
  );
}
