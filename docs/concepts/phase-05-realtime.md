# Realtime Without a Refresh

## Post-PCI Watch — Phase 5 Reference

Phase 3 built a subscription and could not prove it did anything. Nothing in the data ever
changed, so "the table is live" was an architectural claim resting on a diagram.

Phase 5 changes one value and watches what happens. This document records the mechanism and,
separately, exactly which parts of it were observed and which were not.

---

## 1. What a Subscription Is

A subscription is a standing registration: *this client wants the result of this query, with
these arguments, and wants to be told whenever that result changes.*

It is not a request. A request has a beginning and an end. A subscription has a beginning and
then persists, producing new values over time without anyone asking again.

```text
Request       ask → answer → done
Subscription  register → answer → answer' → answer'' → … → unregister
```

The client never polls. It registers once and waits to be told.

---

## 2. What the Convex WebSocket Carries

One WebSocket per `ConvexReactClient`, shared by every subscription in the tab:

```text
client → server   subscribe(query, args), unsubscribe, mutation calls, auth token
server → client   query results, result updates, mutation acknowledgements, errors
```

The important direction is server → client. HTTP cannot do this: a server that finishes a
response has no channel back to that browser. A WebSocket stays open in both directions, so
the server can speak first.

All of this rides on one connection. Twenty subscriptions do not mean twenty sockets.

---

## 3. Reactive Query Versus One-Time Request

```text
fetch('/api/measurements')     one answer, correct at the moment it was computed,
                               stale immediately afterwards, and the client cannot tell

useQuery(api.measurements…)    a value that is kept correct
```

The difference is not how the first value arrives — both produce data. The difference is what
happens *afterwards*. A `fetch` result begins decaying the instant it lands, and the only
remedies are to ask again on a timer, ask again on a guess, or show something out of date.

A reactive query has no staleness window to manage, because the server updates it.

This is why the rest of the data-fetching toolkit is absent here. Cache invalidation, refetch
intervals, and "is this stale" heuristics exist to manage a problem this model does not have.

---

## 4. What a Mutation Does

A mutation is a transactional write. It runs on the server, reads and writes the database,
and either fully commits or fully does not.

`recordSyntheticHeartRate` authenticates, authorizes the patient, validates the value,
inserts one document, and returns a small result:

```ts
return { measurementId, value: args.value, observedAt: now };
```

That return value is an acknowledgement — "your write landed, here is its ID". It is not how
the new row reaches the screen.

---

## 5. Why a Mutation Is Not a Subscription

A mutation answers the caller. Once.

```text
Mutation      one client asked → one client is answered
Subscription  every client that registered is told, including ones that never asked
```

In `RecordSyntheticHeartRate.tsx`, the return value is deliberately discarded:

```ts
await recordSyntheticHeartRate({ patientId, value: nextDemoValue() });
// Nothing is done with the return value on purpose.
```

If the component returned the new row and the UI rendered it, only *that* client would ever
see it. The second client, watching the same patient, would be looking at stale data with no
way to know. The write has to travel through the database and out to every subscriber, or it
only reached the person who clicked.

---

## 6. Why the Query Reruns

This is the mechanism, and it is worth being precise because it is the thing Phase 5 exists
to demonstrate.

When Convex runs a query it records which documents that execution **read** — the read set.
The subscription is stored alongside it.

```text
listRecentForPatient({ patientId: X, limit: 9 })
  read set: the index range by_patientId_and_observedAt for patient X
```

A mutation commits and Convex compares what it **wrote** against every stored read set:

```text
insert measurement { patientId: X, … }
  → falls inside the index range that subscription read
  → that subscription's result may have changed
  → rerun the query on the server
  → result differs → push the new result to every client holding that subscription
```

Three properties follow, none of them obvious:

- **The client is not consulted.** It did not ask, poll, or receive a "something changed"
  ping to follow up on. It receives the new answer.
- **Overlap is what matters, not table names.** A write to a *different* patient does not
  touch this read set and reruns nothing. The scoping is precise.
- **Rerunning happens on the server.** The client receives a result, not an invalidation it
  must act on.

This is why queries must be read-only, and why they must not read the wall clock. A query
Convex cannot re-execute deterministically is a query it cannot keep correct.

---

## 7. What Causes React to Rerender

