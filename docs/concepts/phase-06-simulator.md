# A Producer With No Person Behind It

## Post-PCI Watch — Phase 6 Reference

Until now every row came from a person pressing a button, or from seed constants. Phase 6 adds
the first producer that acts on its own: a synthetic wearable that runs on Convex's servers,
writes three vitals every five seconds, and stops by itself.

It is a software-test model. Nothing it produces is a validated physiological signal, and
nothing it produces carries clinical meaning.

---

## 1. Why the Loop Runs on the Server

Three places could drive a simulator. The owner chose the first.

```text
Convex scheduler   runs with no tab open; one loop per patient however many tabs;
                   writes as a system producer; needs ctx.scheduler (newly permitted)
Browser timer      stops when the tab closes; two tabs double the stream
Local script       needs an admin key on the machine; nothing runs in a deployed demo
```

---

## 2. What `ctx.scheduler.runAfter` Actually Does

```ts
await ctx.scheduler.runAfter(5_000, internal.simulator.tick, { simulatorId });
```

This does not start a timer in memory. It writes a job into the deployment's scheduled-function
queue — a system table — **as part of the calling mutation's transaction**. If the mutation
throws, the job was never scheduled. When the job comes due, Convex runs `tick` as a fresh
mutation with its own transaction.

So the chain is: `start` schedules tick #1 → tick #1 writes rows and schedules tick #2 → …
Each link exists only if the previous one committed.

---

## 3. Who Can Call What

| Function | Kind | Caller | Check |
| --- | --- | --- | --- |
| `simulator:getForPatient` | query | browser | `requireOwnedPatient` |
| `simulator:start` | mutation | browser | actor from token, `requireOwnedPatient`, synthetic patient |
| `simulator:stop` | mutation | browser | actor from token, `requireOwnedPatient` |
| `simulator:tick` | **internal** mutation | the scheduler only | session running, not expired, patient synthetic |

`tick` has no user identity — scheduled functions never do. Its checks are therefore about the
session's own bounds, not about a caller. An authenticated client asking for it is told the
function does not exist (verified).

---

## 4. Why Stop Cannot Leave a Loop Running

`stop` cancels the pending tick by the ID stored in `nextTickId`. The race worth worrying about
is a tick that is *already executing* when stop arrives. Both write the same `simulators`
document, so Convex's serializable transactions order them:

```text
tick commits first → it stored the next tick's ID → stop reads it and cancels that one
stop commits first → the tick conflicts, retries, finds status "stopped", and returns
```

Either way no chain survives. Verified: after stop, the row count stayed flat.

`start` refuses to begin a second chain while one is running, so two tabs clicking Start
produce one stream.

---

## 5. The Model

Four states, each with its own value ranges and a minimum dwell time. Only these moves exist:

```text
RESTING  → WALKING (2:1) or SLEEPING
WALKING  → RECOVERY
RECOVERY → RESTING
SLEEPING → RESTING
```

On entering a state, each vital picks a **target** inside that state's range. Every tick moves
25% of the remaining distance toward it, plus a small jitter. That is the difference from
"unrestricted randomness": values drift toward where the state says they should be, and a state
change produces a gradual climb or fall, not a jump.

The model lives in `convex/simulatorModel.ts` as pure functions with no database access, so it
can be read — and reasoned about — without the orchestration around it. Internal state keeps
full precision; the rows store rounded values, as a device would report.

---

## 6. Provenance and Actors

```text
measurement rows   origin: systemProducer · sourceType: simulatedWearable ·
                   sourceDeviceId: convex-simulator-v1
start / stop       audit actor: the user who clicked (from the token)
auto-stop          audit actor: system:wearable-simulator
```

This is the Phase 5.5 design used for real. A program stopping a session is recorded as a
program; nothing is attributed to a person who did not act. Individual ticks are not audited —
their provenance is on every row they wrote, and 180 audit rows per session would bury the
events a person caused.

Because `listMyRecentEvents` reads by the caller's own actor subject, an auto-stop does not
appear in the user's activity history. That is correct: it is not their action.

---

## 7. Bounds

A session auto-stops 15 minutes after it starts: at most 181 ticks, 543 rows. The simulator's
own state lives in a separate `simulators` table, one document per patient, because it changes
every tick; on the patient document it would rewrite the patient and rerun every query that
reads it.

---

## 8. Test Evidence

Injected identities against the development deployment:

```text
signed out → start                    Not authenticated
B → start / stop on A's patient       Patient not found
A → start                             started: true
A → start again                       started: false (no second chain)
A → tick                              function not found (internal)
running                               ticks at 5 s intervals, 3 rows each
rows                                  systemProducer / simulatedWearable / convex-simulator-v1
A → stop, stop again                  stopped: true, then false
after stop                            no further rows
audit                                 simulator.started, simulator.stopped as user_AAA
```

Auto-stop: see `PHASE_LOG.md` for the result of the full 15-minute session.

---

## 9. Phase 6 Mental Model

```text
Start (user, owner-checked) → schedule tick
tick (no user) → check bounds → advance model → write 3 rows → schedule next tick
Stop (user) or 15 min (system) → chain ends, attributed to whoever ended it
rows → existing subscriptions → dashboard
```

1. A scheduled job is a row written inside a transaction, not a timer in memory.
2. Internal functions are the only way to run code no client can call.
3. With no caller, a function checks its own bounds instead of an identity.
4. Serializable transactions are what make stop-versus-tick safe.
5. A program acts as a program: system actor, system origin.
6. Every autonomous loop needs a hard stop.
