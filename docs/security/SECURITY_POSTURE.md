# Security Posture — Post-PCI Watch

> **SYNTHETIC DATA ONLY — NOT AUTHORIZED FOR PHI.**
>
> This application handles fabricated records for a patient who does not exist. It is a
> teaching project. It is **not** HIPAA compliant, no such claim is made anywhere in this
> repository, and nothing in this document should be read as an assessment of HIPAA
> readiness. Several controls that any PHI-handling system requires are absent by design at
> this stage; they are listed below as blocking items.

---

## 1. Posture Summary

| Area | State |
| --- | --- |
| Authentication | **Strong.** Every patient/measurement function requires a verified token. |
| Authorization / ownership | **Strong.** Per-record ownership enforced server-side and proven by test. |
| Client-supplied identity | **Rejected.** Proven — extra arguments fail the validator. |
| Record enumeration | **Mitigated.** Non-distinguishing errors, random IDs. |
| Input validation | **Strong.** Runtime validators on every function argument. |
| Attack surface | **Small.** No Server Actions, HTTP actions, webhooks, or crons. |
| Dependencies / secrets | **Clean.** 0 vulnerabilities, no committed credentials. |
| Transport & browser hardening | **Resolved for development.** Headers and CSP deployed and verified end to end, including OAuth. Three production follow-ups open (S-17, S-18, S-19). |
| Rate limiting / abuse control | **Absent.** |
| Environment separation | **Absent.** Development instances only. |
| Audit logging | **Partial (Phase 5.5).** Successful writes and client-declared workspace access are recorded atomically in an append-only `auditEvents` table. Denials, query reads, and tamper evidence are not covered. |
| Retention, deletion, backup, IR | **Absent.** |

The identity and authorization layer built in Phase 4 is genuinely sound and was verified by
test rather than by reading. Everything an operational security programme requires *around*
that layer does not exist yet. Both statements are true at once, and the second is why the
banner above is not a formality.

---

## 2. Scope and Method

**Audited at commit state:** working tree as of 2026-09-21, Phase 4 complete.

**Read:** `CLAUDE.md`, `docs/PHASE_LOG.md`, `docs/PROJECT_SOURCE.md`, all files under `src/`
and `convex/`, `next.config.ts`, `proxy.ts`, `package.json`, `package-lock.json`,
`.gitignore`, `eslint.config.mjs`, `tsconfig.json`.

**Executed (read-only or non-destructive):** signed-out function calls, injected-identity
calls as two distinct subjects, argument-injection attempts, malformed and cross-table
identifier attempts, limit-boundary probes, `npm audit`, `git grep` secret scan, response
header inspection, Clerk JWT template inspection, `npx tsc --noEmit`, `npm run lint`,
`npm run build`.

**No application behaviour was modified during this audit.** No remediation was applied.

**Not covered:** penetration testing, Convex platform internals, Clerk platform internals,
production configuration (none exists), browser extension interference, supply-chain
provenance beyond `npm audit`.

---

## 3. Findings

Severity reflects risk **in this synthetic-data teaching context**, with a separate column
for whether the item blocks any future PHI use. Status values: Proven (verified by test),
Partial, Open (confirmed absent), Unknown (not determinable in this audit), N/A.

### Summary table

| ID | Severity | Status | Finding | Blocks PHI |
| --- | --- | --- | --- | --- |
| F-01 | Informational | Proven | Every patient/measurement function requires verified identity | — |
| F-02 | Informational | Proven | `ownerSubject` derives only from `identity.subject` | — |
| F-03 | Informational | Proven | Cross-user record access denied | — |
| F-04 | Informational | Proven | Errors do not distinguish missing from forbidden | — |
| F-05 | Informational | Proven | Argument validators reject injected and malformed input | — |
| S-01 | High → Low | **Resolved (dev)** | Security headers and CSP deployed and verified end to end | No (dev) |
| S-02 | Medium | Proven | Convex JWT lifetime is 3600s — revocation lag up to one hour | **Yes** |
| S-03 | Medium | Open | No application-level rate limiting or abuse controls | **Yes** |
| S-04 | Medium | **Partial** | Separate Convex dev and prod deployments (Phase 16); Clerk instance still shared (S-22) | **Yes** |
| S-05 | Medium | **Partial** | Successful writes audited atomically; workspace access client-declared; denials and reads not durably audited; no tamper evidence | **Yes** |
| S-06 | Medium | Open | No retention, deletion, or data-subject erasure path | **Yes** |
| S-07 | Medium | Open | No backup, restore drill, or incident-response plan | **Yes** |
| S-08 | Low | Unknown | Errors thrown as raw `Error`, not `ConvexError` | Partial |
| S-09 | Low | Resolved | `X-Powered-By` removed via `poweredByHeader: false` | No |
| S-10 | Low | Proven | Validator error reveals which table an ID belongs to | No |
| S-11 | Low | Open | Convex deploy key grants identity impersonation | **Yes** |
| S-12 | Low | Open | Cookie attributes unverified; development runs over plaintext HTTP | **Yes** |
| S-13 | Low | Resolved | `.env.example` added (names only) and un-ignored | No |
| S-14 | Informational | Proven | Public mutation `ensureMyDemoPatient` writes, bounded to one record per user | No |
| S-15 | Informational | Proven | No committed secrets; `npm audit` clean | — |
| S-16 | Informational | Proven | Synthetic-data marker is a stored, validated field | — |
| S-17 | Medium | Open | HSTS never served over a real HTTPS origin | **Yes** |
| S-18 | Medium | Open | No CSP violation reporting endpoint | **Yes** |
| S-19 | Low | Open | CSP still relies on `'unsafe-inline'`; no nonce | Partial |
| S-22 | Medium | Open | Deployed demo uses Clerk's development instance (no owned domain) | **Yes** |
| S-21 | Low | Open | Identity key is `identity.subject`, not `identity.tokenIdentifier`; safe only while one issuer is trusted | No |
| S-20 | Medium | **Partially remediated; deferred by owner; not closed** | Clerk `getToken` fails `clerk_offline` on a false `navigator.onLine`; failure now reported and bounded recovery added, but recovery is unverified and the trigger is this machine's Windows network services | **Yes** |

---

### F-01 — Every patient/measurement function requires verified identity

**Severity:** Informational · **Status:** Proven · **Blocks PHI:** —

**File/function:** `convex/authz.ts` → `requireIdentity`, `requireSubject`,
`requireOwnedPatient`; called first in `convex/patients.ts` → `getMyDemoPatient`,
`ensureMyDemoPatient`, and `convex/measurements.ts` → `listRecentForPatient`.

**Evidence:**

```text
npx convex run patients:getMyDemoPatient          → Uncaught Error: Not authenticated
npx convex run patients:ensureMyDemoPatient       → Uncaught Error: Not authenticated
npx convex run measurements:listRecentForPatient  → Uncaught Error: Not authenticated
  (valid patientId supplied, no identity)
```

`convex/auth.config.ts` trusts `process.env.CLERK_FRONTEND_API_URL` with
`applicationID: "convex"`, so tokens are signature-verified against the Clerk issuer before
`ctx.auth.getUserIdentity()` returns anything.

**Failure scenario if absent:** the Phase 3 state — the deployment URL is public
(`NEXT_PUBLIC_CONVEX_URL` ships to every browser), so any anonymous caller could read
records directly, entirely bypassing the protected Next.js route.

**Recommendation:** maintain. Every new function must call a guard as its first statement.
Consider a review checklist item; a function that forgets is silently public.

---

### F-02 — `ownerSubject` derives only from verified identity

**Severity:** Informational · **Status:** Proven · **Blocks PHI:** —

**File/function:** `convex/authz.ts` → `requireSubject` (returns `identity.subject`);
written in `convex/patients.ts` → `ensureMyDemoPatient`.

**Evidence:** `ensureMyDemoPatient` declares `args: {}` — there is no argument to supply.
Attempting to inject one:

```text
npx convex run patients:ensureMyDemoPatient '{"ownerSubject":"user_AAA"}' --identity user_BBB
→ ArgumentValidationError: Object contains extra field `ownerSubject`
  that is not in the validator.
```

Convex object validators are strict: unknown fields are rejected, not ignored. This is a
platform-level guarantee, not application code.

**Failure scenario if absent:** a caller could write records owned by another user, or claim
ownership of an arbitrary subject, defeating every downstream ownership check.

