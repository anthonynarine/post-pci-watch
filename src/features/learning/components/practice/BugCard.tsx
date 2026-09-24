// # Filename: src/features/learning/components/practice/BugCard.tsx
"use client";

import { useState } from "react";
import { FileCode2 } from "lucide-react";

import type { BugItem, Confidence } from "../../types/learning";
import { CardProps, ConfidencePicker, ItemFrame, PrimaryButton, Verdict } from "./PracticeParts";

/**
 * Bug hunt. Applying a rule to code the learner has never seen is transfer, which recall of
 * the rule alone does not guarantee. Each line is a radio option, so the listing is
 * keyboard-navigable with arrow keys and announced one line at a time. The code is a
 * teaching example and says so on screen.
 */
export function BugCard({ item, onDone }: CardProps<BugItem>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [checked, setChecked] = useState(false);

  const correct = chosen === item.faultyLine;

  return (
    <ItemFrame item={item}>
      <figure className="overflow-hidden rounded-lg border border-border bg-surface-raised">
        <figcaption className="flex items-center gap-2 border-b border-border px-3 py-2 font-mono text-[11px] text-foreground-muted">
          <FileCode2 aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{item.path}</span>
        </figcaption>
        <div role="radiogroup" aria-label="Code lines — select the flawed line" className="overflow-x-auto py-1.5">
          {item.lines.map((line, index) => {
            const selected = chosen === index;
            const isFault = checked && index === item.faultyLine;
            const isWrongPick = checked && selected && !isFault;

            return (
              <label
                key={index}
                className={`flex min-w-max cursor-pointer items-start gap-3 px-3 py-0.5 font-mono text-xs leading-6 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring ${
                  isFault
                    ? "bg-status-normal-soft"
                    : isWrongPick
                      ? "bg-status-warning-soft"
                      : selected
                        ? "bg-surface"
                        : "hover:bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name={item.id}
                  checked={selected}
                  disabled={checked}
                  onChange={() => setChosen(index)}
                  className="sr-only"
                />
                <span className="w-5 shrink-0 select-none text-right text-foreground-muted">{index + 1}</span>
                <span
                  aria-hidden="true"
                  className={`w-4 shrink-0 text-center font-sans font-semibold ${
                    isFault ? "text-status-normal" : isWrongPick ? "text-status-warning" : "text-primary-text"
                  }`}
                >
                  {isFault ? "✓" : isWrongPick ? "✗" : selected ? "▸" : ""}
                </span>
                <span className="whitespace-pre text-foreground">{line}</span>
                {isFault ? <span className="sr-only">(the flawed line)</span> : null}
              </label>
            );
          })}
        </div>
      </figure>

      {!checked ? (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <PrimaryButton disabled={chosen === null || !confidence} onClick={() => setChecked(true)}>
            Check
          </PrimaryButton>
        </>
      ) : (
        <>
          <Verdict correct={correct} confidence={confidence}>
            <p>
              {correct ? "" : `The flaw is on line ${item.faultyLine + 1}. `}
              {item.explanation}
            </p>
          </Verdict>
          <PrimaryButton onClick={() => onDone(correct, confidence ?? "guess")}>Continue</PrimaryButton>
        </>
      )}
    </ItemFrame>
  );
}
