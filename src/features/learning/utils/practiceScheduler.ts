// # Filename: src/features/learning/utils/practiceScheduler.ts
import type { ItemProgress, PracticeItem } from "../types/learning";

/**
 * Pure scheduling logic for practice mode: a five-box Leitner system plus topic
 * interleaving. No React, no storage, no clock or randomness of its own — `now` and `random`
 * are passed in, so every function here is deterministic and can be reasoned about (or
 * tested) in isolation.
 *
 * Why these choices:
 * - Spacing. A correct answer moves an item to a box with a longer interval; a miss sends it
 *   back to box 1. Reviewing just before forgetting is what makes memory durable.
 * - Interleaving. Consecutive items come from different topics where possible, so the
 *   learner has to decide *which* concept applies, not just recall the one being drilled.
 * - Relearning. A missed item is asked again later in the same session, once.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Days until an item in each box is due again. Box 1 means "next session". */
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16] as const;
export const MAX_BOX = BOX_INTERVAL_DAYS.length;

export function nextProgress(previous: ItemProgress | undefined, correct: boolean, now: number): ItemProgress {
  // A new item answered correctly skips box 1: it was already known.
  const box = correct ? Math.min((previous?.box ?? 1) + 1, MAX_BOX) : 1;

  return {
    box,
    dueAt: now + BOX_INTERVAL_DAYS[box - 1] * DAY,
    seen: (previous?.seen ?? 0) + 1,
    lapses: (previous?.lapses ?? 0) + (correct ? 0 : 1),
  };
}

export function isDue(progress: ItemProgress | undefined, now: number): boolean {
  return progress === undefined || progress.dueAt <= now;
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Round-robin across topics, starting each round with whichever topic still has the most
 * items, so no topic runs twice in a row unless it is the only one left.
 */
function interleaveByTopic(items: PracticeItem[]): PracticeItem[] {
  const buckets = new Map<string, PracticeItem[]>();
  for (const item of items) buckets.set(item.topic, [...(buckets.get(item.topic) ?? []), item]);

  const result: PracticeItem[] = [];
  let lastTopic: string | null = null;

  while (result.length < items.length) {
    const candidates = [...buckets.entries()]
      .filter(([, bucket]) => bucket.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
    const [topic, bucket] = candidates.find(([candidate]) => candidate !== lastTopic) ?? candidates[0];
    result.push(bucket.shift()!);
    lastTopic = topic;
  }

  return result;
}

export type SessionPlan = {
  /** Item ids in the order they will be asked. */
  queue: string[];
  /** Per-item display orders, fixed for the whole session. */
  optionOrder: Record<string, number[]>;
  /** True when nothing was due and this is an extra round of the soonest-due items. */
  extraRound: boolean;
};

/**
 * Builds one session: due items first (overdue before new), capped, shuffled, then
 * interleaved by topic. When nothing is due, returns an extra round of the items due
 * soonest, so the learner is never told to go away.
 */
export function planSession(
  items: PracticeItem[],
  progress: Record<string, ItemProgress>,
  now: number,
  random: () => number,
  size = 10,
): SessionPlan {
  const due = items.filter((item) => isDue(progress[item.id], now));
  const extraRound = due.length === 0;

  const pool = extraRound
    ? [...items].sort((a, b) => (progress[a.id]?.dueAt ?? 0) - (progress[b.id]?.dueAt ?? 0))
    : [
        ...shuffle(due.filter((item) => progress[item.id]), random).sort(
          (a, b) => progress[a.id].dueAt - progress[b.id].dueAt,
        ),
        ...shuffle(due.filter((item) => !progress[item.id]), random),
      ];

  const chosen = interleaveByTopic(shuffle(pool.slice(0, size), random));

  const optionOrder: Record<string, number[]> = {};
  for (const item of chosen) {
    const count = item.kind === "choice" ? item.options.length : item.kind === "order" ? item.steps.length : 0;
    if (count > 0) optionOrder[item.id] = shuffle([...Array(count).keys()], random);
  }

  return { queue: chosen.map((item) => item.id), optionOrder, extraRound };
}

export function formatDue(dueAt: number, now: number): string {
  const days = Math.ceil((dueAt - now) / DAY);
  if (days <= 0) return "now";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