**Recommendation:** maintain. Never add a user-identifying field to any `args` validator.

---

### F-03 — Cross-user record access is denied

**Severity:** Informational · **Status:** Proven · **Blocks PHI:** —

**File/function:** `convex/measurements.ts` → `listRecentForPatient`, line 26
(`await requireOwnedPatient(ctx, args.patientId)`), before any measurement is read.

**Evidence:** two subjects hold byte-identical fixture data, so any difference in what they
can read is attributable to ownership alone.

```text
user_AAA → own patientId       → 3 rows returned
user_BBB → user_AAA's patientId → Uncaught Error: Patient not found
signed out → user_AAA's patientId → Uncaught Error: Not authenticated
```

`getMyDemoPatient` scopes by index range (`by_ownerSubject_and_demoKey`, owner first), so
another user's documents are never read, not merely filtered out afterwards.

**Failure scenario if absent:** any authenticated user could read any patient's full
measurement history by supplying its ID.

**Recommendation:** maintain. Ownership is enforced on the parent patient; if measurements
ever become reachable by a path that does not traverse the patient, that path needs its own
check.

---

### F-04 — Errors do not distinguish missing from forbidden

**Severity:** Informational · **Status:** Proven · **Blocks PHI:** —

**File/function:** `convex/authz.ts` → `requireOwnedPatient`.

**Evidence:** the null check and the ownership check share one branch and one message,
`"Patient not found"`. A caller cannot tell a nonexistent ID from someone else's ID.
Combined with Convex's random 32-character document IDs, record enumeration is impractical.

**Recommendation:** maintain, and apply the same pattern to future resources.

---

### F-05 — Argument validators reject injected and malformed input

**Severity:** Informational · **Status:** Proven · **Blocks PHI:** —

**File/function:** `convex/measurements.ts` → `listRecentForPatient` args;
`convex/schema.ts` validator unions.

**Evidence:**

```text
patientId: "not-a-real-id"          → ArgumentValidationError: Value does not match validator
patientId: <a measurements ID>      → ArgumentValidationError: Found ID from table
                                       `measurements`, which does not match `v.id("patients")`
limit: -5                           → 1 row  (clamped by Math.max(1, …))
limit: 999999                       → 12 rows (all available; MAX_LIMIT = 100)
```

Validators run at runtime on every call, including from callers that never saw the
TypeScript types. `measurementType` and `sourceType` are unions of literals rather than
`v.string()`, so unknown values are rejected on write.

**Recommendation:** maintain. Note the clamp is application code, not a validator — keep it.

---

### S-01 — Browser security headers and Content-Security-Policy

**Severity:** High → **Low (residual)** · **Status:** **Resolved for development
2026-09-21** · **Blocks PHI:** No, in development · **Remediated:** 2026-09-21 ·
**Review by:** 2026-12-21, or on any change to the Clerk/Convex integration, whichever comes
first

> Resolved for the **development** environment only. Three follow-ups are tracked separately
> as S-17 (HSTS over real HTTPS), S-18 (CSP reporting), and S-19 (nonce hardening). They are
> not closed by this finding and must be addressed before PHI or wider deployment.

**Original finding:** `next.config.ts` contained only the scaffold comment. No CSP, no
`X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`, no framing control,
no HSTS, and `X-Powered-By: Next.js` disclosed on every response.

#### Exact configuration

`next.config.ts` now sets `poweredByHeader: false` and returns the headers below for
`/:path*`. Origins are derived at config-evaluation time from two **public** values —
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (which base64-encodes the Clerk frontend API host) and
`NEXT_PUBLIC_CONVEX_URL` — so the policy tracks the keys instead of hardcoding hosts. No
secret is read and nothing new is exposed to the client.

Policy as served (development; the two dev-only entries are marked):

```text
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'none';
form-action 'self' https://electric-fowl-7803.clerk.accounts.dev https://accounts.google.com;
script-src 'self' 'unsafe-inline' https://electric-fowl-7803.clerk.accounts.dev
           'unsafe-eval'                            <- development only
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://img.clerk.com https://electric-fowl-7803.clerk.accounts.dev;
font-src 'self' data:;
connect-src 'self' https://electric-fowl-7803.clerk.accounts.dev
            https://proficient-panda-85.convex.cloud
            wss://proficient-panda-85.convex.cloud
            ws://localhost:* http://localhost:*     <- development only
frame-src 'self' https://electric-fowl-7803.clerk.accounts.dev https://accounts.google.com;
worker-src 'self' blob:
```

Accompanying headers: `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, and —
production only — `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

#### Every allowed external origin, and why

| Origin | Directives | Justification (evidence) |
| --- | --- | --- |
| `https://electric-fowl-7803.clerk.accounts.dev` | script, connect, img, frame, form-action | Clerk frontend API. Serves the `@clerk/ui` bundle and receives Clerk's API calls. 8 chunks observed loading HTTP 200. |
| `https://img.clerk.com` | img | Every Clerk avatar, including OAuth provider images, is proxied through this host. Observed serving the signed-in `UserButton` avatar. `lh3.googleusercontent.com` is therefore **not** required. |
| `https://accounts.google.com` | frame, form-action | Google is an enabled sign-in method; its OAuth flow leaves and returns through this origin. |

No wildcard origin is used. `frame-ancestors 'none'` carries the clickjacking control, and
`X-Frame-Options` is deliberately **not** sent, so the two cannot disagree.

#### Why `'unsafe-inline'` is present in `script-src`

Two inline scripts are structural, not incidental:

1. Next.js App Router inlines its bootstrap and streaming payload as inline `<script>`.
2. `next-themes` injects a blocking inline script to set the theme class before paint.
   Removing it reintroduces the light/dark flash fixed in Phase 1.

The correct fix is a per-request nonce, which cannot come from a static header — it requires
generating the nonce in `proxy.ts` and setting the CSP header there. That is a larger change
than this remediation and is recorded below as a remaining limitation rather than pretended
away.

What the directive still buys: **no script may load from any origin except this one and
Clerk's.** That bound on third-party script execution is the main value of this policy, and
it holds.

`'unsafe-eval'` appears **only** in development, where Next.js's React Refresh evaluates code
at runtime. It is absent from the production policy — verified below.

#### Test evidence (2026-09-21)

Headers present on all four routes, confirmed by response inspection:

```text
/          200   CSP + nosniff + Referrer-Policy + Permissions-Policy, no X-Powered-By
/dashboard 307   same headers; location: /sign-in?redirect_url=...%2Fdashboard  (signed out)
/sign-in   200   same headers
/sign-up   200   same headers
```

Production build served separately on port 3100:

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload   present
'unsafe-eval'        absent from the production CSP
ws://localhost:*     absent from the production CSP
http://localhost:*   absent from the production CSP
X-Powered-By         absent
```

Signed-in browser session on `/dashboard`, with the CSP active:

- Dashboard rendered fully.
- **Convex-backed measurement rows displayed** — the `wss:` connect-src entry is correct and
  the WebSocket is not blocked. This is the path S-01 could not be closed without.
- All 8 `@clerk/ui` chunks loaded, HTTP 200, from the Clerk origin.
- `UserButton` avatar loaded from `https://img.clerk.com`, HTTP 200.
- Theme switching still functions; no flash observed.
- **Zero CSP violation messages in the console.** The only console output was Clerk's
  standing development-keys warning.
- `/sign-in` while signed in redirected to `/` — Clerk's documented single-session behaviour,
  not a CSP failure.

Build verification: `npm run lint` clean · `npx tsc --noEmit` clean · `npm run build`
succeeds (5/5 routes).

#### Signed-out verification (2026-09-21, performed by the project owner)

The two gaps that kept this finding open were closed by a full signed-out pass through the
authentication flow, with the CSP active. Reported results:

```text
Clerk sign-in widget rendered                        PASS
"Continue with Google" rendered                      PASS
No CSP violations before authentication              PASS
Google OAuth round trip completed                    PASS
Redirected back to /dashboard                        PASS
Convex measurements loaded                           PASS
Clerk avatar loaded                                  PASS
No CSP violations after authentication               PASS
```

This exercises every origin the policy allows: Clerk's frontend API for the widget and its
scripts, `accounts.google.com` through `form-action` and `frame-src` for the OAuth hand-off
and return, `img.clerk.com` for the avatar, and the Convex WebSocket through `connect-src`
for the measurement subscription. Signed-out rendering, the OAuth redirect, and the
authenticated session were all observed violation-free.

