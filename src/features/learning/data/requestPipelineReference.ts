// # Filename: src/features/learning/data/requestPipelineReference.ts
import type { MasteryQuestion, Source } from "../types/learning";

/**
 * The closing material for Article 01: the mastery questions with their reference answers,
 * and the primary sources every claim in the article was checked against. Kept apart from
 * the prose so a reviewer can audit the facts without reading layout code.
 *
 * Reading these answers does not close any roadmap phase. Phase mastery checks are answered
 * in the learner's own words and recorded in docs/PHASE_LOG.md.
 */

export const REQUEST_PIPELINE_MASTERY: MasteryQuestion[] = [
  {
    question: "What is the difference between authentication and authorization?",
    answer:
      "Authentication establishes who is calling: Clerk signs a token, Convex verifies it, and ctx.auth.getUserIdentity() returns the identity. Authorization decides whether that caller may perform this operation on this record, and it is our code — requireOwnedPatient comparing the patient's ownerSubject to the verified subject.",
    revisit: "Authentication versus authorization",
  },
  {
    question: "Why can React not call an internal function?",
    answer:
      "Twice over. At compile time, the React hooks accept FunctionReference<\"query\"> and friends, whose visibility defaults to \"public\", and the generated internal object is typed with visibility \"internal\", so passing one does not type-check. At runtime, the deployment refuses client calls to internal functions regardless of what the browser sends — which is the part that matters, because a browser can send anything.",
    revisit: "The generated API object",
  },
  {
    question: "Why does an action lack direct ctx.db access?",
    answer:
      "An action is not a transaction and may have side effects that cannot be undone or safely repeated, such as a paid API call. Database work needs transactional guarantees, so the action has to hand it to a query or mutation through ctx.runQuery or ctx.runMutation, each of which runs as its own transaction.",
    revisit: "ctx as a capability object",
  },
  {
    question: "What causes a subscribed query to rerun?",
    answer:
      "A committed write that overlaps what the query read. Convex records each query execution's read set — for listRecentForPatient, an index range for one patient — and when a mutation writes inside that range, Convex reruns the query on the server and pushes the new result if it changed.",
    revisit: "Why React rerenders",
  },
  {
    question: "Why does a mutation result not update every browser tab?",
    answer:
      "The mutation's return value is sent only to the client that called it. Other tabs never called it, so they have no promise to resolve. They receive the change because their own subscriptions read the data the mutation wrote. The mutation changes backend truth; the subscriptions distribute it.",
    revisit: "Public function types",
  },
  {
    question: "What role does the generated api object play?",
    answer:
      "It is a typed reference, not an implementation. At runtime api is a proxy that turns api.patients.getMyDemoPatient into the name \"patients:getMyDemoPatient\". At compile time it carries each function's argument and return types from convex/, so a wrong argument is a type error in the React component. The logic stays in convex/patients.ts and runs only on the deployment.",
    revisit: "The generated API object",
  },
  {
    question: "Why does protecting /dashboard not protect Convex by itself?",
    answer:
      "auth.protect() runs on the Next.js server and decides whether that route renders. Convex is a separate server with a public URL. Anyone can open a WebSocket to it and call any public function directly, without ever loading /dashboard. Only checks inside the Convex functions protect the data.",
    revisit: "Server and Client Components",
  },
  {
    question: "Which layer determines whether a clinician may access a patient?",
    answer:
      "The Convex function, through our authorization code. Not Clerk, which only proves identity; not the Next.js route, which only gates a page; not React, which runs on a machine the user controls.",
    revisit: "The security boundary",
  },
];

export const REQUEST_PIPELINE_SOURCES: Source[] = [
  {
    label: "Convex context interfaces (installed)",
    href: "node_modules/convex/dist/esm-types/server/registration.d.ts",
    verifies:
      "Every row of the ctx table: GenericQueryCtx, GenericMutationCtx, GenericActionCtx, and the doc comments on runQuery and runMutation.",
  },
  {
    label: "Generated server builders (this project)",
    href: "convex/_generated/server.d.ts",
    verifies: "The six builders, each typed with a visibility of \"public\" or \"internal\", and the QueryCtx / MutationCtx / ActionCtx aliases.",
  },
  {
    label: "Generated API references (this project)",
    href: "convex/_generated/api.d.ts",
    verifies: "api is filtered to FunctionReference<any, \"public\">, internal to FunctionReference<any, \"internal\">; api.js exports both as the same anyApi proxy.",
  },
  {
    label: "FunctionReference and React hook signatures (installed)",
    href: "node_modules/convex/dist/esm-types/react/client.d.ts",
    verifies: "useQuery, useMutation, and useAction accept FunctionReference<type>, whose Visibility parameter defaults to \"public\" (server/api.d.ts).",
  },
  {
    label: "Scheduler and cron types (installed)",
    href: "node_modules/convex/dist/esm-types/server/scheduler.d.ts",
    verifies: "SchedulableFunctionReference is mutation or action only; a query cannot be scheduled.",
  },
  {
    label: "Sync protocol and client (installed)",
    href: "node_modules/convex/dist/esm/browser/sync/",
    verifies:
      "The Authenticate message carries the user token on the connection. A successful mutation's promise resolves only once a query Transition at or past its commit timestamp has been applied; a failed one settles immediately.",
  },
  {
    label: "Convex — Internal Functions",
    href: "https://docs.convex.dev/functions/internal-functions",
    verifies: "Internal functions can only be called by other functions and cannot be called directly from a Convex client.",
  },
  {
    label: "Convex — Actions",
    href: "https://docs.convex.dev/functions/actions",
    verifies:
      "No ctx.db; runQuery and runMutation run in separate transactions; auth propagates to them; actions are not retried automatically; client-to-action calls are usually an anti-pattern.",
  },
  {
    label: "Convex — Mutations and Queries",
    href: "https://docs.convex.dev/functions/mutation-functions",
    verifies: "Mutations are transactional and deterministic and cannot call third-party APIs; queries read at one logical timestamp.",
  },
  {
    label: "Convex — Auth in Functions",
    href: "https://docs.convex.dev/auth/functions-auth",
    verifies: "getUserIdentity() returns tokenIdentifier, subject, and issuer, or null; authorization is implemented in your functions.",
  },
  {
    label: "Convex — Convex & Clerk",
    href: "https://docs.convex.dev/auth/clerk",
    verifies: "The provider fetches Clerk's token, the client sends it over the WebSocket, and the backend checks its signature using Clerk's public key.",
  },
  {
    label: "Clerk — Integrate Convex with Clerk",
    href: "https://clerk.com/docs/integrations/databases/convex",
    verifies: "The Convex integration and the aud claim Convex requires. This project still uses the older \"convex\" JWT template; its token fetcher accepts either.",
  },
  {
    label: "Convex — Next.js App Router and server rendering",
    href: "https://docs.convex.dev/client/nextjs/app-router/server-rendering",
    verifies: "Reactivity needs Client Components; fetchQuery is non-reactive; preloadQuery hands off to usePreloadedQuery; server calls pass { token } explicitly.",
  },
  {
    label: "Next.js 16 — Server and Client Components (installed docs)",
    href: "node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md",
    verifies: "\"use client\" declares a boundary; its imports and directly rendered components join the client bundle.",
  },
];
