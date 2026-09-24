// # Filename: src/features/learning/data/ctxCapabilities.ts
import type { CtxCapability } from "../types/learning";

/**
 * Transcribed from GenericQueryCtx, GenericMutationCtx, and GenericActionCtx in
 * node_modules/convex/dist/esm-types/server/registration.d.ts, convex 1.46.0, which
 * convex/_generated/server.d.ts aliases as QueryCtx, MutationCtx, and ActionCtx.
 *
 * A member appears under a context type only if that interface declares it. Transaction
 * notes are quoted from the doc comments on those same members. Re-check this table on every
 * Convex upgrade — runQuery on QueryCtx and MutationCtx is recent, and older articles and
 * training data will say it does not exist.
 */
export const CTX_CAPABILITIES: CtxCapability[] = [
  {
    member: "ctx.auth",
    query: { detail: "getUserIdentity()" },
    mutation: { detail: "getUserIdentity()" },
    action: { detail: "getUserIdentity()" },
    note: "Identity only. Nothing here says what the caller may access.",
  },
  {
    member: "ctx.db",
    query: { detail: "GenericDatabaseReader — reads only" },
    mutation: { detail: "GenericDatabaseWriter — reads and writes" },
    action: null,
    note: "ActionCtx declares no db member at all.",
  },
  {
    member: "ctx.storage",
    query: { detail: "StorageReader — getUrl" },
    mutation: { detail: "StorageWriter — adds generateUploadUrl, delete" },
    action: { detail: "StorageActionWriter — adds get, store" },
  },
  {
    member: "ctx.scheduler",
    query: null,
    mutation: { detail: "runAfter / runAt a mutation or action" },
    action: { detail: "runAfter / runAt a mutation or action" },
  },
  {
    member: "ctx.runQuery",
    query: { detail: "Runs within the same read snapshot" },
    mutation: { detail: "Runs within the same transaction" },
    action: { detail: "Each call is a separate read transaction" },
  },
  {
    member: "ctx.runMutation",
    query: null,
    mutation: { detail: "Sub-transaction; its writes roll back if it throws" },
    action: { detail: "Each call is a separate write transaction" },
  },
  {
    member: "ctx.runAction",
    query: null,
    mutation: null,
    action: { detail: "Only to cross runtimes; otherwise call a helper" },
  },
  {
    member: "ctx.vectorSearch",
    query: null,
    mutation: null,
    action: { detail: "Search a vector index" },
  },
  {
    member: "ctx.meta",
    query: { detail: "QueryMeta" },
    mutation: { detail: "MutationMeta — adds request metadata" },
    action: { detail: "ActionMeta — no transaction metrics" },
  },
];

export const CTX_COLUMNS = [
  { key: "query", label: "QueryCtx" },
  { key: "mutation", label: "MutationCtx" },
  { key: "action", label: "ActionCtx" },
] as const;