Combined with the header and production-build evidence above, the development environment is
verified. Attribution is recorded because this evidence was gathered by the project owner in
their own browser session rather than by automated inspection.

#### Remaining limitations — tracked separately

| Was | Now tracked as | Status |
| --- | --- | --- |
| HSTS never served over real HTTPS | **S-17** | Open |
| No CSP reporting endpoint | **S-18** | Open |
| `'unsafe-inline'` in `script-src`; no nonce | **S-19** | Open |

Each is a production concern rather than a development defect, which is why S-01 is resolved
for development while they stay open.

---

### S-17 — HSTS never served over a real HTTPS origin

**Severity:** Medium · **Status:** Open · **Blocks PHI:** **Yes**

**File/function:** `next.config.ts` → `securityHeaders`, the production-only
`Strict-Transport-Security` entry.

**Evidence:** the header was observed only on a local production build served over plaintext
HTTP on port 3100:

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

A browser ignores HSTS delivered over HTTP, so this confirms the conditional logic emits the
header — it does not confirm the header does anything.

**Failure scenario:** `includeSubDomains` and `preload` are commitments that are painful to
reverse. A two-year `max-age` applied to a domain whose subdomains are not all HTTPS-ready
will break them for every visitor who has seen the header, and preload removal takes months.

**Recommendation:** on first HTTPS deployment, start with a short `max-age` (for example
300), confirm every subdomain serves HTTPS, then raise it. Do not submit to the preload list
until the long `max-age` has run without incident.

---

### S-18 — No CSP violation reporting endpoint

**Severity:** Medium · **Status:** Open · **Blocks PHI:** **Yes**

**File/function:** `next.config.ts` → the `csp` directive list; no `report-to` or
`report-uri` directive is present, and no `Reporting-Endpoints` header is sent.

**Evidence:** every CSP verification in this document depended on a human or an agent reading
a browser console. That works for a local test and not for anything else.

**Failure scenario:** a violation in a deployed environment is invisible. Two cases matter
and look identical without reporting: a legitimate resource blocked by an over-tight policy
(users see a broken page, nobody is told), and an injection attempt blocked by the policy
(a real attack signal, discarded).

**Recommendation:** add `Reporting-Endpoints` plus a `report-to` directive before wider
deployment. Consider running a tightened candidate policy in
`Content-Security-Policy-Report-Only` alongside the enforced one — that is how S-19 should be
rolled out safely.

---

### S-19 — CSP relies on `'unsafe-inline'`; no nonce

**Severity:** Low · **Status:** Open · **Blocks PHI:** Partial

**File/function:** `next.config.ts` → the `script-src` directive.

**Evidence:**

```text
script-src 'self' 'unsafe-inline' https://electric-fowl-7803.clerk.accounts.dev
```

Two inline scripts make this structural: Next.js App Router inlines its bootstrap and
streaming payload, and `next-themes` injects a blocking script to set the theme class before
paint.

**Failure scenario:** the policy restricts *where scripts load from*, not *whether inline
script executes*. An injected inline `<script>` would still run. The origin restriction is
the more valuable half of the control, but this is the half that is missing.

**Recommendation:** move CSP generation into `proxy.ts`, mint a per-request nonce, and pass
it to both `next-themes` (which accepts a `nonce` prop) and Next.js (which applies a nonce
from the CSP header to its own scripts). A static header in `next.config.ts` cannot carry a
per-request value, so this is a relocation, not an edit. Roll it out behind
`Content-Security-Policy-Report-Only` first — see S-18.

### S-02 — Convex JWT lifetime is 3600 seconds

**Severity:** Medium · **Status:** Proven · **Blocks PHI:** **Yes**

**File/function:** Clerk JWT template `convex` (`jtmp_3JeGWpIf6KLNlaj7H0RhD4Wjady`),
created during Phase 4 implementation.

**Evidence:**

```text
{'name': 'convex', 'lifetime': 3600, 'claims': {}, 'allowed_clock_skew': 5}
```

Clerk's default *session* token lifetime is far shorter. This template mints one-hour tokens.

**Failure scenario:** revoking a session, banning a user, or responding to a stolen token
does not take effect at Convex until the current token expires — up to one hour later.
During that window the holder retains full read access to their records. A stolen token is
a bearer credential; nothing else is required to use it.

**Recommendation:** reduce `lifetime` to the shortest value the refresh path tolerates
(60 seconds is Clerk's session-token default and works with `ConvexProviderWithClerk`, which
refreshes automatically). Verify that a signed-in browser survives the refresh boundary
before adopting it — see the untested item in §5.

---

### S-03 — No application-level rate limiting or abuse controls

**Severity:** Medium · **Status:** Open · **Blocks PHI:** **Yes**

**File/function:** all of `convex/patients.ts`, `convex/measurements.ts`; no
`@convex-dev/rate-limiter` component is installed, no throttling exists anywhere.

**Evidence:** `grep` for rate limiting across `convex/` and `src/` returns nothing. Convex
enforces platform-level resource limits per function, but there is no per-user quota, no
cooldown, and no abuse detection in this application.

**Failure scenario:** an authenticated user can call `getMyDemoPatient` or
`listRecentForPatient` in an unbounded loop, consuming deployment resources and generating
cost. `ensureMyDemoPatient` is idempotent so it cannot inflate storage, but it can be hammered.
There is also no protection against credential-stuffing at the Clerk boundary beyond Clerk's
own defaults, which this audit did not verify.

**Recommendation:** add `@convex-dev/rate-limiter` with per-subject quotas before any
untrusted user population exists. Do not hand-roll counters; concurrent mutations race.

---

### S-04 — No environment separation

**Severity:** Medium · **Status:** Open · **Blocks PHI:** **Yes**

**Evidence:**

```text
clerk doctor  → Instance IDs: development (production not configured)
Clerk console → "Clerk has been loaded with development keys"
Convex        → proficient-panda-85 (development); no production deployment exists
```

One Clerk instance and one Convex deployment serve all use. Development keys carry strict
usage limits and weaker guarantees, and the same credentials that a developer holds locally
reach the only datastore that exists.

**Failure scenario:** no boundary separates experimentation from anything else. A destructive
migration — such as `migrations:deleteUnownedPatients`, which this project ran deliberately —
has no non-production target to be rehearsed against first.

**Recommendation:** Phase 16 owns this. Before any non-synthetic use: separate production
Clerk instance and Convex deployment, distinct keys, no developer access to production data
by default.

---

### S-05 — No audit logging of data access

**Severity:** Medium · **Status:** **Partial** (Phase 5.5, 2026-09-24) · **Blocks PHI:** **Yes**

**File/function:** no logging exists in any function under `convex/`.

**Evidence:** Convex's platform logs record function invocations and thrown errors — the
audit confirmed this by reading them — but they are operational telemetry with a limited
retention window, not an access audit trail. Nothing records *which user read which patient
record when* in a durable, queryable, tamper-evident form.

**Failure scenario:** after a suspected compromise there is no way to answer "what did this
account read?" A PHI system must answer that question; this one cannot.

**Recommendation:** when the data model justifies it, add an append-only access-log table
written in the same transaction as the read path, plus a retention policy. Note the read
path is a query, and queries cannot write — this requires deliberate design, not a one-line
addition.

#### Phase 5.5 — what is now recorded, and what is not

`convex/audit.ts` and the `auditEvents` table (see `docs/concepts/phase-05-5-security-audit-foundation.md`):

| Event | Written by | Guarantee |
| --- | --- | --- |
| `measurement.recorded` | `recordSyntheticHeartRate` | Same transaction as the measurement: both or neither |
| `patient.created` | `ensureMyDemoPatient` | Same transaction as the patient and its fixtures; never back-dated for existing patients |
| `patientWorkspace.accessed` | `recordPatientWorkspaceAccess`, called by the dashboard | Real actor, owned patient, one per workspace mount — but **declared by the client** |

Actor identity is derived from the verified token in every case; no function accepts an actor,
outcome, event type, timestamp, or synthetic flag as an argument (proven: all rejected by the
validator). Rows hold references only — no values, names, emails, tokens, or payloads. There is
no public update or delete.

**Remaining, and why S-05 is Partial rather than Resolved:**

