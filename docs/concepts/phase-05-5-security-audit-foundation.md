# Evidence That Cannot Be Forged

## Post-PCI Watch — Phase 5.5 Reference

Phase 4 made sure only the owner can touch a record. Phase 5 made writes visible the moment
they commit. Neither left anything behind that says *who did what, when* — and the demo
fixtures claimed to come from a wearable simulator that has never existed.

Phase 5.5 is a phase the project owner inserted outside the roadmap. It adds no new
technology: it uses Convex transactions, validators, and indexes that were already here, and
applies them to provenance and audit evidence. This document records the concepts and,
separately, exactly what was verified.

**Status at the start of this phase, unchanged by it:** Phase 5 reactivity proven for one
browser client and an independent CLI subscriber; the two-tab claim unproven; S-20 open and
deferred by the owner; the Phase 5 mastery check unanswered by owner decision; all data
synthetic; no HIPAA compliance claimed.

---

## 1. Authentication Versus Authorization, Once More

```text
Authentication → who is calling?                 Clerk signs, Convex verifies.
Authorization  → may they do this to this record? requireOwnedPatient decides.
```

A valid token proves identity and grants nothing. Every function in `convex/audit.ts` does
both, in that order, before it reads or writes anything else.

---

## 2. Clinical Provenance Versus Audit Evidence

They answer different questions for different readers.

```text
Provenance  "Where did this number come from?"   travels WITH the measurement
            origin, sourceType, sourceDeviceId, observedAt, ingestedAt, isSynthetic
            read by: a clinician deciding whether to trust the value

Audit       "Who did what, to which record, when?" sits BESIDE the data
            actorType, actorSubject, eventType, resource reference, occurredAt
            read by: whoever investigates what an account did
```

Two consequences shape the schema. Provenance must not depend on the audit log — a reading
has to be interpretable on its own. And the audit log must not become a second copy of the
clinical data, which is why it holds references and never values.

The *who* of a manual reading therefore lives in its audit event (`resourceId` = the
measurement), not on the measurement. The historical manual rows could not be attributed
honestly anyway — see §7.

---

## 3. `origin` Versus `sourceType`

```ts
sourceType: "simulatedWearable" | "manualEntry" | "seedFixture"      // what kind of device
origin:     "seedFixture" | "userManualControl" | "systemProducer"   // how the row got in
```

They look redundant for fixtures and diverge for everything else. A future simulator row is
`simulatedWearable` + `systemProducer`: a simulated device, produced by a program. The manual
control is `manualEntry` + `userManualControl`: a person pressed a button. Both are set by
server code; neither can be supplied by a caller (proven — §11).

`systemProducer` is defined now and written by nothing. Phase 6's simulator will have no Clerk
session and no token, so there is no person it could honestly be. Recording it as a user would
be forging an identity. The audit vocabulary has the matching `actorType: "system"` for the
same reason.

---

## 4. Why a Successful Write Can Be Audited Atomically

A Convex mutation is one serializable transaction. Every `ctx.db.insert` inside it commits
together or not at all.

```text
recordSyntheticHeartRate
  requireUserActor          → actor from the verified token
  requireOwnedPatient       → throws for missing or someone else's
  synthetic + bounds checks → throws on anything invalid
  insert measurement        ┐
  insert audit event        ┘ commit together
```

There is no state in which a reading exists without its event, or an event describes a
reading that never landed. No outbox, no second write to reconcile. Every check sits *before*
the first insert, so a rejected call has nothing to roll back — and if one were ever added
after, the rollback would take both rows anyway.

`ensureMyDemoPatient` works the same way: the patient, its twelve fixture rows, and one
`patient.created` event commit together. An existing patient gets **no** event — its creation
happened before audit existed, and writing one now would record an event at a time it did not
occur.

---

## 5. Why a Denial Cannot Be Audited Here

```text
insert denial event
throw "Patient not found"   → transaction aborts → the denial event is rolled back too
```