Nothing exotic. `useQuery` is a hook that returns a value; when Convex pushes a new result,
the hook returns a different value, and React rerenders the component that called it.

```text
new result arrives on the socket
→ the Convex React client updates the hook's value
→ useQuery returns something new
→ React rerenders MonitoringDataWorkspace
→ measurements.map(toMeasurementRow) produces a new array
→ RecentMeasurements renders the new row
```

No `key` tricks, no forced update, no subscription code inside the component. The component
is an ordinary function of its inputs, and one of its inputs changed.

---

## 8. Why `useEffect`, Polling, `router.refresh()`, Manual Refetch, and Query Invalidation Are All Absent

Each of these solves a problem this architecture does not have.

| Tool | The problem it solves | Why it is absent |
| --- | --- | --- |
| `useEffect` + fetch | Getting data after mount | The subscription already delivers data, including later data |
| Polling | Not knowing when data changed | The server knows and says so. Polling would ask "anything new?" thousands of times to catch one change |
| `router.refresh()` | Re-rendering a server route to pick up new data | Re-runs the whole server render to update one table row, and drops the client state around it |
| Manual refetch | Fetching again after a write | Would update only the tab that wrote. Every other client stays wrong |
| TanStack Query invalidation | Telling a cache its entry is stale | There is no client cache to invalidate. See below |

### On "invalidation"

The word is easy to misread. Something that behaves like invalidation does happen, but **our
frontend never performs it, and there is no API for it to call.**

```text
TanStack Query   client-side cache, client decides what is stale,
                 client calls queryClient.invalidateQueries(), client refetches

Convex           server-side read-set tracking, server decides what changed,
                 server reruns the query, server pushes the result
```

In TanStack Query, invalidation is a call you make and can forget to make. In Convex it is a
consequence of the write, derived from what the query actually read. There is no
`invalidate()` to call, and forgetting is not possible.

The practical difference: a Convex mutation that writes a row a query reads *cannot* leave
that query stale. A developer cannot get it wrong, because there is nothing to get right.

---

## 9. Why a Manual Write Instead of the Phase 6 Simulator

The simulator produces a stream. A stream is worse evidence than a single click.

- **One button press is one event with one cause.** A row appearing after a click is
  attributable. A row appearing in a stream of rows appearing every few seconds is not — it
  would be impossible to tell reactivity from an interval, which is exactly the confusion
  this phase must eliminate.
- **A simulator can hide a broken subscription.** With values arriving continuously, a UI
  that silently reloads, polls, or refetches looks identical to one that is genuinely
  reactive.
- **The mechanism should be understood before it is automated.** Phase 6 builds a producer
  with physiologically plausible state transitions. That is a different problem — modelling —
  and stacking it on top of an unverified transport would confuse two independent failure
  modes.

The click is the control variable.

---

## 10. Why Optimistic UI Is Excluded

Convex supports optimistic updates. Using one here would have destroyed the demonstration.

An optimistic update writes the expected result into the local store immediately, so the row
appears before the server has confirmed anything:

```text
With optimism:    click → row appears instantly (local guess) → server confirms later
Without optimism: click → … → row appears when the server sends it back
```

The row appearing would then prove nothing. It would be the client rendering its own
prediction, and it would look exactly the same whether the write succeeded, failed, or was
rejected by an authorization check.

**This phase needs the displayed value to have come back from backend truth.** The small
delay between click and row is not a defect here — it is the evidence. It is the round trip,
visible.

There is a second reason to be wary in this project specifically: an optimistic row is a
fabricated clinical value displayed as though it were recorded. In a monitoring interface,
showing a measurement that does not exist in the database is the wrong default, even briefly.
If optimism is ever added, it belongs where a failed write is visually distinguishable from a
confirmed one.

---

## 11. The Complete Mechanism

```text
Click "Record synthetic heart rate"
→ useMutation sends recordSyntheticHeartRate({ patientId, value }) over the WebSocket
→ SERVER: requireOwnedPatient — authenticate, authorize, before anything is written
→ SERVER: reject non-synthetic patient, non-finite value, value outside 30–200 bpm
→ SERVER: insert one measurement { measurementType: "heartRate", isSynthetic: true,
           sourceDeviceId: "manual-phase5-control", observedAt, ingestedAt }
→ COMMIT

→ Convex compares the write against every stored read set
→ the new row falls inside by_patientId_and_observedAt for this patient
→ that subscription's query is rerun ON THE SERVER
→ the new result is pushed to EVERY client holding it — including clients that did not write

→ CLIENT: useQuery returns a new array
→ React rerenders MonitoringDataWorkspace
→ RecentMeasurements renders the new top row

No refetch. No invalidation call. No effect. No navigation.
```