- Client-declared workspace access can be skipped by a modified client; reads through the
  query are not themselves recorded.
- Query reruns are intentionally not logged as human access, and queries cannot write.
- Denied operations are not durably audited: a throw rolls back the whole transaction,
  including any audit row. Denials exist only in Convex's platform logs.
- Audit rows are not cryptographically tamper-evident (no hash chain or external anchoring).
- Deployment administrators remain privileged: an admin key can read, alter, or delete any row.
- No roles or clinician assignments exist; the only access rule is ownership.
- No retention policy exists for audit rows (see S-06).
- No HIPAA compliance claim is made.

---

### S-06 — No retention, deletion, or erasure path

**Severity:** Medium · **Status:** Open · **Blocks PHI:** **Yes**

**File/function:** `convex/` contains no delete function reachable by a user.
`migrations:deleteUnownedPatients` is an `internalMutation` for one-time developer use.

**Evidence:** a signed-in user can create their demo patient and read it. There is no
function that deletes a patient, deletes measurements, or removes a user's data when their
Clerk account is deleted. Deleting the Clerk user would orphan the Convex records, which
would then be unreachable but retained indefinitely — the worst of both outcomes.

**Failure scenario:** data grows without bound, orphaned records accumulate, and no
data-subject erasure request can be satisfied.

**Recommendation:** define retention before adding more data. A Clerk webhook on
`user.deleted` that triggers an internal cascade is the standard pattern, but note that
webhooks are explicitly out of scope until a later phase.

---

### S-07 — No backup, restore drill, or incident-response plan

**Severity:** Medium · **Status:** Open · **Blocks PHI:** **Yes**

**Evidence:** no backup configuration, no restore procedure, and no incident-response
document exists in the repository.

**Failure scenario:** an erroneous migration or deletion is unrecoverable. There is no
documented owner, escalation path, or containment step for a suspected credential
compromise.

**Recommendation:** Convex provides snapshot and restore. A backup that has never been
restored is a hypothesis, not a control — schedule a drill. Incident response can be one
page, but it must name an owner and a containment step.

---

### S-08 — Errors thrown as raw `Error`, not `ConvexError`

**Severity:** Low · **Status:** Unknown · **Blocks PHI:** Partial

**File/function:** `convex/authz.ts` → all three helpers
(`throw new Error("Not authenticated")`, `throw new Error("Patient not found")`).

**Evidence:** the CLI surfaces the full message. Convex's documented behaviour is that
uncaught non-`ConvexError` exceptions are redacted for clients on production deployments
while `ConvexError` payloads are delivered intentionally. **This audit did not verify the
production redaction behaviour**, because no production deployment exists — hence status
Unknown rather than Proven.

**Failure scenario:** either an internal message reaches a client unintentionally, or an
intended message is redacted and the UI cannot distinguish failure modes. Both are
correctness problems rather than direct vulnerabilities; the current messages are
deliberately non-revealing, which limits the impact.

**Recommendation:** convert intentional, client-facing failures to `ConvexError` with a
stable code so the UI can branch on it, and let genuinely unexpected errors stay as raw
throws to be redacted.

---

### S-09 — `X-Powered-By: Next.js` header

**Severity:** Low · **Status:** **Resolved 2026-09-21** · **Blocks PHI:** No

**Original evidence:** `X-Powered-By: Next.js` present on every response.

**Remediation:** `poweredByHeader: false` in `next.config.ts`.

**Verification:** header absent from `/`, `/dashboard`, `/sign-in`, and `/sign-up` on the
development server, and absent from the production build served on port 3100.

---

### S-10 — Validator error reveals an ID's source table

**Severity:** Low · **Status:** Proven · **Blocks PHI:** No

**Evidence:**

```text
ArgumentValidationError: Found ID "j5744m1g…" from table `measurements`,
which does not match the table name in validator `v.id("patients")`.
```

**Failure scenario:** a caller holding an unknown ID learns which table it belongs to. This
leaks schema shape, not record contents, and requires already possessing a valid ID. It is
platform behaviour, not application code, and is not directly fixable.

**Recommendation:** accept and record. If it ever matters, catch and re-throw a generic
error at the function boundary.

---

### S-11 — Convex deploy key grants identity impersonation

**Severity:** Low (here) · **Status:** Open · **Blocks PHI:** **Yes**

**File/function:** `CONVEX_DEPLOYMENT` in `.env.local`; exercised in this audit as
`npx convex run --identity '{"subject":"user_AAA", …}'`.

**Evidence:** the `--identity` flag used throughout §3's tests injects an arbitrary subject
without any token. It is admin-level CLI capability, working as designed — and it is exactly
why those tests prove authorization logic but not token verification (§4).

**Failure scenario:** anyone holding the deploy key can read or write as any user, with no
audit trail distinguishing them from the real user. In this project the key sits in a local
`.env.local` on a developer workstation.

**Recommendation:** treat the deploy key as a production-equivalent credential. Rotate on any
suspicion. Under environment separation (S-04), a development key must not reach production
data.

---

### S-12 — Cookie attributes unverified; development over plaintext HTTP

**Severity:** Low (here) · **Status:** Unknown · **Blocks PHI:** **Yes**

**Evidence:** Clerk sets and manages `__session`, `__client_uat`, `__clerk_db_jwt`, and
`__clerk_handshake`. A plain request to the development server returns no `Set-Cookie`
header — Clerk's client establishes them — so this audit could not confirm `Secure`,
`HttpOnly`, and `SameSite` attributes from the server side. Development runs on
`http://localhost:3000`, where `Secure` cannot apply.

**Recommendation:** verify cookie attributes against a production HTTPS deployment when one
exists. Do not assume; inspect.

---

### S-13 — No `.env.example`

**Severity:** Low · **Status:** Open · **Blocks PHI:** No

**Evidence:** `.gitignore` correctly excludes `.env*` and no environment file is tracked
(verified via `git ls-files`). But no example file documents which variables are required.

**Failure scenario:** a new environment is stood up with a missing variable. The failure mode
for a missing `CLERK_FRONTEND_API_URL` is silent: `getUserIdentity()` returns `null` forever
and the UI waits indefinitely, with nothing in any console — this project lost real time to
exactly that class of failure during Phase 4.

**Remediation (2026-09-21):** added `.env.example` listing variable **names** only, grouped
by which side each belongs to, with the Convex-deployment-only `CLERK_FRONTEND_API_URL`
documented separately alongside its silent failure mode. `.gitignore` needed a
`!.env.example` negation, because the existing `.env*` rule excluded the template too.

**Verification:** `git add --dry-run .env.example` returns `add '.env.example'`, and the file
contains 0 lines with a value after `=`.

**Status:** **Resolved 2026-09-21.**

---

### S-14 — Public mutation `ensureMyDemoPatient`

**Severity:** Informational · **Status:** Proven · **Blocks PHI:** No

**File/function:** `convex/patients.ts` → `ensureMyDemoPatient`.

**Evidence:** it is a public `mutation` — the browser calls it. It is nonetheless tightly
bounded: `args: {}` (nothing to supply), it writes only compile-time fixture constants from
`convex/fixtures.ts`, it stamps `ownerSubject` from the verified token, and it is idempotent
per subject (`created: false` on the second call, verified).

The Phase 3 predecessor, `seed:seedDemoData`, was an `internalMutation` and has been removed.

**Failure scenario:** bounded to one fixture patient per authenticated user. Without S-03
(rate limiting) it can still be called repeatedly, costing transactions but creating nothing.

**Recommendation:** maintain the argument-free, fixture-only shape. If it ever accepts input,
it needs to be re-audited as a write endpoint.

---

### S-15 — No committed secrets; dependencies clean

**Severity:** Informational · **Status:** Proven · **Blocks PHI:** —

**Evidence:**

```text
npm audit              → found 0 vulnerabilities
npm audit --omit=dev   → found 0 vulnerabilities
git ls-files | grep -iE "env|secret|key|credential"   → (none tracked)
git grep for sk_live/sk_test/pk_live patterns → matches only in .agents/ skill
                                                 documentation prose, no live keys
```

`.gitignore` excludes `.env*`. `NEXT_PUBLIC_CONVEX_URL` and the Clerk publishable key are
public by design — the browser requires both — and are not findings.

**Recommendation:** maintain. Re-run `npm audit` on every dependency change. Do not apply
breaking upgrades reactively.

---

