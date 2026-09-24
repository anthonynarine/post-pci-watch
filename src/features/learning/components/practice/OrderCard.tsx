// # Filename: src/features/learning/components/practice/OrderCard.tsx
"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, CircleCheck, CircleX } from "lucide-react";

import type { Confidence, OrderItem } from "../../types/learning";
import { CardProps, ConfidencePicker, ItemFrame, PrimaryButton, Verdict } from "./PracticeParts";

/**
 * Sequencing. Rebuilding a causal chain forces the learner to know *why* each step must
 * precede the next, not just that the steps exist. Reordering uses Move up / Move down
 * buttons rather than drag and drop, so it works with a keyboard and a screen reader, and
 * focus follows the moved step. The starting order is shuffled once per session, by the
 * session, never during render.
 */
export function OrderCard({ item, order, onDone }: CardProps<OrderItem>) {
  const [arrangement, setArrangement] = useState<number[]>(() => order ?? item.steps.map((_, index) => index));
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [checked, setChecked] = useState(false);
  // Which arrow button should receive focus after the next render. A ref, not state: it is
  // consumed exactly once, so later re-renders (choosing a confidence level) never pull
  // focus back to the list.
  const pendingFocus = useRef<string | null>(null);

  const correct = arrangement.every((stepIndex, position) => stepIndex === position);

  function move(position: number, delta: -1 | 1) {
    const target = position + delta;
    if (target < 0 || target >= arrangement.length) return;
    setArrangement((current) => {
      const next = [...current];
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
    // Keep focus on the moved step. If it reached an end, its arrow in that direction is now
    // disabled and cannot hold focus, so use the other one.
    const atEnd = delta === -1 ? target === 0 : target === arrangement.length - 1;
    const direction = (delta === -1) !== atEnd ? "up" : "down";
    pendingFocus.current = `${item.id}-${arrangement[position]}-${direction}`;
  }

  return (
    <ItemFrame item={item}>
      <ol className="space-y-1.5" aria-label="Steps, in your chosen order">
        {arrangement.map((stepIndex, position) => {
          const inPlace = stepIndex === position;

          return (
            <li
              key={stepIndex}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${
                checked
                  ? inPlace
                    ? "border-status-normal-line bg-status-normal-soft"
                    : "border-status-warning-line bg-status-warning-soft"
                  : "border-border bg-surface"
              }`}
            >
              <span className="w-5 shrink-0 text-right font-mono text-xs text-foreground-muted">{position + 1}</span>
              {checked ? (
                inPlace ? (
                  <CircleCheck aria-label="In the right place" className="size-4 shrink-0 text-status-normal" />
                ) : (
                  <CircleX aria-label={`Belongs at position ${stepIndex + 1}`} className="size-4 shrink-0 text-status-warning" />
                )
              ) : null}
              <span className="min-w-0 flex-1 text-foreground">{item.steps[stepIndex]}</span>
              {!checked ? (
                <span className="flex shrink-0 gap-1">
                  {(["up", "down"] as const).map((direction) => {
                    const disabled = direction === "up" ? position === 0 : position === arrangement.length - 1;
                    const id = `${item.id}-${stepIndex}-${direction}`;
                    const Icon = direction === "up" ? ArrowUp : ArrowDown;
                    return (
                      <button
                        key={direction}
                        type="button"
                        disabled={disabled}
                        ref={(element) => {
                          if (element && pendingFocus.current === id) {
                            pendingFocus.current = null;
                            element.focus();
                          }
                        }}
                        onClick={() => move(position, direction === "up" ? -1 : 1)}
                        aria-label={`Move “${item.steps[stepIndex]}” ${direction}`}
                        className="rounded-md border border-border p-1.5 text-foreground-muted transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Icon aria-hidden="true" className="size-3.5" />
                      </button>
                    );
                  })}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {!checked ? (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <PrimaryButton disabled={!confidence} onClick={() => setChecked(true)}>
            Check the order
          </PrimaryButton>
        </>
      ) : (
        <>
          <Verdict correct={correct} confidence={confidence}>
            {!correct ? (
              <ol className="list-decimal space-y-0.5 pl-5 text-sm">
                {item.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
            <p>{item.explanation}</p>
          </Verdict>
          <PrimaryButton onClick={() => onDone(correct, confidence ?? "guess")}>Continue</PrimaryButton>
        </>
      )}
    </ItemFrame>
  );
}
