# Phase Log

One entry per phase. A phase is closed only after its mastery check is answered by the
learner in their own words. Roadmap and phase contents live in `PROJECT_SOURCE.md`.

| Phase | Name | Status | Closed on |
| --- | --- | --- | --- |
| 1 | Next.js Foundation | Code complete, mastery check open | — |
| 2 | Clerk Authentication | Code complete, mastery check open | — |
| 3 | Convex Foundation | Code complete, mastery check open | — |
| 4 | Clerk and Convex Identity | Code complete, mastery check open | — |
| 5 | Realtime Data | Code complete, two-tab test still blocked (S-20) | — |
| 6 | Synthetic Wearable Simulator | Not started | — |
| 7 | Time-Series Architecture | Not started | — |
| 8 | PhysioNet | Not started | — |
| 9 | Synthetic Clinical Context | Not started | — |
| 10 | Deterministic Event Detection | Not started | — |
| 11 | AI Integration | Not started | — |
| 12 | Grounding and Provenance | Not started | — |
| 13 | Human Review | Not started | — |
| 14 | Failure Modes | Not started | — |
| 15 | Testing | Not started | — |
| 16 | Production and Deployment | Not started | — |
| 17 | Demo Polish | Not started | — |

## Phase 1 — Next.js Foundation

**Goal:** a static clinician dashboard with hardcoded synthetic data. No Clerk, no Convex,
no database, no AI.

**Concept reference:** [`docs/concepts/phase-01-nextjs.md`](concepts/phase-01-nextjs.md)

**Notes**

- 2026-09-20 — Repository inspected: empty apart from `README.md`. Node v22.17.0, npm 10.9.2.

- 2026-09-20 — Next.js initialized with `create-next-app@latest . --typescript --eslint
  --tailwind --src-dir --app --turbopack --import-alias="@/*"`. Landed Next.js 16.3.5,
  React 19.2.8, Tailwind v4. `CLAUDE.md` and the project README had to be moved aside
  during init because `create-next-app` refuses to scaffold over unrecognized files.

- 2026-09-20 — Visual foundation established: CSS-variable theme tokens in `globals.css`,
  light/dark/system switching through `next-themes` (`class` attribute), Lucide icons, and a
  small preview page. Client Components limited to `ThemeProvider` and `ThemeToggle`; the
  layout, header, page, and UI primitives stay Server Components. Dashboard not yet built.

- 2026-09-20 — Static clinician dashboard built under `src/features/monitoring/`
  (`components/`, `data/`, `types/`, barrel `index.ts`). `src/app/page.tsx` only imports the
  frozen synthetic records and wires components together. Every dashboard component is a
  Server Component; the theme provider and theme toggle remain the only Client Components.
  Phase 1 code complete, pending the mastery check.

- 2026-09-20 — Phase 1 concept reference filed at `docs/concepts/phase-01-nextjs.md`.
  Added `SyntheticDataNotice` to its `page.tsx` composition tree; otherwise as written.

**Mastery check (must be answered before Phase 2)**

Explain in your own words: `Browser → Next.js → layout → page → components → rendered dashboard`.

1. Which code ran on the server?
2. Which code ran in the browser?
3. Why did each part run there?
4. What would force a component to become a Client Component?

## Phase 2 — Clerk Authentication

**Goal:** sign-in, sign-out, a public landing route, and a protected dashboard. No Convex,
no organizations, no roles, no webhooks.

**Concept reference:** [`docs/concepts/phase-02-clerk.md`](concepts/phase-02-clerk.md)

**Notes**

- 2026-09-20 — `clerk init` had already installed `@clerk/nextjs@7.9.4` (Core 3), written
  `src/proxy.ts`, added the `[[...sign-in]]` / `[[...sign-up]]` routes, and inserted
  `ClerkProvider` into the root layout. Its edit to `layout.tsx` was reformatted by hand.

- 2026-09-20 — Dashboard moved from `/` to `/dashboard` and protected at the resource with
  `await auth.protect()`. New public landing page at `/`. Core 3 removed `<SignedIn>` and
  `<SignedOut>`; `<Show when="signed-in" | "signed-out">` replaces them.

- 2026-09-20 — Every route is now dynamically rendered. `<Show>` is a Server Component that
  awaits `auth()`, and it sits in `AppHeader` inside the root layout, so no route can be
  prerendered any more. Phase 1's static dashboard was static only because nothing read the
  request.