### S-16 — Synthetic-data marker is a stored, validated field

**Severity:** Informational · **Status:** Proven · **Blocks PHI:** —

**File/function:** `convex/schema.ts` — `isSynthetic: v.literal(true)` on both `patients`
and `measurements`.

**Evidence:** the validator makes any value other than `true` unwritable. A record asserts
its own nature in the database rather than relying on a convention.

**Limitation, stated plainly:** this marks records as synthetic; it does not *make* them
synthetic. Nothing technically prevents a future writer from inserting real data into a
record flagged `isSynthetic: true`. It is a useful tripwire and a clear intent signal, not a
control that can enforce the banner at the top of this document.

---

### S-20 — Convex authentication lost permanently after a transient offline signal

**Severity:** Medium · **Status:** **Partially remediated; NOT closed** · **Blocks PHI:**
**Yes** · **Discovered:** 2026-09-21 (Phase 5) · **Diagnosed:** 2026-09-21 ·
**Remediation items 1 and 2 applied:** 2026-09-23 · **Verification:** incomplete — see
§ "2026-09-23 remediation and incomplete verification" below · **Deferred by the project
owner:** 2026-09-24, as environmental to the test machine — see the 2026-09-24 audit entry

**Original report:** "opening a second browser tab drops the first tab's Convex
authentication." That description was **wrong about the cause**. The second tab is a
coincidence; the trigger is unrelated to tab count.

#### Root cause

`navigator.onLine` reports `false` while the network is in fact working. Clerk's client
trusts that flag and refuses to attempt a token request, throwing `clerk_offline`.
`ConvexProviderWithClerk` catches the throw and returns `null`. Convex treats a null token as
unauthenticated and **there is no path that ever retries**.

```text
navigator.onLine === false          (false negative from the browser; network is fine)
→ Clerk getToken({template:"convex"}) throws  code="clerk_offline"   (no request attempted)
→ ConvexProviderWithClerk fetchAccessToken:  catch { return null; }
→ Convex client receives null → setIsConvexAuthenticated(false)
→ every protected query returns "Not authenticated" server-side
→ fetchAccessToken is memoised on [orgId, orgRole, sessionId] — none change
→ the auth effect never re-runs, setAuth is never called again
→ PERMANENT until the page reloads
```

Classification, against the candidate list:

| Candidate | Verdict |
| --- | --- |
| Provider construction / lifecycle bug | **No** — contract verified correct (below) |
| Token-template or claim problem | **No** — template `convex`, claims empty, verified |
| **Clerk token acquisition / refresh problem** | **Yes — primary.** `getToken` throws `clerk_offline` |
| Convex token acceptance problem | **No** — Convex is never given a token to reject |
| Query-before-authentication race | **No** — queries are gated on `useConvexAuth` and fail *after* success, not before |
| WebSocket reconnection problem | **No** — the socket is irrelevant; the token never exists |
| Clerk multi-session configuration | **No** — `multi_session_enabled: false`, single active session |
| Dependency defect | **Contributing** — the swallowed error plus memoised `fetchAccessToken` turn a transient failure into a permanent one |
| **Browser / environment artifact** | **Yes — trigger.** `navigator.onLine` is a false negative |
| Unknown | — |

**Primary cause:** Clerk token acquisition failing on a false offline signal.
**Amplifier:** no retry path in the Convex provider, making a transient condition permanent.

#### Evidence

Captured in the browser with local-only instrumentation (no raw JWT, cookie, header, secret,
or patient data recorded; nothing sent to any external decoder).

The failed state, with the dashboard showing "Authenticating with Convex…":

```text
{ activeUser: "user_3…T7Cd",
  sessStatus: "active",            ← Clerk session is ALIVE
  sessIdRed:  "sess_3…feyv",
  cached: { status: "throw",
            err: 'Clerk: Network request failed while offline.
                  The browser appears to be disconnected. (code="clerk_offline")' },
  forced: { status: "throw", err: same } }
```

The network is not actually down:

```text
{ navigatorOnLine:  false,    ← the browser claims offline
  sameOriginFetch:  200,      ← but same-origin requests succeed
  clerkFapiFetch:   401 }     ← and Clerk's own API answers over the network
```

A 401 from Clerk's frontend API is a real HTTP response from Clerk's servers. The request
left the machine and came back. `navigator.onLine` is lying, and Clerk short-circuits on it
before attempting anything.

No self-recovery while the page sat idle:

```text
{ onLineNow: false, retryAfterWait: "throw: clerk_offline",
  devServer: 200, dashboardShows: "auth-failed-state" }
```

#### Provider contract — verified correct, all nine checks

| # | Check | Result |
| --- | --- | --- |
| 1 | `ClerkProvider` wraps `ConvexProviderWithClerk` | Confirmed — `layout.tsx` lines 40–55 |
| 2 | Correct Clerk `useAuth` passed | Confirmed — `useAuth` from `@clerk/nextjs` |
| 3 | Exactly one `ConvexReactClient` per realm | Confirmed — module scope, single construction site |
| 4 | Client not recreated during render | Confirmed — outside the component body |
| 5 | Key, template, issuer, `auth.config.ts` same instance | Confirmed — publishable key decodes to `electric-fowl-7803.clerk.accounts.dev`, matching `CLERK_FRONTEND_API_URL` on the deployment |
| 6 | Template named exactly `convex` | Confirmed — `{ name: "convex", lifetime: 3600, claims: {} }` |
| 7 | Token carries expected claims | **Unverified** — no token could be minted in the failed state; previously proven working by a real `ownerSubject` write in Phase 4 |
| 8 | No custom `setAuth` / `clearAuth` / provider replacement | Confirmed — `grep` over `src/` and `convex/` finds none |
| 9 | No service worker, storage handler, or cross-tab code | Confirmed — no `serviceWorker`, `BroadcastChannel`, or storage listener anywhere |

**Nothing in this application's provider construction is wrong.** No remediation to it is
warranted, which is why none was applied.

#### Why the original description was wrong

The 60–90 second timing, the two-tab correlation, and "reloading one breaks the other" all
have the same explanation: `navigator.onLine` flaps, and a reload is the only thing that
re-attempts authentication. Whichever tab was reloaded most recently worked; the other stayed
broken because nothing retries. Tab count was never causal.

#### Secondary finding — the UI misreports the failure

`MonitoringDataWorkspace` gates on `authLoading || !isAuthenticated` and renders
"Authenticating with Convex…". After a failed token fetch `useConvexAuth()` returns
`isLoading: false, isAuthenticated: false`, so the UI claims work is in progress when
authentication has in fact failed and will never be retried. For a monitoring surface, a
screen that says "connecting…" forever while silently showing no data is a poor failure mode.

#### Proposed remediation — smallest change, not applied

1. **Distinguish the two states in the UI.** Branch on `isLoading` versus
   `!isAuthenticated`, and render an explicit "connection lost — reload to reconnect" state
   with a reload control for the second. Surfaces the failure instead of disguising it as
   progress. Touches one component; no auth logic changes.
2. **Re-attempt on the browser's `online` event.** Listening for `online` and re-running the
   auth effect addresses the amplifier directly. This is *not* a retry that hides the
   failure — the UI still reports the failed state while it persists.
3. **Do not change the JWT lifetime** (S-02). This finding proves the refresh path is fragile
   for a reason unrelated to expiry; a shorter lifetime would make token fetches more
   frequent and therefore fail more often, not less. S-02 should stay open until 1 and 2 land.
4. **Investigate the environment.** `navigator.onLine === false` on a working connection is a
   machine-level condition (Chrome network-state detection, VPN, or adapter state). Worth
   checking whether it reproduces on another machine or profile before concluding how often
   real users would hit it.

**Regression risks:** item 2 adds an event listener and a re-run path to the auth effect —
it must not loop when the token fetch keeps failing, and must not mask a genuinely revoked
session. Item 1 is presentational only.

**Two-tab verification test, once remediated:** open two dashboard tabs; confirm both show
data simultaneously; toggle the network off and on; confirm both recover without a reload and
that the failed state is visible while offline. Until that passes, Phase 5's two-tab
reactivity claim stays unproven.

#### Residual risk

The trigger is environmental and not controlled by this application. Until item 2 lands, any
transient offline signal — a sleeping laptop, a VPN reconnect, a flaky Wi-Fi handover —
permanently detaches the dashboard from its data source until the user reloads, while the
page continues to look signed in.

