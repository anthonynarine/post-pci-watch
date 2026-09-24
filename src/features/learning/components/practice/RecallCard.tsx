// # Filename: src/features/learning/components/practice/RecallCard.tsx
"use client";

import { useId, useState } from "react";

import type { Confidence, RecallItem } from "../../types/learning";
import { CardProps, ConfidencePicker, ItemFrame, PrimaryButton, SecondaryButton, Verdict } from "./PracticeParts";

/**
 * Free recall. The learner writes an answer before seeing one — generating an answer is
 * harder than recognising it, and that difficulty is what strengthens memory. "I don't
 * know" is allowed and honest: attempting and failing before seeing the answer still helps.
 *
 * Scoring is a self-check against the model answer's key points rather than text matching,
 * which would punish correct answers in the learner's own words. Recalled means every key
 * point but at most one.
 */
export function RecallCard({ item, onDone }: CardProps<RecallItem>) {
  const answerId = useId();
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [ticked, setTicked] = useState<boolean[]>(() => item.keyPoints.map(() => false));

  const hits = ticked.filter(Boolean).length;
  const correct = hits >= item.keyPoints.length - 1 && answer.trim().length > 0;

  return (
    <ItemFrame item={item}>
      <div>
        <label htmlFor={answerId} className="text-xs font-semibold text-foreground-muted">
          Your answer, in your own words
        </label>
        <textarea
          id={answerId}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          readOnly={revealed}
          rows={5}
          placeholder="Write it as if explaining to a colleague. Fragments are fine."
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground placeholder:text-foreground-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring read-only:bg-surface-raised"
        />
      </div>

      {!revealed ? (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <div className="flex flex-wrap gap-2">
            <PrimaryButton disabled={!answer.trim() || !confidence} onClick={() => setRevealed(true)}>
              Reveal the answer
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setConfidence("guess");
                setRevealed(true);
              }}
            >
              I don&rsquo;t know yet
            </SecondaryButton>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-surface-raised px-4 py-3">
            <p className="text-xs font-semibold text-foreground-muted">Model answer</p>
            <p className="mt-1 text-sm leading-6 text-foreground">{item.modelAnswer}</p>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-foreground-muted">
              Tick each idea your answer actually contained — be strict with yourself
            </legend>
            <ul className="mt-2 space-y-1.5">
              {item.keyPoints.map((point, index) => (
                <li key={point}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-surface-raised">
                    <input
                      type="checkbox"
                      checked={ticked[index]}
                      disabled={!answer.trim()}
                      onChange={() =>
                        setTicked((current) => current.map((value, i) => (i === index ? !value : value)))
                      }
                      className="mt-1 size-4 accent-[var(--primary)]"
                    />
                    {point}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <Verdict correct={correct} confidence={confidence}>
            <p>
              {answer.trim()
                ? `${hits} of ${item.keyPoints.length} key ideas. ${correct ? "That counts as recalled." : "Recalled needs all but one."}`
                : "No attempt this time. Now that you have read it, this item will come back soon."}
            </p>
          </Verdict>

          <PrimaryButton onClick={() => onDone(correct, confidence ?? "guess")}>Continue</PrimaryButton>
        </>
      )}
    </ItemFrame>
  );
}
