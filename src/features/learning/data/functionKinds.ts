// # Filename: src/features/learning/data/functionKinds.ts
import type { FunctionKind } from "../types/learning";

/**
 * The six Convex function builders from convex/_generated/server.d.ts: three types, each in
 * two visibilities. Type decides what the function may do; visibility decides who may call
 * it. Every claim here was checked against convex 1.46.0's installed types (hook signatures
 * in react/client.d.ts, context members in server/registration.d.ts, schedulable references
 * in server/scheduler.d.ts) or the official Convex docs listed in the article's sources.
 *
 * "current" examples exist in this repository. "future" examples are not built: actions and
 * scheduled functions are not permitted in the codebase yet.
 */
export const FUNCTION_KINDS: FunctionKind[] = [
  {
    id: "public-query",
    builder: "query",
    type: "query",
    visibility: "public",
    invokedBy:
      "Any client that can reach the deployment: React hooks, the HTTP client, Next.js server helpers, the CLI — and other functions through ctx.runQuery.",
    reactHook: "useQuery",
    database: "Yes, read-only. ctx.db is a GenericDatabaseReader; it has no write methods.",
    externalApi: "No. A query must be deterministic so Convex can rerun it and cache it.",
    transaction: "All reads happen at one logical timestamp. Concurrent writes do not affect the result.",
    ctxHighlights: ["ctx.auth", "ctx.db (reader)", "ctx.storage (reader)", "ctx.runQuery", "ctx.meta"],
    returns:
      "Through useQuery, a subscription: the first result, then a new result every time a write changes what the query read.",
    example: {
      status: "current",
      text: "api.patients.getMyDemoPatient — takes no arguments; reads the caller's subject from the verified token and scopes the index range to it.",
      path: "convex/patients.ts",
    },
    flow: ["React useQuery", "public query", "authenticate", "authorize", "read database", "subscribed result"],
  },
  {
    id: "public-mutation",
    builder: "mutation",
    type: "mutation",
    visibility: "public",
    invokedBy: "Any client that can reach the deployment, and other mutations or actions through ctx.runMutation, plus the scheduler.",
    reactHook: "useMutation",
    database: "Yes, read and write. ctx.db is a GenericDatabaseWriter.",
    externalApi: "No. Mutations must be deterministic and cannot call third-party APIs.",
    transaction:
      "The whole handler is one transaction. Every write commits together; if the handler throws, nothing is written.",
    ctxHighlights: [
      "ctx.auth",
      "ctx.db (writer)",
      "ctx.storage (writer)",
      "ctx.scheduler",
      "ctx.runQuery",
      "ctx.runMutation",
      "ctx.meta",
    ],
    returns:
      "Once, to the caller only. Other tabs learn about the write through their own query subscriptions, never through this value.",
    example: {
      status: "current",
      text: "api.measurements.recordSyntheticHeartRate — authorizes the patient, bounds the value, inserts one row. The component discards the return value on purpose.",
      path: "convex/measurements.ts",
    },
    flow: ["React useMutation", "public mutation", "authenticate", "authorize", "transactional write", "return once"],
  },
  {
    id: "public-action",
    builder: "action",
    type: "action",
    visibility: "public",
    invokedBy:
      "Any client that can reach the deployment, other actions through ctx.runAction, and the scheduler. Convex's docs call a direct client-to-action call an anti-pattern in most cases.",
    reactHook: "useAction",
    database: "No direct access. ActionCtx has no db; it reads through ctx.runQuery and writes through ctx.runMutation.",
    externalApi: "Yes. This is the only function type that may call fetch or an external SDK.",
    transaction:
      "None. Each runQuery and runMutation is its own transaction, and Convex does not retry an action automatically, because it may already have had side effects.",
    ctxHighlights: [
      "ctx.auth",
      "ctx.runQuery",
      "ctx.runMutation",
      "ctx.runAction",
      "ctx.scheduler",
      "ctx.storage (action writer)",
      "ctx.vectorSearch",
      "ctx.meta",
    ],
    returns: "Once, to the caller. Not reactive: useAction returns a promise, not a subscription.",
    example: {
      status: "future",
      text: "Phase 11's clinician summary would call an approved model. Not built — actions are not permitted in this codebase yet.",
      path: "docs/concepts/convex-llm-action-security.md",
    },
    flow: ["React useAction", "public action", "authenticate", "authorize via runQuery", "external call", "internal mutation", "return once"],
  },
  {
    id: "internal-query",
    builder: "internalQuery",
    type: "query",
    visibility: "internal",
    invokedBy:
      "Other Convex functions through ctx.runQuery, the dashboard, and the CLI. Not the scheduler or crons: they accept only mutations and actions.",
    reactHook: null,
    database: "Yes, read-only — the same capabilities as a public query.",
    externalApi: "No. Still a query; still deterministic.",
    transaction:
      "Called from a query or mutation: inside the caller's snapshot or transaction. Called from an action: its own read transaction.",
    ctxHighlights: ["ctx.auth", "ctx.db (reader)", "ctx.storage (reader)", "ctx.runQuery", "ctx.meta"],
    returns: "Once, to the calling function.",
    example: {
      status: "future",
      text: "Phase 11 retrieval: return the minimum measurements needed for one authorized patient, called by the summary action.",
      path: "docs/concepts/convex-llm-action-security.md",
    },
    flow: ["backend caller", "ctx.runQuery(internal.…)", "internal query", "read database", "return to caller"],
  },
  {
    id: "internal-mutation",
    builder: "internalMutation",
    type: "mutation",
    visibility: "internal",
    invokedBy: "Other Convex functions through ctx.runMutation, the scheduler, crons, the dashboard, and the CLI.",
    reactHook: null,
    database: "Yes, read and write — the same capabilities as a public mutation.",
    externalApi: "No. Still a mutation; still deterministic.",
    transaction:
      "One transaction. From a mutation it is a sub-transaction of the caller; from an action, a separate transaction.",
    ctxHighlights: [
      "ctx.auth",
      "ctx.db (writer)",
      "ctx.storage (writer)",
      "ctx.scheduler",
      "ctx.runQuery",
      "ctx.runMutation",
      "ctx.meta",
    ],
    returns: "Once, to the calling function or the CLI.",
    example: {
      status: "current",
      text: "internal.migrations.deleteUnownedPatients — the Phase 4 migration step, run from the CLI. No browser could ever reach it.",
      path: "convex/migrations.ts",
    },
    flow: ["backend caller or CLI", "ctx.runMutation(internal.…)", "internal mutation", "transactional write", "return to caller"],
  },
  {
    id: "internal-action",
    builder: "internalAction",
    type: "action",
    visibility: "internal",
    invokedBy: "Other actions through ctx.runAction, the scheduler, crons, the dashboard, and the CLI.",
    reactHook: null,
    database: "No direct access — the same as a public action. runQuery and runMutation only.",
    externalApi: "Yes.",
    transaction: "None. Each runQuery and runMutation is its own transaction. Not retried automatically.",
    ctxHighlights: [
      "ctx.auth",
      "ctx.runQuery",
      "ctx.runMutation",
      "ctx.runAction",
      "ctx.scheduler",
      "ctx.storage (action writer)",
      "ctx.vectorSearch",
      "ctx.meta",
    ],
    returns: "Once, to the calling function; nothing when started by the scheduler.",
    example: {
      status: "future",
      text: "The pattern Convex's docs recommend for client-initiated side effects: a public mutation records the request and schedules this internal action.",
    },
    flow: ["public mutation records intent", "ctx.scheduler.runAfter", "internal action", "external call", "internal mutation stores result"],
  },
];