#### 2026-09-23 remediation and incomplete verification

Items 1 and 2 of the proposed remediation were applied. Item 3 was honoured — the JWT
lifetime is unchanged at 3600 seconds. Item 4 was investigated and the machine-level cause
was found. **S-20 is not closed, and Phase 5's two-tab claim is still not made.**

##### What changed in the application

| File | Change |
| --- | --- |
| `src/components/convex/ConvexClientProvider.tsx` | `ConvexProviderWithClerk` replaced with `ConvexProviderWithAuth` plus a local copy of Clerk's token fetcher carrying one extra dependency, a recovery counter. Adds a recovery context, an offline to online edge listener, and a boolean record of whether the last token fetch produced a token. |
| `src/features/monitoring/components/LiveConnectionLost.tsx` | New. The explicit disconnected state with a manual Reconnect control. |
| `src/features/monitoring/components/MonitoringDataWorkspace.tsx` | Auth branch split from two states into four; the definitive-failure branch is tested before the loading branch. |
| `src/features/monitoring/index.ts` | Barrel export for the new component. |

Not changed: the JWT template and its 3600-second lifetime, `convex/auth.config.ts`, every
Convex function, `proxy.ts`, and the CSP. **No backend authentication was weakened.** The
`ConvexReactClient` is still constructed exactly once at module scope; recovery re-runs
`setAuth()` on that single client rather than building another.

##### A defect introduced by the fix, found by testing, then fixed

The first version of the retry made things worse in one respect, and it is recorded here
because reading the code would not have revealed it.

Convex's cleanup runs `setIsConvexAuthenticated(prev => prev ? false : null)` when
`fetchAccessToken` changes identity. An already-failed state is `false`, which is falsy, so
it becomes `null` — the value `isLoading` is derived from. A retry that also failed
therefore returned the page to an indefinite "Authenticating with Convex…", recreating the
exact misreport this finding exists to remove.

```text
observed: click Reconnect while Clerk refuses
       -> "Live monitoring disconnected"  replaced by
       -> "Authenticating with Convex…"   and it stayed there
```

Fixed by not inferring failure from Convex's tri-state. The token fetcher — the one place
that observes the outcome — records a boolean, and the dashboard tests it before it tests
`isLoading`. Only whether a token came back is retained; no token, claim, session
identifier, or error text is stored anywhere.

##### Evidence gathered 2026-09-23

Two dashboard tabs, one real Clerk session, dev server on `localhost:3000`.

**The disconnected state reports correctly.**

```text
tab A: navigator.onLine false, same-origin fetch 200
       -> "Live monitoring disconnected"
       -> "No readings are being received."
       -> "This browser reports itself offline…"
       -> Reconnect control present, measurement table absent, write control absent
       -> rowCount 0
```

**Clerk's refusal reproduced directly, with the session alive.**

```text
{ loaded: true, sessionStatus: "active", userPresent: true,
  getToken: "throw", code: "clerk_offline",
  navigatorOnLine: false }
```

**A failed re-attempt no longer misreports.** After the fix, clicking Reconnect while Clerk
refuses settles back into the disconnected state with the offline explanation, not a
spinner.

**No retry loop, no polling.** A tab left sitting in the disconnected state issued **zero
network requests over 25 seconds**.

**The original "second tab" signature reproduced, and is now better characterised.** It is
deterministic, and it is not about tab count:

```text
reload tab A -> tab A authenticated (9 rows), tab B disconnected
reload tab B -> tab B authenticated (9 rows), tab A disconnected
```

Only the most recently loaded tab holds a usable token. A fresh page load **does** obtain a
token even while `navigator.onLine` is false, so the offline flag alone is not sufficient to
cause the failure. The failure needs two ingredients: something that forces a tab to re-mint
a token (observed: another tab loading), and the false offline flag that makes re-minting
impossible. The precise cross-tab mechanism inside Clerk was not established and is **not**
claimed here.

##### Item 4 resolved — the environmental trigger is a stopped Windows service

```text
Get-NetConnectionProfile          -> returns nothing (no network profile exists)
Get-Service NlaSvc                -> Status: Stopped,  StartType: Manual
Get-NetAdapter   Wi-Fi            -> Status: Up,  LinkSpeed: 72.2 Mbps
Get-NetRoute 0.0.0.0/0            -> NextHop 192.168.86.1 via Wi-Fi
```

Network Location Awareness (`NlaSvc`) is the Windows service that builds connection profiles
and reports connectivity state. With it stopped, Windows has no network profile, Chrome's
`navigator.onLine` follows and reports `false`, and Clerk short-circuits on that flag —
while the adapter is up and traffic flows normally.

This is a machine configuration fault, not a defect in Chrome, Clerk, Convex, or this
application. It explains why S-20 has been reproducible on this machine and would likely not
reproduce elsewhere.

##### What is NOT verified, and why

Per the standing instruction not to fabricate an online state, no attempt was made to
override `navigator.onLine` or Clerk's internal offline check.

```text
onLine sampled over 35 s while stopped    -> false at every sample
'online'  events observed                 -> 0
'offline' events observed                 -> 0
```

The browser never produced an offline to online transition, so **the bounded recovery path
was never exercised.** It is implemented and reviewed, not proven.

| Acceptance criterion | Result |
| --- | --- |
| One-tab baseline authenticated for at least 3 minutes | **Not run** — blocked |
| Two dashboard tabs authenticated simultaneously | **FAILED** — only the most recently loaded tab holds a token |
| Tab A writes, both tabs update | **Not run** — blocked |
| Tab B writes, both tabs update | **Not run** — blocked |
| Background/foreground alternation | **Not run** — blocked |
| Survives beyond the 60–90 s window | **Not run** — blocked |
| Repeat writes succeed | **Not run** — blocked |
| Offline shows an explicit disconnected state | **PASSED** |
| Restoring connectivity triggers exactly one attempt | **Not run** — no transition occurred |
| Both subscriptions resume | **Not run** — blocked |
| A signed-out session is not auto-restored | **PASSED by construction**; not exercised against a real sign-out |
| No polling, `router.refresh()`, invalidation, navigation | **PASSED** — zero requests in 25 s idle |
| No `Not authenticated` errors after successful recovery | **Not run** — no successful recovery occurred |

`npm run lint`, `npx tsc --noEmit`, and `npm run build` (5/5 routes) are clean.

##### Required before S-20 can be closed

1. Start `NlaSvc` on the test machine (requires administrator) and confirm
   `Get-NetConnectionProfile` returns a profile and `navigator.onLine` reads `true`.
2. Re-run the full acceptance test above, including a real offline to online cycle.
3. If two tabs still cannot hold authentication simultaneously once `navigator.onLine` is
   truthful, the cross-tab Clerk token mechanism becomes a new finding in its own right —
   it would mean the false offline flag was masking a second, independent defect.

Until 1 and 2 pass, this finding stays open and Phase 5 stays open.

---

### S-22 — Deployed demo uses Clerk's development instance

**Severity:** Medium · **Status:** Open · **Blocks PHI:** **Yes** · **Discovered:** 2026-09-24
(Phase 16, owner decision)

**Evidence:** a Clerk production instance requires a domain the owner controls, and
`*.vercel.app` does not qualify. The owner chose to deploy the demo with the existing
development instance (`electric-fowl-7803.clerk.accounts.dev`), shared with local development.

**Consequences:** development-mode badge and user limits; Google sign-in uses Clerk's shared
development OAuth credentials; one user pool across development and the demo, so a development
account can sign in to the deployed demo and vice versa. Convex data stays separate — the same
Clerk subject owns different records in each Convex deployment.

**Recommendation:** before any audience beyond a demo, register a domain, create a Clerk
production instance with its own OAuth credentials, and point the production Convex deployment's
`CLERK_FRONTEND_API_URL` at it.

---

### S-21 — Identity key is `subject`, not `tokenIdentifier`

**Severity:** Low · **Status:** Open · **Blocks PHI:** No · **Discovered:** 2026-09-24
(Phase 5.5 review)

**File/function:** `convex/authz.ts` `requireSubject`; `patients.ownerSubject`;
`auditEvents.actorSubject`.

**Evidence:** the Convex guidelines for this project name `identity.tokenIdentifier` (issuer
plus subject) as the canonical identity key and advise against `identity.subject` alone.
`subject` is unique only within one issuer. `convex/auth.config.ts` trusts exactly one
issuer today, so no collision is currently possible.

