// # Filename: src/features/learning/data/requestPipelineScenarios.ts
import type { PipelineScenario } from "../types/learning";

/**
 * Three runs through the same architecture, each traced against code in this repository.
 * Excerpts are copied from the files they name; if one of those files changes, the excerpt
 * here is now wrong and must be updated with it.
 */
export const REQUEST_PIPELINE_SCENARIOS: PipelineScenario[] = [
  {
    id: "subscribe",
    label: "Open the dashboard",
    summary:
      "A signed-in clinician loads /dashboard. Identity reaches Convex once, then a query subscription opens and stays open.",
    steps: [
      {
        lane: "next",
        title: "Next.js renders the route, then leaves",
        body: "The Server Component checks the Clerk session cookie that proxy.ts resolved, renders HTML, and ships MonitoringDataWorkspace as client JavaScript. When this response ends, the Next.js server holds no connection to this tab. Nothing after this step passes through it.",
        crosses: "Next.js server → browser: HTML and the RSC payload. No Convex data.",
        code: {
          path: "src/app/dashboard/page.tsx",
          code: `export default async function DashboardPage() {
  await auth.protect();
  // ...
  <MonitoringDataWorkspace />`,
        },
        corrects:
          "\"The page fetches the data.\" This page fetches nothing from Convex. A Server Component finishes and cannot push a later update, so the live path has to start in a Client Component.",
      },
      {
        lane: "browser",
        title: "One ConvexReactClient opens one WebSocket",
        body: "The client is constructed once, at module scope. Its WebSocket carries every subscription, mutation, and the auth token for this tab.",
        code: {
          path: "src/components/convex/ConvexClientProvider.tsx",
          code: `const convex = new ConvexReactClient(convexUrl);`,
        },
      },
      {
        lane: "clerk",
        title: "Clerk mints a token for Convex",
        body: "ConvexProviderWithAuth calls our fetchAccessToken, which asks Clerk for a JWT from the `convex` template. Clerk signs it with a key whose public half Convex can fetch. Clerk has now authenticated the user. It has decided nothing about what the user may read.",
        crosses: "Browser ↔ Clerk Frontend API: session in, signed JWT out.",
        code: {
          path: "src/components/convex/ConvexClientProvider.tsx",
          code: `const token =
  sessionClaims?.aud === "convex"
    ? await getToken({ skipCache: forceRefreshToken })
    : await getToken({ template: "convex", skipCache: forceRefreshToken });`,
        },
      },
      {
        lane: "browser",
        title: "The token rides the socket, not each call",
        body: "The client sends the JWT once, as an Authenticate message on the connection, and again when it refreshes. No component builds a header, and no function argument carries identity.",
        crosses: "Browser → Convex: one Authenticate message carrying the JWT.",
        code: {
          path: "node_modules/convex/dist/esm-types/browser/sync/protocol.d.ts",
          code: `export type Authenticate = AdminAuthentication | {
    type: "Authenticate";
    tokenType: "User";
    // ...`,
        },
        corrects:
          "\"Each component attaches the token to its request.\" There is no per-request token. Identity is a property of the connection.",
      },
      {
        lane: "convex",
        title: "Convex verifies the signature",
        body: "auth.config.ts names the issuer this deployment trusts. Convex fetches that issuer's public keys and checks the token's signature and audience. Only a verified token produces an identity; useConvexAuth() then reports isAuthenticated.",
        code: {
          path: "convex/auth.config.ts",
          code: `providers: [
  {
    domain: process.env.CLERK_FRONTEND_API_URL,
    applicationID: "convex",
  },
],`,
        },
      },
      {
        lane: "browser",
        title: "useQuery opens a subscription",
        body: "The hook holds \"skip\" until Convex reports the connection authenticated, then registers the query. The message names a public function and its arguments. This query takes no arguments at all: who is asking is already known.",
        crosses: "Browser → Convex: function path and args. Never an owner or user ID.",
        code: {
          path: "src/features/monitoring/components/MonitoringDataWorkspace.tsx",
          code: `const patient = useQuery(api.patients.getMyDemoPatient, isAuthenticated ? {} : "skip");`,
        },
      },
      {
        lane: "convex",
        title: "The handler receives a QueryCtx and authorizes",
        body: "Convex invokes the handler with a ctx built for a query: a read-only db, auth, storage reads, runQuery, meta. Our code reads the verified subject and scopes the index range to it. Convex records which index range was read — the read set.",
        code: {
          path: "convex/patients.ts",
          code: `handler: async (ctx) => {
  const ownerSubject = await requireSubject(ctx);
  return await ctx.db
    .query("patients")
    .withIndex("by_ownerSubject_and_demoKey", (q) =>
      q.eq("ownerSubject", ownerSubject).eq("demoKey", DEMO_KEY),
    )
    .unique();
},`,
        },
      },
      {
        lane: "browser",
        title: "The result arrives; React rerenders",
        body: "useQuery stops returning undefined and returns the patient. React rerenders the component that called it. The subscription stays registered: this is the start of a stream of results, not the end of a request.",
        crosses: "Convex → browser: the query result.",
      },
    ],
  },
  {
    id: "write",
    label: "Record a heart rate",
    summary:
      "The clinician clicks the Phase 5 control. One mutation commits, and the result reaches the screen by a different path than the mutation's own response.",
    steps: [
      {
        lane: "browser",
        title: "useMutation sends the call over the same socket",
        body: "The caller supplies which patient and what value. Nothing about who it is: the connection is already authenticated.",
        crosses: "Browser → Convex: function path, { patientId, value }.",
        code: {
          path: "src/features/monitoring/components/RecordSyntheticHeartRate.tsx",
          code: `await recordSyntheticHeartRate({ patientId, value: nextDemoValue() });`,
        },
      },
      {
        lane: "convex",
        title: "MutationCtx: authenticate, then authorize",
        body: "ctx.auth.getUserIdentity() proves who is calling — that is authentication, and Convex did it from Clerk's token. Comparing ownerSubject to that subject decides whether they may touch this patient — that is authorization, and it is our code.",
        code: {
          path: "convex/authz.ts",
          code: `const subject = await requireSubject(ctx);
const patient = await ctx.db.get("patients", patientId);

if (patient === null || patient.ownerSubject !== subject) {
  throw new Error("Patient not found");
}`,
        },
        corrects:
          "\"Clerk protects the data.\" Clerk proved identity. Whether that identity owns this patient is a rule only our backend knows.",
      },
      {
        lane: "convex",
        title: "Write and commit as one transaction",
        body: "Bounds are checked, then ctx.db.insert writes one row. If anything later in the handler threw, nothing would be written. Server-set fields — type, unit, provenance, timestamps — never came from the browser.",
        code: {
          path: "convex/measurements.ts",
          code: `const measurementId = await ctx.db.insert("measurements", {
  patientId: args.patientId,
  measurementType: "heartRate",
  value: args.value,
  unit: "bpm",
  observedAt: now,
  ingestedAt: now,
  sourceDeviceId: MANUAL_SOURCE_DEVICE_ID,
  sourceType: "manualEntry",
  isSynthetic: true,
});`,
        },
      },
      {
        lane: "convex",
        title: "Return path 1: the mutation response",
        body: "The caller — and only the caller — is sent the return value with the commit timestamp. The client parks it. The awaited promise does not resolve yet.",
        crosses: "Convex → calling tab only: { measurementId, value, observedAt } + commit ts.",
      },
      {
        lane: "convex",
        title: "The write overlaps a read set; the query reruns",
        body: "The new row falls inside the index range listRecentForPatient read for this patient. Convex reruns that query on the server. A write to a different patient would rerun nothing.",
      },
      {
        lane: "convex",
        title: "Return path 2: a transition to every subscriber",
        body: "The new query result is pushed to every client subscribed to it, including tabs and devices that never called the mutation. This is how backend truth is distributed.",
        crosses: "Convex → every subscribed client: new query results.",
        corrects:
          "\"The mutation returns the new data to the UI.\" The mutation changed the truth. The subscription delivered it — to everyone, not just the caller.",
      },
      {
        lane: "browser",
        title: "Queries update, then the promise resolves",
        body: "The client applies the transition first, then resolves the parked mutation promise. By the time `await` continues, local query results already include the write. The table rerenders; the return value is discarded on purpose.",
        code: {
          path: "node_modules/convex/dist/esm/browser/sync/client.js",
          code: `case "Transition": {
  this.remoteQuerySet.transition(serverMessage);
  // ...
  const completedRequests = this.requestManager.removeCompleted(
    this.remoteQuerySet.timestamp()
  );
  this.notifyOnQueryResultChanges(completedRequests);`,
        },
      },
    ],
  },
  {
    id: "denied",
    label: "Touch another user's patient",
    summary:
      "User B holds a valid session and sends user A's patientId. Authentication succeeds. Authorization refuses.",
    steps: [
      {
        lane: "browser",
        title: "A valid user sends someone else's ID",
        body: "This dashboard never offers another user's ID, but the UI is not the boundary: any client can call a public function with any arguments, and Phase 5 tested exactly that. IDs are not secrets and are not permission. The validator only proves this is a well-formed ID from the patients table.",
        crosses: "Browser → Convex: user A's patientId, on user B's authenticated connection.",
      },
      {
        lane: "convex",
        title: "Authentication passes",
        body: "The token is genuine and Convex verified it. getUserIdentity() returns user B. Everything Clerk is responsible for has succeeded.",
      },
      {
        lane: "convex",
        title: "Authorization refuses, before anything is written",
        body: "ownerSubject is user A's; the caller is user B. requireOwnedPatient throws the same message it throws for an ID that does not exist, so the error text cannot be used to discover which IDs are real. The transaction wrote nothing.",
        code: {
          path: "docs/concepts/phase-05-realtime.md — test evidence",
          code: `User B writes to A's patient   Uncaught Error: Patient not found`,
        },
      },
      {
        lane: "browser",
        title: "The promise rejects at once; no subscriber sees anything",
        body: "A failed mutation settles as soon as its response arrives — there is no commit to wait for, so no transition follows. The component shows a generic message rather than the server's text.",
        crosses: "Convex → calling tab only: the error.",
        code: {
          path: "node_modules/convex/dist/esm/browser/sync/request_manager.js",
          code: `if (response.type === "ActionResponse" || !response.success) {
  onResolve();
  // ...
}`,
        },
      },
    ],
  },
];