- 2026-09-20 — `ClerkProvider` moved back inside `<body>`, matching Clerk's current Next.js
  docs and the structure the CLI generated. Clerk application renamed from `doctor` to
  `Post-PCI Watch` via `clerk api --platform PATCH /platform/applications/<id>`.
  Concept reference written.

- 2026-09-20 — Signed-in path verified in the browser against a real session. Test user
  `clinician1+clerk_test@example.com` created through the sign-up flow (the `+clerk_test`
  subaddress skips real email delivery on a development instance; the verification code is
  always `424242`). `/dashboard` renders without redirecting, and the header shows the
  Dashboard link and `UserButton` in place of the signed-out controls. The signed-out path
  was verified earlier by request and in the browser. Sign-out from `UserButton` confirmed
  by the learner, closing the loop: every Phase 2 path has now been exercised end to end.
  Code complete; the mastery check below is the only thing holding the phase open.

**Mastery check (must be answered before Phase 3)**

Explain in your own words:
`request → proxy.ts → auth context → auth.protect() → redirect or render`.

1. What does `clerkMiddleware()` do, and what does it deliberately not do?
2. What is the difference between `auth()` and `auth.protect()`, and when would you reach
   for each?
3. A signed-out browser requests `/dashboard`. Name every step until it lands on sign-in,
   and say at which step rendering stops.
4. Why did the public landing page stop being statically rendered, and what exactly would
   you change to make it static again?
5. Clerk verified the session and gave you a `userId`. Name two access decisions Clerk has
   still not made for you.
6. Why does authentication not yet protect an individual patient's records in this
   application?

## Phase 3 — Convex Foundation

**Goal:** one synthetic patient and a small measurement set in Convex, read by the dashboard
through a reactive query. No Clerk identity wiring, no ownership, no simulator, no actions.

**Concept reference:** [`docs/concepts/phase-03-convex.md`](concepts/phase-03-convex.md)

**Notes**

- 2026-09-20 — Deployment `proficient-panda-85` (dev). Schema: `patients` indexed
  `by_demoKey`, `measurements` indexed `by_patientId_and_observedAt`. Measurement type and
  source type are validator unions, not free strings. Only numeric observations are stored;
  blood pressure and activity state are not single numbers and stay hardcoded.

- 2026-09-20 — `seed:seedDemoData` is an `internalMutation`, so it is not reachable from a
  browser. Run twice: first returned `created: true, measurementsInserted: 12`, second
  returned `created: false, measurementsInserted: 0` with the same `patientId`. Fixture
  timestamps are fixed constants, never `Date.now()`.

- 2026-09-20 — `MonitoringDataWorkspace` is the dashboard's only Client Component. It exists
  because `useQuery` holds a WebSocket subscription. Importing `RecentMeasurements` into it
  pulls that component and `Card` into the client bundle — the boundary propagates downward
  through imports, which is the architectural lesson of this phase.

- 2026-09-20 — Both Convex queries are public and unauthenticated. Anyone with the
  deployment URL can read the demo patient. Acceptable only because the record is synthetic;
  Phase 4 closes it.

- 2026-09-21 — Phase 3 concept reference written. Corrects an earlier verbal shorthand: the
  Next.js server does not "die" after rendering — the request's execution completes and the
  server holds no connection to that browser, so it has no way to push a later update.
  Convex keeps the socket instead. Documentation only; no application behaviour changed.

**Mastery check (must be answered before Phase 4)**

Explain in your own words:
`Convex database → query function → generated API → useQuery() → workspace → rendered rows`.

1. Where does a Convex query function run, and how is that different from the Next.js server?
2. Why must `MonitoringDataWorkspace` be a Client Component when the dashboard page is not?
3. What does a validator do that a TypeScript type cannot?
4. Why is `.withIndex(...).take(n)` used instead of `.collect()`, and what breaks at scale
   if you use the latter?
5. The seed is an `internalMutation`. What would change if it were a `mutation`?
6. Nobody signed in is checked by either query. Who can currently read the demo patient, and
   what exactly has to change in Phase 4 to stop that?

## Phase 4 — Clerk and Convex Identity

**Goal:** Clerk identity reaches Convex, every patient and measurement function requires a
verified token, and one user provably cannot read another's records. No roles, no
organizations, no simulator.

