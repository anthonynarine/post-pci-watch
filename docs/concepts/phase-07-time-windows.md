# Time Belongs to the Client

## Post-PCI Watch — Phase 7 Reference

Until Phase 7 the "Current observations" cards were hardcoded fixtures — a 93 % SpO₂ that no
database held, shown beside live rows that said otherwise. Phase 7 replaces them with stored
data and adds two windows: the last 5 minutes and the last hour.

---

## 1. Why a Query Cannot Say "The Last Hour"

A Convex query reruns when a document it read changes. It does not rerun because time passed.
A query that computed `Date.now() - 1 hour` itself would compute it once, and keep answering
for that instant until some write happened to rerun it — a window that silently freezes. The
Convex guidelines forbid clock reads in queries for exactly this reason.

So the client owns time:

```text
useNow(15 s) → floor(now) → since = now − window → summarizeWindow({ patientId, since })
```

`useNow` floors to its step so `since` changes at most once per step. A value that changed on
every render would give the query new arguments every render and resubscribe continuously.
This is a clock, not polling: when it ticks, nothing is fetched — at most one argument moves.

Between steps, new readings still arrive the moment they commit, through the subscription.
The stated cost of the step: a reading can stay counted for up to 15 s after it leaves the
window.

`useNow` starts as `null` and is set in an effect, so the server render and the first client
render agree; queries that need it are skipped until it exists.

---

## 2. The Per-Vital Index

```text
by_patientId_and_measurementType_and_observedAt
```

Patient first (ownership scope), type second, time third. "Latest heart rate" is one
descending `.first()`; a window is one bounded range per vital. The older
`by_patientId_and_observedAt` interleaves every vital in one range, so "latest SpO₂" would
mean scanning past heart-rate and respiratory rows to find it.

---

## 3. Summaries, Not Rows

`summarizeWindow` returns count, min, mean, max, and latest per vital. An hour of simulator
output is 720 rows per vital; the browser needs five numbers. Each vital's read is capped at
1,000 rows, newest first, and the response says `truncated` if any cap was hit, so a summary
never silently claims to cover more than it read.

`getCurrentVitals` returns the latest reading and its time — not whether it is current. That
judgement needs the clock, so the client makes it: "Live" if observed within 30 s (six missed
ticks), otherwise "Not current".

---

## 4. Freshness Is Not a Clinical Judgement

Every badge in this phase says whether a reading is recent. None says whether a value is
acceptable. The fixture cards had "Below threshold" on SpO₂; that label came from no rule and
is gone. Threshold flags are Phase 10, as deterministic rules with their configuration stated.

---

## 5. Test Evidence

```text
B (simulator running) → getCurrentVitals        latest HR/SpO₂/RR, origin systemProducer
B → last 5 minutes                              49 readings per vital; HR 55–65, RR 11–14
                                                 (the model's SLEEPING profile, with drift)
A → last hour                                   6 HR = 5 simulator + 1 manual
A → since 0                                     includes the March 2026 seed fixtures
A → B's current vitals / B's window             Patient not found
since as a string                               validator rejects
```

Not yet observed in a browser at the time of writing — see `PHASE_LOG.md`.

---

## 6. Phase 7 Mental Model

1. A query answers "what is stored"; only the client knows "what time is it".
2. Floor the clock, or every render resubscribes.
3. Index in the order you narrow: owner, vital, time.
4. Send the summary the screen needs, and say when it is partial.
5. "Recent" and "acceptable" are different claims; this phase makes only the first.