---

## 12. Test Evidence

### Authorization — all passed

| Test | Result |
| --- | --- |
| Signed out | `Uncaught Error: Not authenticated` |
| User A writes to A's patient | `measurementId: j57ceqny…`, `value: 75` |
| User B writes to A's patient | `Uncaught Error: Patient not found` |
| Inject `ownerSubject` argument | `ArgumentValidationError: Object contains extra field` |
| Malformed patient ID | `ArgumentValidationError: Value does not match validator` |
| Measurement ID as `patientId` | `ArgumentValidationError: Found ID … from table \`measurements\`` |
| 250 bpm | `Heart rate must be between 30 and 200 bpm` |
| 5 bpm | `Heart rate must be between 30 and 200 bpm` |
| `"75"` as a string | `ArgumentValidationError: Value does not match validator` |

**Not tested:** a non-synthetic patient. The schema declares `isSynthetic: v.literal(true)`,
so a fixture violating it cannot be created without widening the schema, which was out of
scope. The guard exists and is currently unreachable by construction.

### Reactivity — single browser client: PROVEN

Signed in as the real Clerk user, dashboard open, no navigation between the two observations.

```text
BEFORE  top row:  2026-09-21 22:32:03 | Heart rate | 69 bpm | manual-phase5-control
        click "Record synthetic heart rate"
AFTER   top row:  2026-09-21 22:33:19 | Heart rate | 67 bpm | manual-phase5-control   (+2s)
        previous row still present below it
```

Network requests captured for the tab across the click: **none**. No document navigation, no
XHR, no fetch. The update arrived over the already-open WebSocket.

### Reactivity — cross-client push: PROVEN, but not with two browser tabs

An independent second client subscribed to the same query via the CLI
(`npx convex run … --watch`), then a **different** client performed the write:

```text
watcher initial result   values 75, 93
separate client writes   recordSyntheticHeartRate → value 111
watcher prints again     values 111, 75      ← unprompted, no request made
```

The watching client asked for nothing and received a new result because another client wrote.
That is cross-client push, demonstrated end to end.

### Reactivity — two browser tabs: NOT PROVEN

**The required two-tab test could not be completed, and this phase does not claim it.**

Opening a second browser tab reproducibly causes the *first* tab to lose its Convex
authentication. The first tab drops to "Authenticating with Convex…" and does not recover
without a reload; reloading it then breaks the other one. Observed three times, and visible
in the deployment logs as repeated `Uncaught Error: Not authenticated` on both queries while
the browser believes it is signed in.

This is an authentication-lifecycle problem, not a reactivity problem — the subscription
machinery is proven by the two tests above. It is recorded as **S-20** in
`docs/security/SECURITY_POSTURE.md` and is related to the token-refresh path that
`phase-04-identity.md` §17 already listed as untested and that S-02 depends on.

Until a second real browser tab visibly updates, the statement "both tabs update without a
refresh" remains unverified.

### Regression

`npm run lint` clean · `npx tsc --noEmit` clean · `npm run build` succeeds (5/5 routes) ·
signed-out `/dashboard` still returns 307 to sign-in · no CSP violations in the console (only
the pre-existing ColorZilla extension hydration warning and Clerk's development-keys notice) ·
no secret value in the client bundle — the only match for `CLERK_SECRET_KEY` is the variable
*name* inside Clerk's SDK reading `process.env`, with no `sk_` value present.

---

## 13. Phase 5 Mental Model

```text
mutation commits
→ server compares the write against stored read sets
→ overlapping queries rerun on the server
→ new results pushed to every subscribed client
→ useQuery returns a new value
→ React rerenders
```

The principles:

1. A subscription is a standing registration, not a repeated request.
2. A mutation answers the caller; the subscription tells everyone.
3. The server decides what changed, from what the query actually read.
4. The client never polls, never invalidates, and never refetches.
5. Optimistic UI would have made the demonstration prove nothing.
6. One manual write is better evidence than a stream.
7. Proving the mechanism for one client is not proving it for two.