**Concept reference:** [`docs/concepts/phase-04-identity.md`](concepts/phase-04-identity.md)

**Notes**

- 2026-09-21 — `convex/auth.config.ts` trusts `process.env.CLERK_FRONTEND_API_URL` with
  `applicationID: "convex"`. `ConvexProviderWithClerk` replaces `ConvexProvider`, still
  nested inside `ClerkProvider` inside `<body>`.

- 2026-09-21 — Schema migration in three deploys, because adding a required field to a
  populated table fails the push: (1) `ownerSubject` added as `v.optional`, index
  `by_demoKey` replaced by `by_ownerSubject_and_demoKey`; (2)
  `migrations:deleteUnownedPatients` removed the Phase 3 fixture — 1 patient, 12
  measurements; (3) `ownerSubject` tightened to `v.string()`. The third deploy is itself the
  proof that no unowned row survived.

- 2026-09-21 — `ownerSubject` is written only from `identity.subject` via
  `authz.requireSubject`. No function accepts a user ID or owner subject as an argument.
  `ensureMyDemoPatient` is a public mutation that takes no arguments at all.

- 2026-09-21 — **Clerk needed a JWT template named `convex`; none existed.** With no
  template, `getToken({ template: "convex" })` returns null, the client sends no token, and
  the UI sits on "Authenticating with Convex…" with no error in any console. Created via
  `clerk api /jwt_templates -X POST -d '{"name":"convex","claims":{},...}'`
  (`jtmp_3JeGWpIf6KLNlaj7H0RhD4Wjady`). Leave `claims` empty — adding `{"aud":"convex"}`
  explicitly breaks token acceptance; Clerk sets the audience from the template name.

- 2026-09-21 — Isolation proven with `npx convex run --identity`. Signed out: denied.
  user_BBB reading user_AAA's patientId: denied with the same "Patient not found" as a
  nonexistent record. Real Clerk token in the browser: wrote
  `ownerSubject: "user_3JcGwzrPUEiWaO3Fua8grENT7Cd"`.

- 2026-09-21 — Phase 4 concept reference written. Records the trust flow, the three-stage
  migration, the missing-JWT-template diagnosis, and why the template must keep empty custom
  claims. Distinguishes what the injected-identity tests proved from what only the real-token
  observation proved.

- 2026-09-21 — First source-level security audit completed:
  [`docs/security/SECURITY_POSTURE.md`](security/SECURITY_POSTURE.md). 5 controls proven
  effective, 16 findings (1 High, 6 Medium, 6 Low, 3 Informational), no Critical. No
  remediation applied and no application behaviour changed. Standing statement: synthetic
  data only, not authorized for PHI, no HIPAA compliance claimed.