**Failure scenario:** a second issuer is added (another Clerk instance, or another provider)
and it mints a `sub` equal to an existing Clerk user ID. That caller would pass
`requireOwnedPatient` for the other user's records and be attributed their audit events.

**Recommendation:** migrate ownership and actor fields to `tokenIdentifier` before
`auth.config.ts` ever gains a second provider. Phase 5.5 kept `subject` deliberately, so
`auditEvents.actorSubject` matches `patients.ownerSubject`; changing one without the other
would make ownership and attribution disagree.


## 4. What the Tests Prove, and What They Do Not

The isolation evidence in F-01 through F-05 was produced with
`npx convex run --identity`, which injects an identity at the deployment boundary using
admin credentials.

```text
--identity PROVES:      ownership comparisons, denial paths, index scoping,
                        validator behaviour, error non-disclosure
--identity DOES NOT:    exercise token minting, signature verification,
                        issuer/audience matching, or provider wiring
```

This distinction is not theoretical. During Phase 4 the Clerk `convex` JWT template did not
exist, so no real browser token was ever accepted — and every `--identity` test passed
throughout. The gap was closed only by observing a real Clerk subject
(`user_3JcGwzrPUEiWaO3Fua8grENT7Cd`) written to `ownerSubject` from a browser session.

Both check types are required. Neither alone is honest.

---

## 5. Known Untested Areas

| Item | Why it matters |
| --- | --- |
| Second *real* browser user | Isolation between real Clerk identities is proven only for injected subjects |
| Token refresh across the 3600s boundary | S-02's remediation depends on refresh working |
| Production error redaction (S-08) | No production deployment exists to observe |
| Cookie attributes over HTTPS (S-12) | Cannot be confirmed on plaintext localhost |
| Clerk's own rate limiting / attack protection | Not inspected; assumed defaults |
| Convex platform resource limits under abuse | Not probed; probing would be a load test |

---

## 6. Prioritized Remediation

Nothing below has been implemented. Ordered by value per unit of effort.

**Before this project is shown to anyone — COMPLETED 2026-09-21**

1. ~~**S-01** — headers and CSP in `next.config.ts`.~~ **Resolved for development**, verified
   end to end including a full Google OAuth round trip.
2. ~~**S-09** — `poweredByHeader: false`.~~ Resolved.
3. ~~**S-13** — commit `.env.example` with names only.~~ Resolved.

**Before any deployed environment**

3a. **S-18** — CSP reporting endpoint. Without it, every later CSP change is unverifiable
    outside a local browser.
3b. **S-17** — HSTS rollout on the first HTTPS origin: short `max-age` first, raise after
    confirming subdomains.

**Before any untrusted user population**

4. **S-02** — shorten the JWT template lifetime; verify refresh first.
5. **S-03** — `@convex-dev/rate-limiter` with per-subject quotas.
6. **S-08** — `ConvexError` with stable codes for intentional client-facing failures.
6a. **S-19** — nonce-based CSP, rolled out report-only first (depends on S-18).

**Before any non-synthetic data, all blocking**

7. **S-04** — environment separation (Phase 16).
8. **S-06** — retention and erasure path, including Clerk `user.deleted` cascade.
9. **S-05** — Partial since Phase 5.5. Remaining: enforced read auditing, durable denial
   records, tamper evidence, retention.
10. **S-07** — backups plus a restore drill that actually restores.
11. **S-11** — deploy-key handling policy and rotation procedure.
12. **S-12** — verify cookie attributes on a real HTTPS deployment.

**Accept and record**

13. **S-10** — platform behaviour, not fixable at the application layer.

---

## 7. Audit Log

### 2026-09-21 — Initial source-level audit (Phase 4 complete)

- **Scope:** full repository source, all Convex functions, all Next.js routes, provider and
  authentication configuration, dependencies, headers.
- **Method:** source review plus 11 executed verification tests; `npm audit`; secret scan;
  header inspection; `tsc`, lint, and production build.
- **Result:** 5 controls proven effective (F-01…F-05). 16 findings recorded: 1 High,
  6 Medium, 6 Low, 3 Informational. No Critical findings. No secrets exposed. No dependency
  vulnerabilities.
- **Changes made during the audit:** none. No remediation applied; no application behaviour
  modified.
- **Prior configuration change noted:** the Clerk `convex` JWT template
  (`jtmp_3JeGWpIf6KLNlaj7H0RhD4Wjady`, `lifetime: 3600`, `claims: {}`) was created during
  Phase 4 implementation, before this audit. S-02 concerns its lifetime.
- **Verification results:** `npx tsc --noEmit` clean · `npm run lint` clean ·
  `npm run build` succeeds (5/5 routes) · `npm audit` 0 vulnerabilities.
- **Standing statement:** synthetic data only; not authorized for PHI; no HIPAA compliance
  claimed.

### 2026-09-21 — Remediation 1: browser security headers

- **Scope:** S-01, S-09, S-13 only. No other finding touched.
- **Changed:** `next.config.ts` (CSP plus four headers and `poweredByHeader: false`),
  `.env.example` (new, names only), `.gitignore` (`!.env.example` negation).
- **Not changed:** the JWT lifetime (S-02), rate limiting (S-03), audit logging (S-05), and
  every other open finding. No application code, no Convex function, no provider wiring.
- **Verification:** headers confirmed on `/`, `/dashboard`, `/sign-in`, `/sign-up`;
  production-only HSTS confirmed on a separate production build; dev-only `'unsafe-eval'` and
  localhost WebSocket entries confirmed absent from the production policy; a signed-in
  dashboard session rendered Convex measurements over the WebSocket with zero CSP violations
  in the console; 8 Clerk UI chunks and the `img.clerk.com` avatar all HTTP 200; signed-out
  `/dashboard` still redirects to sign-in with `redirect_url` intact. `npm run lint`,
  `npx tsc --noEmit`, and `npm run build` all clean.
- **Result:** S-09 and S-13 Resolved. **S-01 Partial, deliberately not closed** — see its
  remaining limitations 2 and 3.
- **Standing statement:** synthetic data only; not authorized for PHI; no HIPAA compliance
  claimed.

### 2026-09-21 — S-01 closed for development after owner verification

- **Evidence received:** project owner performed a signed-out pass with the CSP active —
  Clerk sign-in widget rendered, "Continue with Google" rendered, no violations before
  authentication, Google OAuth round trip completed, redirect back to `/dashboard`, Convex
  measurements loaded, Clerk avatar loaded, no violations after authentication.
- **Effect:** the two limitations that kept S-01 open (unobserved sign-in widget, unexercised
  OAuth round trip) are closed. Every origin the policy allows has now been exercised.
- **S-01 status:** Resolved **for development**. Not closed for production.
- **New tracked findings, carried forward from S-01's limitations so they are not lost
  inside a resolved item:** S-17 (HSTS over real HTTPS, Medium), S-18 (CSP reporting,
  Medium), S-19 (nonce hardening, Low).
- **Changes to code or configuration:** none. Documentation only.
- **Standing statement:** synthetic data only; not authorized for PHI; no HIPAA compliance
  claimed.

### 2026-09-21 — S-20 discovered during Phase 5 verification

- **Context:** Phase 5's required two-browser-tab reactivity test. The test could not be
  completed and was not claimed.
- **Finding:** opening a second tab reproducibly drops the first tab's Convex authentication;
  a single tab also lost it roughly 60–90 seconds after load, just after a successful
  authenticated mutation. Recorded as **S-20** (Medium, Proven, PHI-blocking).
- **Related:** S-02 (3600-second JWT lifetime) and `phase-04-identity.md` §17, which already
  listed token refresh as untested. S-20 is evidence that the untested path is in fact
  failing.
- **Changes to code or configuration:** none from this audit entry. Phase 5's application
  changes are logged in `docs/PHASE_LOG.md`.
- **Standing statement:** synthetic data only; not authorized for PHI; no HIPAA compliance
  claimed.

### 2026-09-21 — S-20 diagnosed; root cause proven, remediation proposed only

- **Method:** static provider-contract verification (all nine checks), reading the installed
  `ConvexProviderWithClerk` and `ConvexAuthState` sources, and local browser instrumentation
  capturing token-acquisition outcome, decoded non-sensitive claim metadata, SHA-256 token
  fingerprints, `navigator.onLine`, and connection state. No raw JWT, cookie, header, secret,
  or patient data was recorded, and no token was sent to any external decoder.
