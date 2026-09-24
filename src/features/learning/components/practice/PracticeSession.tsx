// # Filename: src/features/learning/components/practice/PracticeSession.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, RotateCcw, Play, TriangleAlert } from "lucide-react";

import { usePracticeProgress } from "../../hooks/usePracticeProgress";
import type { Confidence, ItemResult, PracticeItem } from "../../types/learning";
import { BOX_INTERVAL_DAYS, MAX_BOX, formatDue, nextProgress, planSession, type SessionPlan } from "../../utils/practiceScheduler";
import { BugCard } from "./BugCard";
import { ChoiceCard } from "./ChoiceCard";
import { OrderCard } from "./OrderCard";
import { PrimaryButton, SecondaryButton } from "./PracticeParts";
import { RecallCard } from "./RecallCard";

/**
 * Runs one practice session for a deck: plan, ask, re-ask misses once, summarise.
 *
 * A Client Component because a session is state from start to finish. It calls no backend
 * function; progress lives in this browser only (usePracticeProgress). The clock and
 * randomness are read only inside event handlers — never during render — so rendering
 * stays pure and the server and client markup always agree.
 *
 * Only the first attempt at an item in a session updates its schedule. The re-ask of a
 * missed item exists to end the session on a correct retrieval, not to earn a longer
 * interval.
 */

type Session = {
  plan: SessionPlan;
  queue: string[];
  position: number;
  results: ItemResult[];
  requeued: string[];
  storageFailed: boolean;
  finishedAt: number | null;
};

