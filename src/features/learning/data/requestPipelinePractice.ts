// # Filename: src/features/learning/data/requestPipelinePractice.ts
import type { PracticeItem } from "../types/learning";

/**
 * The practice deck for Article 01. Every fact here is one the article already verified
 * against convex 1.46.0, @clerk/nextjs 7.9.4, next 16.3.5, and convex/_generated/ai/
 * guidelines.md; nothing new is claimed. Code in bug items is written to teach and is marked
 * as such on screen — it is not in this repository.
 *
 * Wrong choices carry their own explanation because feedback on the specific mistake is
 * worth more than being told the right answer. Item ids are permanent: progress is stored
 * against them in the learner's browser.
 */
export const REQUEST_PIPELINE_PRACTICE: PracticeItem[] = [
  // ── Recall: produce the answer before seeing it ─────────────────────────────────────
  {
    id: "rp-recall-authn-authz",
    kind: "recall",
    topic: "identity",
    prompt: "What is the difference between authentication and authorization, and which system does each in this app?",
    modelAnswer:
      "Authentication answers who is calling: Clerk signs a JWT for the session and Convex verifies it, after which ctx.auth.getUserIdentity() returns the identity. Authorization answers whether this caller may do this to this record, and it is our code — requireOwnedPatient comparing the patient's ownerSubject with the verified subject.",
    keyPoints: [
      "Authentication = who is calling",
      "Clerk signs the token; Convex verifies it",
      "Authorization = may this caller act on this record",
      "Authorization is our code inside the Convex function",
    ],
    revisit: "Authentication versus authorization",
  },
  {
    id: "rp-recall-internal-react",
    kind: "recall",
    topic: "functions",
    prompt: "Why can React not call an internal function? Give both layers that stop it.",
    modelAnswer:
      "At compile time the hooks accept FunctionReference<type>, whose visibility defaults to \"public\", and the internal object is typed \"internal\" — so it does not type-check. At runtime api and internal are the same proxy, so types alone prove nothing to a hostile client; the deployment itself refuses client calls to internal functions.",
    keyPoints: [
      "The hooks are typed to accept public references only",
      "api and internal are the same object at runtime",
      "The deployment refuses client calls to internal functions",
    ],
    revisit: "The generated API object",
  },
  {
    id: "rp-recall-action-db",
    kind: "recall",
    topic: "ctx",
    prompt: "Why does an action have no ctx.db, and how does it read or write data instead?",
    modelAnswer:
      "An action is not a transaction and may already have had side effects — a paid API call cannot be rolled back or safely retried. A database handle only makes sense inside a transaction, so the action hands database work to ctx.runQuery and ctx.runMutation, each of which runs as its own transaction.",
    keyPoints: [
      "An action is not a transaction",
      "Its side effects cannot be rolled back or safely retried",
      "Reads through ctx.runQuery, writes through ctx.runMutation",
      "Each of those is a separate transaction",
    ],
    revisit: "ctx as a capability object",
  },
  {
    id: "rp-recall-rerun",
    kind: "recall",
    topic: "reactivity",
    prompt: "What exactly causes a subscribed query to rerun?",
    modelAnswer:
      "When the query ran, Convex recorded what it read — its read set, e.g. one index range for one patient. When a mutation commits a write that overlaps that read set, Convex reruns the query on the server and pushes the new result to every subscriber if it changed. Writes that do not overlap rerun nothing.",
    keyPoints: [
      "Convex records the query's read set",
      "A committed write that overlaps the read set triggers it",
      "The query reruns on the server, not the client",
      "The new result is pushed to every subscriber",
    ],
    revisit: "Why React rerenders",
  },
  {
    id: "rp-recall-other-tabs",
    kind: "recall",
    topic: "reactivity",
    prompt: "A clinician records a heart rate in tab A. Why does tab B update, if the mutation's return value is not broadcast?",
    modelAnswer:
      "The return value goes only to the caller, tab A. Tab B has its own subscription to listRecentForPatient; the insert falls inside the index range that query read, so Convex reruns it and pushes the new result to tab B. The mutation changed the truth; the subscription distributed it.",
    keyPoints: [
      "The mutation's return value reaches only the caller",
      "Tab B has its own query subscription",
      "The write overlaps that subscription's reads, so it reruns and pushes",
    ],
    revisit: "Public function types",
  },
  {
    id: "rp-recall-dashboard",
    kind: "recall",
    topic: "boundary",
    prompt: "/dashboard calls auth.protect(). Why does that not protect the Convex data?",
    modelAnswer:
      "auth.protect() runs on the Next.js server and decides whether that page renders. Convex is a separate server with a public URL that the browser connects to directly; anyone can call any public function without loading /dashboard. Only the checks inside the Convex functions protect the data.",
    keyPoints: [
      "auth.protect() gates a page on the Next.js server",
      "Convex has its own public URL",
      "Any client can call public functions directly",
      "Only checks inside Convex functions protect data",
    ],
    revisit: "Server and Client Components",
  },
  {
    id: "rp-recall-token-path",
    kind: "recall",
    topic: "identity",
    prompt: "Trace the Clerk token from the session to the moment a Convex function can read the identity.",
    modelAnswer:
      "The provider's fetchAccessToken asks Clerk for a JWT (here, from the convex template). The ConvexReactClient sends it on the WebSocket as an Authenticate message — once per connection and on refresh, not per call. Convex verifies its signature and audience against the issuer in auth.config.ts, and only then does ctx.auth.getUserIdentity() return anything.",
    keyPoints: [
      "Clerk mints a JWT for the session",
      "The token is sent on the connection, not with each call",
      "Convex verifies it against the issuer in auth.config.ts",
      "Only then does getUserIdentity() return an identity",
    ],
    revisit: "End-to-end request pipeline",
  },

  // ── Choice: tell similar things apart ─────────────────────────────────────────────────
  {
    id: "rp-choice-stripe",
    kind: "choice",
    topic: "functions",
    prompt:
      "After a clinician confirms, the app must charge a card through an external payment API. What should the browser call first, according to Convex's docs?",
    options: [
      {
        label: "A public mutation that records the request and schedules an internalAction",
        correct: true,
        why: "This is the documented pattern: the intent is durable and visible to subscriptions before any side effect, and the external call happens in an action no client can reach.",
      },
      {
        label: "A public action, via useAction, that calls the payment API",
        correct: false,
        why: "It works, but Convex's docs call a direct client-to-action call an anti-pattern in most cases: nothing durable records the intent, and a closed tab loses it.",
      },
      {
        label: "A public mutation that calls the payment API with fetch",
        correct: false,
        why: "Mutations must be deterministic and cannot call third-party APIs. Only actions may.",
      },
      {
        label: "An internalAction, via useAction",
        correct: false,
        why: "No client can call an internal function — useAction will not even accept the reference.",
      },
    ],
    revisit: "Public function types",
  },
  {
    id: "rp-choice-live-list",
    kind: "choice",
    topic: "functions",
    prompt: "Show the signed-in clinician's recent measurements, updating live. Which function and hook?",
    options: [
      {
        label: "A public query, read with useQuery",
        correct: true,
        why: "Read-only, deterministic, and subscribed: it reruns whenever a write overlaps what it read.",
      },
      {
        label: "A public action, read with useAction",
        correct: false,
        why: "An action returns once and never updates, has no ctx.db, and adds a transaction boundary per read.",
      },
      {
        label: "fetchQuery in the Server Component",
        correct: false,
        why: "fetchQuery is non-reactive: one answer at render time, stale immediately afterwards.",
      },
      {
        label: "An internalQuery, read with useQuery",
        correct: false,
        why: "Internal functions are not callable from any client.",
      },
    ],
    revisit: "Public function types",
  },
  {
    id: "rp-choice-migration",
    kind: "choice",
    topic: "functions",
    prompt: "A one-off cleanup deletes orphaned rows and is run by a developer from the CLI. Which builder?",
    options: [
      {
        label: "internalMutation",
        correct: true,
        why: "It writes, so it is a mutation; nobody outside should ever trigger it, so it is internal. Phase 4's deleteUnownedPatients is exactly this.",
      },
      {
        label: "mutation",
        correct: false,
        why: "Public means any client on the internet can call it. A destructive maintenance job must not be reachable from a browser.",
      },
      {
        label: "internalAction",
        correct: false,
        why: "An action has no ctx.db and is not a transaction; a delete belongs in a mutation.",
      },
      {
        label: "internalQuery",
        correct: false,
        why: "A query's ctx.db is a reader. It cannot delete.",
      },
    ],
    revisit: "Internal functions",
  },
  {
    id: "rp-choice-scheduler",
    kind: "choice",
    topic: "ctx",
    prompt: "In convex 1.46.0, which context types have ctx.scheduler?",
    options: [
      {
        label: "MutationCtx and ActionCtx",
        correct: true,
        why: "Scheduling is a write-side effect. GenericQueryCtx declares no scheduler member.",
      },
      {
        label: "All three",
        correct: false,
        why: "QueryCtx has no scheduler. A query must be free of side effects so it can be rerun at will.",
      },
      {
        label: "ActionCtx only",
        correct: false,
        why: "MutationCtx has it too — scheduling from a mutation is how intent becomes a durable job.",
      },
      {
        label: "None — scheduling is configured in crons.ts only",
        correct: false,
        why: "Crons are one way to schedule. ctx.scheduler.runAfter / runAt schedule from inside mutations and actions.",
      },
    ],
    revisit: "ctx as a capability object",
  },
  {
    id: "rp-choice-query-runquery",
    kind: "choice",
    topic: "ctx",
    prompt: "In convex 1.46.0, can a query call ctx.runQuery?",
    options: [
      {
        label: "Yes, and it runs within the same read snapshot",
        correct: true,
        why: "GenericQueryCtx declares runQuery; its doc comment says the called query runs within the same read snapshot. A plain helper is usually still better.",
      },
      {
        label: "No — only actions have runQuery",
        correct: false,
        why: "True of older Convex and of most published material. Not of the installed version — which is why capabilities are read from the types, not memory.",
      },
      {
        label: "Yes, as a separate transaction",
        correct: false,
        why: "That is runQuery's behaviour inside an action. Inside a query it shares the caller's snapshot.",
      },
      {
        label: "Only for internal queries",
        correct: false,
        why: "runQuery accepts public or internal references in every context that has it.",
      },
    ],
    revisit: "ctx as a capability object",
  },
  {
    id: "rp-choice-schedule-query",
    kind: "choice",
    topic: "functions",
    prompt: "Can ctx.scheduler.runAfter schedule an internalQuery?",
    options: [
      {
        label: "No — the scheduler accepts only mutations and actions",
        correct: true,
        why: "SchedulableFunctionReference is FunctionReference<\"mutation\" | \"action\">. A scheduled query would compute a result nobody receives.",
      },
      {
        label: "Yes, any internal function",
        correct: false,
        why: "Internal is about who may call a function, not what the scheduler accepts. Queries are excluded by type.",
      },
      {
        label: "Only from an action",
        correct: false,
        why: "The restriction is on what is scheduled, not where it is scheduled from.",
      },
    ],
    revisit: "Internal functions",
  },
  {
    id: "rp-choice-promise",
    kind: "choice",
    topic: "reactivity",
    prompt: "In the installed Convex client, when does a successful useMutation promise resolve?",
    options: [
      {
        label: "After the client has applied a query transition at or past the mutation's commit timestamp",
        correct: true,
        why: "The client parks the response and resolves it in removeCompleted() during a Transition. Read from the 1.46.0 source — it is not a documented contract.",
      },
      {
        label: "As soon as the mutation response arrives",
        correct: false,
        why: "That is what happens to a failed mutation, or an action. A successful mutation's result is held until the queries have caught up.",
      },
      {
        label: "After every subscribed tab has updated",
        correct: false,
        why: "Each client only knows about itself. Resolution depends on this tab's query state, never on other tabs.",
      },
    ],
    revisit: "Why React rerenders",
  },
  {
    id: "rp-choice-client-args",
    kind: "choice",
    topic: "boundary",
    prompt: "Which of these may the browser safely send as a function argument?",
    options: [
      {
        label: "patientId",
        correct: true,
        why: "It names a record. The server checks it against the verified identity before using it, so a lie gets \"Patient not found\".",
      },
      {
        label: "ownerSubject",
        correct: false,
        why: "That is the identity input to the authorization decision. Accept it from the browser and the browser makes the decision. Identity comes only from ctx.auth.",
      },
      {
        label: "role: \"clinician\"",
        correct: false,
        why: "A role is authorization state. A browser can claim any role it likes.",
      },
      {
        label: "reviewStatus: \"reviewed\"",
        correct: false,
        why: "Approval state is decided by server code — the Phase 11 design forces AI output to \"draft\" for exactly this reason.",
      },
    ],
    revisit: "The security boundary",
  },

  // ── Bug hunt: apply the rule to code you have not seen ────────────────────────────────
  {
    id: "rp-bug-owner-arg",
    kind: "bug",
    topic: "boundary",
    prompt: "This mutation authorizes before writing, and still lets anyone write to anyone's patient. Which line is the flaw?",
    path: "convex/notes.ts — teaching example, not in this repo",
    lines: [
      "export const addNote = mutation({",
      "  args: { patientId: v.id(\"patients\"), ownerSubject: v.string(), text: v.string() },",
      "  handler: async (ctx, args) => {",
      "    const patient = await ctx.db.get(\"patients\", args.patientId);",
      "    if (patient?.ownerSubject !== args.ownerSubject) throw new Error(\"Patient not found\");",
      "    await ctx.db.insert(\"notes\", { patientId: args.patientId, text: args.text });",
      "  },",
      "});",
    ],
    faultyLine: 4,
    explanation:
      "The ownership check compares against args.ownerSubject — an identity the caller typed. Any caller can pass the victim's subject and pass the check. The comparison must use the subject from ctx.auth.getUserIdentity(); in this repo that is requireOwnedPatient. (Line 2 is where the bad input enters; line 5 is where it is trusted.)",
    revisit: "Authentication versus authorization",
  },
  {
    id: "rp-bug-action-db",
    kind: "bug",
    topic: "ctx",
    prompt: "This action will not compile. Which line?",
    path: "convex/summaries.ts — teaching example, not in this repo",
    lines: [
      "export const summarize = action({",
      "  args: { patientId: v.id(\"patients\") },",
      "  handler: async (ctx, args) => {",
      "    const rows = await ctx.db.query(\"measurements\").take(50);",
      "    const summary = await callApprovedModel(rows);",
      "    await ctx.runMutation(internal.summaries.storeDraft, { patientId: args.patientId, summary });",
      "  },",
      "});",
    ],
    faultyLine: 3,
    explanation:
      "ActionCtx has no db member. Read through ctx.runQuery(internal.…), which runs as its own transaction — and authorize the patient there before anything is read. Line 6 is correct: writes go through runMutation.",
    revisit: "ctx as a capability object",
  },
  {
    id: "rp-bug-query-clock",
    kind: "bug",
    topic: "reactivity",
    prompt: "This query returns the last hour of readings and is subscribed with useQuery. It quietly shows wrong data later. Which line?",
    path: "convex/measurements.ts — teaching example, not in this repo",
    lines: [
      "export const lastHour = query({",
      "  args: { patientId: v.id(\"patients\") },",
      "  handler: async (ctx, args) => {",
      "    await requireOwnedPatient(ctx, args.patientId);",
      "    const since = Date.now() - 60 * 60 * 1000;",
      "    return await ctx.db.query(\"measurements\")",
      "      .withIndex(\"by_patientId_and_observedAt\", (q) => q.eq(\"patientId\", args.patientId).gt(\"observedAt\", since))",
      "      .take(100);",
      "  },",
      "});",
    ],
    faultyLine: 4,
    explanation:
      "A query reruns when data it read changes — not when time passes. The window computed from Date.now() stays frozen, so old readings linger as \"last hour\". Convex's guidelines: pass the current time in as an argument and let the client refresh it. Date.now() is fine in mutations and actions.",
    revisit: "Public function types",
  },
  {
    id: "rp-bug-internal-hook",
    kind: "bug",
    topic: "functions",
    prompt: "Which line in this Client Component cannot work?",
    path: "src/features/monitoring/components/Example.tsx — teaching example, not in this repo",
    lines: [
      "\"use client\";",
      "export function PatientPanel({ patientId }: { patientId: Id<\"patients\"> }) {",
      "  const patient = useQuery(api.patients.getMyDemoPatient, {});",
      "  const context = useQuery(internal.summaries.retrieveContext, { patientId });",
      "  return <Summary patient={patient} context={context} />;",
      "}",
    ],
    faultyLine: 3,
    explanation:
      "internal.* is not callable from any client. useQuery's type rejects it at compile time, and the deployment refuses it at runtime. Line 3 is fine: a public query with the caller's identity on the connection.",
    revisit: "Internal functions",
  },

  // ── Order: rebuild the causal chain ───────────────────────────────────────────────────
  {
    id: "rp-order-read",
    kind: "order",
    topic: "identity",
    prompt: "Put the read path in order, from sign-in to rendered rows.",
    steps: [
      "Clerk mints a JWT for the session",
      "The client sends the token on the WebSocket connection",
      "Convex verifies the token against auth.config.ts",
      "useQuery subscribes to a public query",
      "The handler reads ctx.auth.getUserIdentity()",
      "requireOwnedPatient authorizes the patient",
      "ctx.db reads the index range; Convex records the read set",
      "The result is pushed and useQuery returns it",
    ],
    explanation:
      "Identity is established on the connection before any query is opened — which is why the workspace skips its queries until Convex reports the connection authenticated. Authorization comes before the read, never after it.",
    revisit: "End-to-end request pipeline",
  },
  {
    id: "rp-order-write",
    kind: "order",
    topic: "reactivity",
    prompt: "Put the Phase 5 write in order, from click to rerender.",
    steps: [
      "useMutation sends { patientId, value } over the socket",
      "requireOwnedPatient authenticates and authorizes",
      "ctx.db.insert commits the transaction",
      "The caller's response arrives and is parked",
      "The overlapping query reruns on the server",
      "A transition is pushed to every subscriber",
      "The client applies the transition, then resolves the promise",
    ],
    explanation:
      "Two return paths: the response goes to the caller only and is held; the transition goes to every subscriber. In the installed client the promise resolves after the transition is applied, so the awaiting code already sees updated queries.",
    revisit: "Why React rerenders",
  },
];
