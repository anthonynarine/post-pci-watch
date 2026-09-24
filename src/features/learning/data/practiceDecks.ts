// # Filename: src/features/learning/data/practiceDecks.ts
import type { PracticeItem } from "../types/learning";
import { REQUEST_PIPELINE_PRACTICE } from "./requestPipelinePractice";

/**
 * Practice decks by article slug. An article without an entry simply has no practice page:
 * the practice route generates params only for slugs listed here. The slug also names the
 * learner's stored progress, so it must stay as stable as the article URL.
 */
export const PRACTICE_DECKS: Record<string, PracticeItem[]> = {
  "next-clerk-convex-request-pipeline": REQUEST_PIPELINE_PRACTICE,
};