A throw discards every write in the transaction, including one made a line earlier. The only
ways to persist a denial are to *return* a failure instead of throwing (so the mutation commits
the record — a different API contract), or to write it from a separate transaction, which needs
an action or a scheduled function. Both are outside what this project currently permits.

So `auditOutcome` is `v.literal("succeeded")` — one value. A `"denied"` literal would advertise
evidence this design cannot produce. Denials remain visible only in Convex's platform logs.

---

## 6. Why a Query Rerun Is Not a Chart View

A subscribed query reruns whenever anything in its read set changes. Every new heart rate
reruns `listRecentForPatient` for every open tab. Counting reruns as views would turn one
clinician opening a chart into hundreds of "views", recording plumbing as human intent.

Queries also cannot write at all. Logging reads from inside the read path is impossible by
construction, not merely unwise.

---

## 7. The Workspace-Access Event

A person opening a patient's workspace is a human act that happens once. It is recorded by an
explicit mutation, `audit:recordPatientWorkspaceAccess`, called from
`useRecordPatientWorkspaceAccess` when the workspace has an authenticated patient loaded.

**Why `useEffect` is right here.** The effect reports something that happened to a system
outside React. It does not fetch anything — the measurements still arrive only through their
subscription. That is the case effects exist for.

**Why it needs server-side idempotency.** The effect can run more than once for one mount:
Strict Mode runs it twice in development, and across a reconnect the patient ID drops to
`undefined` and comes back. So the hook generates one `crypto.randomUUID()` per mount, keeps it
in a ref, and sends it every time. The server looks it up on
`by_actorSubject_and_eventType_and_patientId_and_correlationId` and writes only if nothing
matches.

Two simultaneous calls with the same key both read that empty index range. Convex's
serializable transactions detect that each read a range the other wrote into; one retries, sees
the other's row, and returns `recorded: false`. The client's guard is a courtesy; the server's
is the guarantee.

**What it is not.** The browser decides to make this call. A modified client can read the
query without ever calling it. The event proves *who* opened *which owned patient* when it is
present; its absence proves nothing. It is client-declared evidence, not read enforcement.

---

## 8. Correlation ID Yes, Actor Never

```text
correlationId  from the browser → allowed: it groups events; a lie only mis-groups them
actorSubject   from the browser → never: it grants meaning to every event it is on
```

The correlation ID is still validated: it must match `crypto.randomUUID()`'s lowercase UUID
shape exactly, so it cannot carry smuggled text (proven — a payload appended to a valid UUID is
rejected). The actor always comes from `requireUserActor`, which has no argument through which
a caller could influence it.

---

## 9. What an Audit Row May Contain

```text
auditEvents: actorType, actorSubject, eventType, resourceType, resourceId?, patientId?,
             occurredAt, correlationId?, outcome, isSynthetic
```

Everything is either server-derived or a validated grouping key. There is no field for a
measurement value, patient name, email, token, cookie, request payload, stack trace, or
free-form metadata — and `AuditEventInput` in `convex/audit.ts` is a union with one variant
per event, so code writing an event has nowhere to put one either.

Audit logs are copied, exported, and retained longer, and read by more people, than the
clinical data. Every value copied in becomes a less-protected second copy of the chart.

There is no public update or delete function for this table. That makes it append-only *to
the application*, not tamper-evident — see §13.

---

## 10. Indexes, and Why the Fields Are in That Order

```text
by_actorSubject_and_occurredAt
  actor first → the range contains one account's events and nothing else
  time second → .order("desc").take(n) is a range read, newest first, no sort

by_actorSubject_and_eventType_and_patientId_and_correlationId
  four equality checks, broadest first; actor first so one account's
  correlation IDs can never match, or be probed against, another's
```

Both exist because a function reads through them. No speculative indexes.

`listMyRecentEvents` returns a minimum-necessary projection — `eventType`, `resourceType`,
`occurredAt`, `outcome`. No actor identifier (the caller knows who they are), no document ID,
no patient reference. The dashboard panel is labelled "Synthetic activity history", not
"audit log": one account's view of its own synthetic activity, with nothing behind it that a
compliance audit log requires.

---