- **Result:** root cause proven — Clerk's `getToken` throws `clerk_offline` because
  `navigator.onLine` is a false negative, `ConvexProviderWithClerk` swallows it and returns
  `null`, and no code path ever retries. The original "second tab causes it" description was
  incorrect; tab count is not causal.
- **Provider construction:** verified correct on all nine contract points. No fix applied,
  because nothing in it is wrong.
- **Diagnostics:** temporary instrumentation was removed from the tree before completion;
  `grep` confirms no references remain.
- **Changes to application behaviour:** none. Remediation proposed, not implemented.
- **Verification:** `npm run lint` clean · `npx tsc --noEmit` clean · `npm run build`
  succeeds (5/5 routes).
- **Standing statement:** synthetic data only; not authorized for PHI; no HIPAA compliance
  claimed.

### 2026-09-23 — S-20 remediation items 1 and 2 applied; verification incomplete

- **Scope:** S-20 only. No other finding touched.
- **Changed:** `src/components/convex/ConvexClientProvider.tsx` (ConvexProviderWithAuth with
  a recovery-aware token fetcher, recovery context, offline-to-online edge listener, boolean
  token-fetch outcome), `src/features/monitoring/components/LiveConnectionLost.tsx` (new),
  `src/features/monitoring/components/MonitoringDataWorkspace.tsx` (four auth states),
  `src/features/monitoring/index.ts` (barrel export).
- **Not changed:** the `convex` JWT template and its 3600-second lifetime (S-02 stays open),
  `convex/auth.config.ts`, every Convex function, `proxy.ts`, the CSP, and every other open
  finding. No backend authentication was weakened. One `ConvexReactClient`, unchanged.
- **Defect found during testing and fixed in the same session:** the first version of the
  retry returned the page to an indefinite "Authenticating with Convex…" when a re-attempt
  also failed, because Convex's cleanup turns an already-`false` auth state into `null`.
  Replaced with an explicit boolean record of the token-fetch outcome, tested before
  `isLoading`.
- **Verification:** `npm run lint` clean · `npx tsc --noEmit` clean · `npm run build`
  succeeds (5/5 routes). Disconnected-state reporting PASSED. No-polling/no-loop PASSED
  (zero network requests over 25 s idle). **Two-tab authentication FAILED. Bounded recovery
  NOT exercised** — the browser produced no offline-to-online transition in 35 s of sampling
  and fired zero `online`/`offline` events.
- **Environmental cause identified (diagnosis item 4):** `NlaSvc` (Network Location
  Awareness) is Stopped on the test machine, so Windows holds no network connection profile
  and Chrome reports `navigator.onLine === false` while Wi-Fi is Up at 72.2 Mbps with a valid
  default route. Clerk short-circuits on that flag and throws `clerk_offline`. Not fixed —
  starting the service requires administrator rights and is the machine owner's decision.
- **Diagnostics:** browser-console probes only, removed from the page before completion. No
  instrumentation was added to the repository. No raw JWT, cookie, header, secret, or patient
  data was recorded, and no token was sent to any external decoder.
- **Result:** S-20 **remains open**. Phase 5's two-tab reactivity claim **remains unproven**.
- **Standing statement:** synthetic data only; not authorized for PHI; no HIPAA compliance
  claimed.

### 2026-09-24 — S-20 acceptance re-run blocked; deferred by the project owner

- **Scope:** S-20 only. No code or configuration changed.
- **Machine state observed (local time, UTC−4):**
  - 12:34 — `NlaSvc` **Stopped** (start type Manual). `Get-NetConnectionProfile` empty.
  - ~13:25 — owner started `NlaSvc`. Network List Manager then reported
    `IsConnected = IsConnectedToInternet = True` at every 1 s sample for 3 minutes.
  - The NetworkProfile log recorded **no network identification** between 12:29:42 and a
    Wi-Fi reconnect at 14:10:16, when the Wi-Fi interface reached the "Identified" state.
  - After 14:10:16, Network List Manager still enumerated **zero connected networks** and
    `Get-NetConnectionProfile` stayed empty, while reporting internet connectivity. Windows
    network state is internally inconsistent on this machine.
- **Application behaviour observed (owner's screen, not instrumented):** with `NlaSvc`
  running, the dashboard authenticated and synthetic writes appeared through the
  subscription, then repeatedly dropped to `LiveConnectionLost` **with the "browser reports
  itself offline" line shown**. Reconnect or a reload restored the feed each time. The
  disconnected state again hid historical readings as designed.
- **Open question, unresolved:** Reconnect was reported to succeed while the offline line was
  displayed. Either `navigator.onLine` had returned to `true` without the automatic recovery
  restoring the feed, or Clerk issued a token despite a false flag. The flag was not read
  directly, so neither is established.
- **Not run:** the Chrome extension was disconnected, so `navigator.onLine`, `online`/`offline`
  events, recovery-attempt counts, and Clerk/Convex state could not be recorded. None of the
  nine acceptance steps was executed.
- **Unrelated, noted:** a React hydration warning on `<body>` came from the ColorZilla browser
  extension injecting `cz-shortcut-listen`. Not an application defect; no code changed.
- **Decision:** the project owner deferred S-20 as environmental to this machine and chose to
  proceed with the roadmap. **S-20 is not closed.** Close-out conditions are unchanged.
  Recommended machine fix: `Set-Service NlaSvc -StartupType Automatic`, then reboot. Re-run on
  a machine with a healthy network stack before any claim of two-tab reactivity or of
  verified recovery.
- **Standing statement:** synthetic data only; not authorized for PHI; no HIPAA compliance
  claimed.

### 2026-09-24 — Phase 5.5: security, provenance, and audit foundation

- **Scope:** S-05 (partially remediated), measurement provenance, new finding S-21. S-20 and
  every other finding untouched.
- **Changed:** `convex/schema.ts` (`auditEvents` table, `measurementOrigin`, `sourceType`
  widened with `seedFixture`), `convex/audit.ts` (new), `convex/measurements.ts`,
  `convex/patients.ts`, `convex/fixtures.ts`,
  `src/features/monitoring/hooks/useRecordPatientWorkspaceAccess.ts` (new),
  `src/features/monitoring/components/SyntheticActivityHistory.tsx` (new),
  `MonitoringDataWorkspace.tsx`, `src/features/monitoring/index.ts`.
- **Provenance correction:** the 36 seed rows labelled `simulatedWearable` / `sim-wearable-01`
  claimed a simulator that has never existed. Relabelled `seedFixture` / `seed-fixture`.
- **Migration:** staged. Before: 65 rows, 65 missing `origin`, 36 stale simulator labels.
  After: 36 `seedFixture`, 29 `userManualControl`, 0 `systemProducer`, 0 missing, 0 stale.
  Re-run changed nothing. `origin` then made required, and the schema push was accepted. The
  temporary migration functions were removed and confirmed absent from the deployment.
- **Verification (injected identities, dev deployment):** all passed. Signed-out audit
  read, audit write, and heart-rate write → `Not authenticated`. Actor, actor type, outcome,
  synthetic flag, event type, timestamp, origin, and source type as arguments →
  `ArgumentValidationError` (extra field). Malformed and wrong-table IDs rejected; malformed
  correlation IDs rejected. User A → B's patient → `Patient not found`, no event written.
  Each account lists only its own events (A 2, B 1, C 1 of 4 total). Three identical
  workspace-access calls → one row. Valid heart rate → +1 measurement, +1 event. 250 bpm,
  5 bpm, string value, and cross-owner writes → +0/+0. `patient.created` written once for a
  new user; none for existing patients. Stored rows contain no value, name, email, token, or
  payload field. Cross-owner measurement isolation intact.
- **Not verified:** the dashboard panel and the access effect in a real browser session
  (Chrome extension disconnected); owner-confirmed separately if at all — see `PHASE_LOG.md`.
- **Test data added:** synthetic user `user_CCC` and its demo patient, created to exercise
  `patient.created`.
- **Verification commands:** `npx tsc --noEmit` clean · `npm run lint` clean ·
  `npm run build` succeeds (8 routes).
- **Standing statement:** synthetic data only; not authorized for PHI; no HIPAA compliance
  claimed.
