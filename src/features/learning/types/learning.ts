// # Filename: src/features/learning/types/learning.ts

/**
 * Shapes shared by the teaching library. Article metadata, the data behind each interactive
 * explorer, and the source records that back every technical claim are all plain typed
 * values, so an article's facts can be reviewed without reading its layout code.
 */

/** What the library index and the article header need. No article body lives here. */
export type ArticleMeta = {
  /** Stable display order and label: "Article 01". Never reused. */
  number: number;
  /** URL segment. Stable once published; renaming breaks links. */
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  /** Estimated from the article's word count at roughly 220 words a minute. */
  readingMinutes: number;
  /** YYYY-MM-DD the article was first published in this project. */
  publishedOn: string;
  /** YYYY-MM-DD the claims were last checked against the sources. */
  verifiedOn: string;
  /** Exact installed versions the claims were checked against. */
  verifiedAgainst: string[];
  /** Roadmap phases whose code this article explains. */
  phases: number[];
  topics: string[];
  /** Section anchors in reading order, for the table of contents. */
  sections: { id: string; title: string }[];
};

/** Where a piece of code executes. Every pipeline step belongs to exactly one. */
export type LaneId = "next" | "browser" | "clerk" | "convex";

export type CodeExcerpt = {
  /** Project-relative path, or a node_modules path for library source. */
  path: string;
  code: string;
};

export type PipelineStep = {
  lane: LaneId;
  title: string;
  body: string;
  /** What crosses a machine boundary during this step, if anything does. */
  crosses?: string;
  code?: CodeExcerpt;
  /** The inaccurate simplification this step exists to correct. */
  corrects?: string;
};

export type PipelineScenario = {
  id: string;
  label: string;
  summary: string;
  steps: PipelineStep[];
};

export type FunctionType = "query" | "mutation" | "action";
export type FunctionVisibility = "public" | "internal";

/** One of the six Convex function builders, described for the FunctionTypeExplorer. */
export type FunctionKind = {
  id: string;
  builder: string;
  type: FunctionType;
  visibility: FunctionVisibility;
  invokedBy: string;
  /** The React hook that can call it, or null when no client can. */
  reactHook: string | null;
  database: string;
  externalApi: string;
  transaction: string;
  ctxHighlights: string[];
  returns: string;
  example: {
    /** "current" exists in this repository today; "future" is not built. */
    status: "current" | "future";
    text: string;
    path?: string;
  };
  flow: string[];
};

/** A cell is null when the member does not exist on that context type. */
export type CtxCell = { detail: string } | null;

export type CtxCapability = {
  member: string;
  query: CtxCell;
  mutation: CtxCell;
  action: CtxCell;
  note?: string;
};

export type MasteryQuestion = {
  question: string;
  answer: string;
  /** Section title to reread if the answer did not come easily. */
  revisit: string;
};

export type Source = {
  label: string;
  /** An https URL, or a repository-relative path for installed type definitions. */
  href: string;
  verifies: string;
};

/* ── Practice mode ─────────────────────────────────────────────────────────────────────
 * Each item type exercises a different evidence-based technique: recall (retrieval and
 * generation), choice (discriminating between similar concepts), bug (applying a rule to
 * unfamiliar code), and order (reconstructing a causal sequence). Every item carries a
 * topic so a session can interleave topics instead of blocking them.
 */

export type PracticeTopic = "identity" | "functions" | "ctx" | "reactivity" | "boundary";

type PracticeBase = {
  /** Stable forever: progress is stored against it. Renaming an id resets that item. */
  id: string;
  topic: PracticeTopic;
  prompt: string;
  /** Section title to reread when this item is missed. */
  revisit: string;
};

export type RecallItem = PracticeBase & {
  kind: "recall";
  modelAnswer: string;
  /** The ideas a complete answer contains. The learner ticks the ones they produced. */
  keyPoints: string[];
};

export type ChoiceItem = PracticeBase & {
  kind: "choice";
  options: { label: string; correct: boolean; why: string }[];
};

export type BugItem = PracticeBase & {
  kind: "bug";
  path: string;
  lines: string[];
  /** Zero-based index into `lines`. */
  faultyLine: number;
  explanation: string;
};

export type OrderItem = PracticeBase & {
  kind: "order";
  /** In the correct order. Shuffled only when a session starts, never during render. */
  steps: string[];
  explanation: string;
};

export type PracticeItem = RecallItem | ChoiceItem | BugItem | OrderItem;

export type Confidence = "guess" | "fairly" | "certain";

/** One stored record per item: a Leitner box and when the item is next due. */
export type ItemProgress = { box: number; dueAt: number; seen: number; lapses: number };

export type ItemResult = { id: string; correct: boolean; confidence: Confidence };