## 11. The Provenance Migration

The 36 fixture rows said `simulatedWearable` / `sim-wearable-01`. No simulator has ever run —
the seed inserted constants. That was fabricated provenance, and the migration corrected it
rather than annotating around it.

Same three-deploy shape as `ownerSubject` in Phase 4:

```text
Stage 1  origin optional; sourceType widened with seedFixture; auditEvents added
Stage 2  internal backfill from exact known identifiers; throw on anything else
Stage 3  origin required — the push itself validates all 65 rows
Then     temporary migration functions removed, confirmed absent from the deployment
```

```text
                      before   after
total                    65      65
missing origin           65       0
seedFixture               0      36   (sourceType + device relabelled)
userManualControl         0      29
systemProducer            0       0
stale sim-wearable-01    36       0
re-run                   —      changed nothing
```

No actor was written onto historical manual rows. Some were made by the browser; some by
injected CLI identities during Phase 5 verification; nothing in a row tells them apart.
Unknown precision stays unknown.

---

## 12. Test Evidence

Injected identities (`npx convex run --identity`) against the development deployment. This
proves authorization logic, validators, index scoping, and transactional behaviour; it does not
exercise token minting or the provider wiring (see `phase-04-identity.md` §14).

```text
signed out → listMyRecentEvents                    Not authenticated
signed out → recordPatientWorkspaceAccess          Not authenticated
signed out → recordSyntheticHeartRate              Not authenticated
A → listMyRecentEvents + actorSubject: B           extra field rejected
A, B, C → listMyRecentEvents                       2, 1, 1 — each only its own (4 total)
A → access on B's patient                          Patient not found; events unchanged
actorSubject | actorType | outcome | isSynthetic |
  eventType | occurredAt as arguments              extra field rejected
origin | sourceType | actorSubject on heart rate   extra field rejected
ownerSubject on ensureMyDemoPatient                extra field rejected
malformed ID; measurement ID as patient ID         validator rejects
correlationId "abc" | uppercase | UUID + payload   Invalid correlation ID
same access call ×3                                true, false, false; +1 row
valid heart rate                                   +1 measurement, +1 event
250 bpm | 5 bpm | string | A on B's patient        +0 measurements, +0 events
A ↔ B measurement reads                            Patient not found, both directions
new user C → ensureMyDemoPatient ×2                one patient.created; second call +0
existing users → ensureMyDemoPatient               +0 events
new fixture rows                                   12 × seedFixture / seed-fixture
stored audit fields                                no value/name/email/token/payload field
```

Not verified in this phase: the panel and the access effect in a live browser session. The
Chrome automation extension was disconnected; see `PHASE_LOG.md` for whether the owner
confirmed it.

---

## 13. What This Phase Does Not Solve

- A modified client can skip the workspace-access call.
- Query reruns are deliberately not logged as access, and queries cannot write.
- Denied operations are not durably audited (§5).
- Audit rows are not cryptographically tamper-evident — no hash chain, no external anchor.
- Deployment administrators remain privileged: an admin key can alter or delete any row.
- No roles and no clinician assignments; ownership is the only rule.
- No retention policy for audit rows, and no erasure path (S-06).
- No BAA, incident response, backup and restore, monitoring, or production controls.
- Identity is keyed on `subject`, which is safe only while one issuer is trusted (S-21).
- **No HIPAA compliance claim is made.** S-05 is Partial, not Resolved.

---

## 14. Phase 5.5 Mental Model

```text
token → requireUserActor → requireOwnedPatient → validate
      → insert the record → insert its audit event → commit both, or neither
```

The principles:

1. The caller may name a record; it may never name itself, its outcome, or its provenance.
2. Provenance travels with the data; audit evidence sits beside it and holds references only.
3. One transaction makes the record and its evidence inseparable.
4. A throw erases everything, so this design audits successes, not denials.
5. A rerun is the transport noticing a write, not a person looking.
6. Client-declared evidence names the real actor, but only enforcement proves absence.
7. A label that claims a device that never existed is a defect, even in synthetic data.