export function PracticeSession({
  deckId,
  items,
  sections,
  articleHref,
}: {
  deckId: string;
  items: PracticeItem[];
  sections: { id: string; title: string }[];
  articleHref: string;
}) {
  const { progress, save, reset } = usePracticeProgress(deckId);
  const [session, setSession] = useState<Session | null>(null);

  const byId = new Map(items.map((item) => [item.id, item]));
  const boxes = Array.from({ length: MAX_BOX }, (_, box) => items.filter((item) => progress[item.id]?.box === box + 1).length);
  const unseen = items.filter((item) => !progress[item.id]).length;

  function start() {
    const plan = planSession(items, progress, Date.now(), Math.random);
    setSession({ plan, queue: plan.queue, position: 0, results: [], requeued: [], storageFailed: false, finishedAt: null });
  }

  function handleDone(correct: boolean, confidence: Confidence) {
    if (!session) return;
    const id = session.queue[session.position];
    const firstAttempt = !session.results.some((result) => result.id === id);
    const now = Date.now();

    let storageFailed = session.storageFailed;
    if (firstAttempt) {
      storageFailed = !save({ ...progress, [id]: nextProgress(progress[id], correct, now) }) || storageFailed;
    }

    // A miss comes back once, a few items later, so the session ends on a correct retrieval.
    let queue = session.queue;
    let requeued = session.requeued;
    if (!correct && !requeued.includes(id)) {
      const insertAt = Math.min(session.position + 4, queue.length);
      queue = [...queue.slice(0, insertAt), id, ...queue.slice(insertAt)];
      requeued = [...requeued, id];
    }

    const position = session.position + 1;
    setSession({
      ...session,
      queue,
      requeued,
      position,
      storageFailed,
      results: firstAttempt ? [...session.results, { id, correct, confidence }] : session.results,
      finishedAt: position >= queue.length ? now : null,
    });
  }

  // ── Before a session ──────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Brain aria-hidden="true" className="size-4 text-primary-text" />
          {items.length} items · up to 10 per session
        </p>

        <div className="mt-4">
          <p className="text-xs font-semibold text-foreground-muted">Where your items are</p>
          <ol className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6" aria-label="Items per review box">
            <li className="rounded-md border border-dashed border-border px-2 py-1.5 text-center">
              <p className="font-mono text-base font-semibold text-foreground">{unseen}</p>
              <p className="text-[11px] text-foreground-muted">New</p>
            </li>
            {boxes.map((count, index) => (
              <li key={index} className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-center">
                <p className="font-mono text-base font-semibold text-foreground">{count}</p>
                <p className="text-[11px] text-foreground-muted">
                  Box {index + 1}
                  <span className="sr-only">
                    {index === 0 ? ", due next session" : `, reviewed every ${BOX_INTERVAL_DAYS[index]} days`}
                  </span>
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-foreground-muted">
            Right answers move an item one box to the right and further into the future. A miss
            sends it back to box 1.
          </p>
        </div>

        {unseen === items.length ? (
          <p className="mt-4 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground">
            Haven&rsquo;t read the article yet? Good — try a session first. Attempting questions
            before reading, even getting them wrong, makes the reading afterwards stick better.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <PrimaryButton onClick={start}>
            <Play aria-hidden="true" className="size-4" />
            Start a session
          </PrimaryButton>
          {unseen < items.length ? (
            <SecondaryButton onClick={reset}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset progress
            </SecondaryButton>
          ) : null}
        </div>
      </div>
    );
  }

  // ── After a session ───────────────────────────────────────────────────────────────────
  if (session.finishedAt !== null) {
    const correctCount = session.results.filter((result) => result.correct).length;
    const confidentMisses = session.results.filter((result) => !result.correct && result.confidence === "certain");
    const luckyGuesses = session.results.filter((result) => result.correct && result.confidence === "guess");
    const missed = session.results.filter((result) => !result.correct);
    const finishedAt = session.finishedAt;
    const dueAgainNow = items.filter((item) => progress[item.id] && progress[item.id].dueAt <= finishedAt).length;
    const nextScheduled = Math.min(
      ...items.map((item) => progress[item.id]?.dueAt).filter((dueAt): dueAt is number => dueAt !== undefined && dueAt > finishedAt),
    );
    const sectionFor = (title: string) => sections.find((section) => section.title === title)?.id;

    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-5 sm:p-6" aria-live="polite">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {correctCount} of {session.results.length} on the first try
        </h2>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
            <dt className="text-xs text-foreground-muted">Confident misses</dt>
            <dd className="mt-0.5 font-mono text-lg font-semibold text-foreground">{confidentMisses.length}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
            <dt className="text-xs text-foreground-muted">Right, but guessed</dt>
            <dd className="mt-0.5 font-mono text-lg font-semibold text-foreground">{luckyGuesses.length}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
            <dt className="text-xs text-foreground-muted">Coming back</dt>
            <dd className="mt-0.5 text-sm font-semibold leading-7 text-foreground">
              {dueAgainNow > 0 ? `${dueAgainNow} next session` : null}
              {dueAgainNow > 0 && Number.isFinite(nextScheduled) ? " · " : null}
              {Number.isFinite(nextScheduled) ? `others ${formatDue(nextScheduled, finishedAt)}` : null}
            </dd>
          </div>
        </dl>

        {confidentMisses.length > 0 ? (
          <p className="text-sm text-foreground">
            The confident misses are where to spend your time: those are beliefs you would have
            built on. The guessed-right items will come back sooner than you might like — that
            is deliberate.
          </p>
        ) : null}

        {missed.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-foreground-muted">Reread before your next session</p>
            <ul className="mt-2 space-y-1.5">
              {missed.map((result) => {
                const item = byId.get(result.id)!;
                const anchor = sectionFor(item.revisit);
                return (
                  <li key={result.id} className="text-sm text-foreground">
                    {anchor ? (
                      <Link
                        href={`${articleHref}#${anchor}`}
                        className="underline decoration-border-strong underline-offset-4 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {item.revisit}
                      </Link>
                    ) : (
                      item.revisit
                    )}
                    <span className="text-foreground-muted"> — {item.prompt}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {session.storageFailed ? (
          <p className="flex items-start gap-2 text-xs text-status-warning">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            This browser refused to store progress, so these results will not shape your next session.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={start}>Another session</PrimaryButton>
          <SecondaryButton onClick={() => setSession(null)}>Done</SecondaryButton>
        </div>
      </div>
    );
  }

  // ── During a session ──────────────────────────────────────────────────────────────────
  const item = byId.get(session.queue[session.position])!;
  const order = session.plan.optionOrder[item.id];
  const isRetry = session.results.some((result) => result.id === item.id);
  const cardKey = `${item.id}-${session.position}`;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3 text-xs text-foreground-muted">
          <span>
            Item {session.position + 1} of {session.queue.length}
            {isRetry ? " · second chance" : ""}
            {session.plan.extraRound ? " · extra round (nothing was due)" : ""}
          </span>
          <button
            type="button"
            onClick={() => setSession(null)}
            className="rounded-md px-2 py-1 font-medium hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            End session
          </button>
        </div>
        <div
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={session.queue.length}
          aria-valuenow={session.position}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(session.position / session.queue.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {item.kind === "recall" ? (
          <RecallCard key={cardKey} item={item} onDone={handleDone} />
        ) : item.kind === "choice" ? (
          <ChoiceCard key={cardKey} item={item} order={order} onDone={handleDone} />
        ) : item.kind === "bug" ? (
          <BugCard key={cardKey} item={item} onDone={handleDone} />
        ) : (
          <OrderCard key={cardKey} item={item} order={order} onDone={handleDone} />
        )}
      </div>
    </div>
  );
}