- 2026-09-21 — Security Remediation 1 applied (S-01, S-09, S-13 only). `next.config.ts` now
  serves a Content-Security-Policy plus `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, and production-only HSTS, and sets `poweredByHeader: false`. CSP
  origins are derived from the public Clerk publishable key and Convex URL rather than
  hardcoded. Added `.env.example` (names only) and a `!.env.example` negation in
  `.gitignore`. Verified against a signed-in session: Convex measurements still load over the
  WebSocket and no CSP violations appear. S-09 and S-13 resolved; S-01 remains Partial
  because `'unsafe-inline'` is still required for Next.js and next-themes inline scripts, and
  the Clerk sign-in widget has not been seen under the policy. Evidence in
  `docs/security/SECURITY_POSTURE.md`. No Phase 5 work started.

- 2026-09-21 — S-01 closed for development. The project owner ran the signed-out pass with
  the CSP active: Clerk sign-in widget and "Continue with Google" rendered, a full Google
  OAuth round trip completed, the redirect returned to `/dashboard`, Convex measurements
  loaded, the Clerk avatar loaded, and no CSP violations appeared before or after
  authentication. Every origin the policy allows has now been exercised. Three production
  follow-ups were opened as their own findings rather than left inside a resolved item:
  S-17 (HSTS over real HTTPS), S-18 (CSP reporting), S-19 (nonce hardening).

- 2026-09-21 — Added `docs/concepts/convex-llm-action-security.md`: the security design for
  the Phase 11 AI action, written before any implementation. Covers the ordered pre-LLM and
  post-LLM pipelines, security-event rules (fingerprints and redacted excerpts only, never
  raw prompts or responses), permanently forbidden use cases, and a 10-scenario test matrix.
  Documentation only — no AI SDK installed, no action written, no model has seen this data.

**Mastery check (must be answered before Phase 5)**

Explain in your own words:
`Clerk session → JWT template → ConvexProviderWithClerk → auth.config.ts → ctx.auth → ownership check`.

1. What does `auth.config.ts` do, and what happens if it is missing?
2. Why is `ConvexProviderWithClerk` required when `ConvexProvider` already worked in Phase 3?
3. Why may a client send a `patientId` but never an `ownerSubject`?
4. Why does `requireOwnedPatient` return the same error for "does not exist" and "belongs to
   someone else"?
5. Why did the schema migration take three deploys instead of one?
6. `--identity` proves the authorization logic. What does it *not* prove, and what proved
   that part instead?

## Phase 5 — Realtime Data

**Goal:** one synthetic heart-rate value changes, and the already-subscribed table updates
without a page refresh. No simulator, no interval, no scheduler.

**Concept reference:** [`docs/concepts/phase-05-realtime.md`](concepts/phase-05-realtime.md)

**Notes**

- 2026-09-21 — `measurements:recordSyntheticHeartRate` added. Caller supplies only
  `patientId` and `value`. Identity, measurement type, unit, source metadata, `isSynthetic`,
  and both timestamps are set server-side. `requireOwnedPatient` runs before any write;
  values are bounded to 30–200 bpm. `observedAt` and `ingestedAt` are kept as separate
  fields holding the same instant — this control observes and records together, and claiming
  a transport delay would be fabricating provenance.

- 2026-09-21 — `RecordSyntheticHeartRate` is a small Client Component holding only transient
  UI state (pending, error). It discards the mutation's return value on purpose: the row
  appears because the subscription delivers it, not because the call resolved. No
  `useEffect`, no polling, no `router.refresh()`, no manual refetch, no optimistic update.

- 2026-09-21 — Authorization verified, 9 of 10 tests passed. Signed-out denied; user B denied
  on user A's patient; injected `ownerSubject` rejected by the validator; malformed and
  wrong-table IDs rejected; 250 bpm and 5 bpm rejected; string value rejected. The
  non-synthetic-patient case is untestable without widening the schema, since
  `isSynthetic: v.literal(true)` makes such a fixture unconstructable.

- 2026-09-21 — **Single-client reactivity proven visually.** Top row moved from
  `22:32:03 · 69 bpm` to `22:33:19 · 67 bpm` two seconds after the click, with zero network
  requests captured across the interaction — no navigation, no fetch.

- 2026-09-21 — **Cross-client push proven** with an independent CLI subscriber
  (`npx convex run … --watch`): the watcher printed a new result containing `111` after a
  *different* client wrote it, having made no request of its own.

- 2026-09-21 — **The two-browser-tab test could not be completed and is not claimed.**
  Opening a second tab reproducibly drops the first tab's Convex authentication; reloading
  the first then breaks the second. Observed three times, visible in the deployment logs as
  `Not authenticated` on both queries while the browser still shows a signed-in session.
  Recorded as **S-20** in `docs/security/SECURITY_POSTURE.md`. This is an authentication
  lifecycle problem, not a reactivity problem.

- 2026-09-21 — S-20 diagnosed. Root cause is not the second tab: `navigator.onLine` reports
  false while the network works, Clerk refuses to mint a token (`clerk_offline`),
  `ConvexProviderWithClerk` swallows the throw and returns null, and nothing retries — so a
  transient signal becomes a permanent auth loss until reload. All nine provider-contract
  checks passed; no application fix was warranted or applied. Remediation proposed in
  `docs/security/SECURITY_POSTURE.md`. Phase 5's two-tab reactivity claim stays unproven
  until the remediation lands and the two-tab test passes.

- 2026-09-23 — S-20 remediation items 1 and 2 applied; **the phase did not close.**
  `ConvexClientProvider` now uses `ConvexProviderWithAuth` with a copy of Clerk's token
  fetcher carrying one extra dependency, so a recovery counter can rebuild it and re-run
  `setAuth()` on the same single `ConvexReactClient`. A new `LiveConnectionLost` component
  replaces the measurement table and the write control when authentication has definitively
  failed, and `MonitoringDataWorkspace` now distinguishes four states instead of two. The
  3600-second JWT lifetime is unchanged.

- 2026-09-23 — A defect in the first version of that fix was caught by testing rather than
  by review: Convex's cleanup turns an already-`false` auth state into `null`, so a failed
  re-attempt put the page back into an indefinite "Authenticating with Convex…" — the exact
  misreport the work was meant to remove. Replaced with an explicit boolean record of
  whether the last token fetch returned a token, tested before `isLoading`.

- 2026-09-23 — **The acceptance test did not pass and Phase 5 stays open.** The disconnected
  state reports correctly and idles with zero network requests over 25 seconds, proving no
  polling and no retry loop. But two tabs still cannot hold authentication at once: reloading
  either tab authenticates it and disconnects the other, deterministically, both directions.
  The bounded recovery path was never exercised, because the browser produced no
  offline-to-online transition to exercise it. Root environmental cause found: the Windows
  `NlaSvc` service is stopped, so `navigator.onLine` is permanently false while the network
  works. Evidence and the close-out conditions are in
  [`docs/security/SECURITY_POSTURE.md`](security/SECURITY_POSTURE.md) under S-20.

- 2026-09-23 — Phase 5 concept reference extended with section 14, recording the amplifier
  in the dependency array, why the UI cannot read `isLoading` to detect failure, the four
  states, and the bound on the recovery trigger.

- 2026-09-24 — S-20 acceptance re-run blocked by this machine's Windows network services
  (details in `docs/security/SECURITY_POSTURE.md`, 2026-09-24 entry). The project owner
  **deferred S-20 as environmental** and chose to proceed. The two-tab claim remains
  **unclaimed**, and the bounded recovery remains **unverified**. Phase 6 still waits on the
  mastery check below.

**Mastery check (must be answered before Phase 6)**

Explain in your own words:
`mutation → commit → read-set comparison → query rerun → WebSocket push → React rerender`.

1. What does Convex record when it runs a query, and how does that decide which subscriptions
   rerun after a write?
2. Why is a mutation's return value not how the new row reaches the screen?
3. Why is there no `invalidateQueries` call anywhere in this codebase, and what replaces it?
4. Why would an optimistic update have made this phase's demonstration worthless?
5. A write lands for a different patient. Why does this patient's subscription not rerun?
6. Why is a single manual click better evidence of reactivity than a simulator producing a
   value every five seconds?

## Phase 5.5 — Security, Provenance, and Audit Foundation

**Inserted by the project owner, outside the roadmap in `PROJECT_SOURCE.md`.** Begun with the
Phase 5 mastery check unanswered, by owner decision — hard rule 1 was waived by the owner, not
satisfied. Phase 6 (the simulator) has not begun.

**State carried in, unchanged:** Phase 5 reactivity proven for one browser client and an
independent CLI subscriber; the two-tab claim unproven; S-20 open and deferred; all data
synthetic; no HIPAA compliance claimed.

**Goal:** server-controlled measurement provenance, atomic audit evidence for successful
writes, one client-declared workspace-access event per workspace session, and an owner-scoped
activity view — with nothing an actor could forge.

**Concept reference:** [`docs/concepts/phase-05-5-security-audit-foundation.md`](concepts/phase-05-5-security-audit-foundation.md)

**Notes**

- 2026-09-24 — `auditEvents` table added: literal-union vocabulary, references only, two
  indexes each backing a real read. `convex/audit.ts` holds the narrow helpers
  (`requireUserActor`, `requireValidCorrelationId`, `recordAuditEvent`) and two public
  functions, `recordPatientWorkspaceAccess` and `listMyRecentEvents`. No update or delete
  exists.

- 2026-09-24 — `recordSyntheticHeartRate` and `ensureMyDemoPatient` now write their audit
  event in the same transaction as the record. Existing patients receive no back-dated
  `patient.created`.

- 2026-09-24 — **Provenance corrected.** The 36 fixture rows claimed `simulatedWearable` /
  `sim-wearable-01`; no simulator has existed. Staged migration: before 65 rows / 65 missing
  `origin` / 36 stale labels; after 36 `seedFixture`, 29 `userManualControl`, 0 missing, 0
  stale; re-run a no-op; `origin` made required; temporary functions removed. No actor was
  invented for historical manual rows.

- 2026-09-24 — Authorization verification with injected identities: all 10 required checks
  passed, plus `patient.created` and stored-field checks. Detail in the concept reference §12
  and `SECURITY_POSTURE.md`. S-05 → **Partial**. New finding **S-21** (Low): identity keyed
  on `subject`, not `tokenIdentifier`.

- 2026-09-24 — `npx tsc --noEmit` clean · `npm run lint` clean · `npm run build` succeeds.

- 2026-09-24 — **Observed in the owner's browser:** the "Synthetic activity history" panel
  renders with its label and disclaimer and no identifiers. Two "Opened patient workspace"
  rows at 19:21:38Z and 19:22:04Z carry different correlation IDs — two workspace mounts,
  one event each, as designed. **Not yet observed in a browser:** a "Recorded synthetic heart
  rate" row appearing without a refresh (proven server-side only).

**Mastery check (must be answered before Phase 6)**

Explain in your own words:
`token → actor → ownership → validation → record + audit event → one commit`.

1. Why can the measurement and its audit event never disagree, and what would break that?
2. Why is there no `"denied"` outcome, and what would it take to add one honestly?
3. Why does a `patientWorkspace.accessed` event prove something when present but nothing when
   absent?
4. The workspace effect runs twice. Why is there still one event, and which part guarantees
   it?
5. Why may the browser send a correlation ID but never an actor?
6. Why was relabelling 36 synthetic fixture rows a correctness fix and not a cosmetic one?

The Phase 5 mastery check above also remains open.

- 2026-09-24 — **Mastery checks waived by the project owner** — Phase 5 and Phase 5.5 both.
  Waived, not answered: no answers were given and none are recorded. Hard rule 1 was set aside
  by the owner's decision to prioritise finishing the application.

## Outside the Roadmap — Teaching Section

Not a phase. It adds no technology, no dependency, and no backend code, and it neither
advances nor closes any phase. Phase 5 remains the current phase, and every mastery check
above remains open.

**Concept reference:** [`docs/concepts/teaching-section.md`](concepts/teaching-section.md)

**Notes**

- 2026-09-23 — Public teaching library added at `/learn`, with one dynamic route
  `/learn/[slug]` generated from a typed catalogue (`src/features/learning/data/articles.ts`).
  First article: *How Next.js, Clerk, and Convex Handle One Request*
  (`/learn/next-clerk-convex-request-pipeline`), 16 sections. Content is typed metadata plus
  composed Server Component sections; MDX was rejected as an unjustified new dependency.
- 2026-09-23 — Claims verified against convex 1.46.0's installed types and client source,
  @clerk/nextjs 7.9.4, next 16.3.5, and official Convex, Clerk, and Next.js docs. Findings
  worth keeping: in this Convex version `QueryCtx` and `MutationCtx` carry `runQuery`, and
  `MutationCtx` carries `runMutation`; `api` and `internal` are the same runtime proxy, and
  visibility is enforced by types and by the deployment; the scheduler accepts only mutations
  and actions; a successful mutation's promise resolves only after the matching query
  transition is applied (read from source; not a documented guarantee); Convex's docs call
  client-to-action calls usually an anti-pattern.
- 2026-09-23 — Three Client Component islands only: `FunctionTypeExplorer`,
  `PipelineExplorer`, and the header's `NavLink`. Neither explorer calls a backend function.
- 2026-09-23 — Shared changes: `AppHeader` gains a public "Learn" link, and its control
  group now wraps. At 390 px it previously pushed the page 204 px wider than the screen.
  `globals.css` gains one token, `--primary-text`, because dark `--primary` failed contrast
  as small text. No change to Clerk, Convex auth, the S-20 remediation, monitoring behaviour,
  or the CSP.
- 2026-09-23 — Lint, `tsc --noEmit`, and build clean (7 routes). Browser-verified in light
  and dark, signed in and signed out, keyboard-driven, at 390, 768, and 1280 px with no page
  overflow. `/dashboard` is unchanged. Observed but out of scope: Clerk's development
  telemetry to `clerk-telemetry.com` is blocked by the existing CSP in a signed-out session.
  The pre-existing header "Synthetic data" badge still has low dark-mode contrast.
- 2026-09-23 — Practice mode added at `/learn/[slug]/practice`: 21 items for Article 01 across
  recall, discrimination, bug-hunt, and sequencing cards, scheduled by a five-box Leitner
  system with topic interleaving and confidence ratings. Progress lives in per-browser
  `localStorage` only; no backend change. Scoring well in practice does not answer a phase
  mastery check.
