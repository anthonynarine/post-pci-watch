# Convex Major Concepts

## Post-PCI Watch — Phase 3 Reference

This document records the backend concepts demonstrated during Phase 3. The goal is not to
memorize Convex's API. The goal is to know which machine runs which code, what a
subscription actually is, and why one component in the dashboard had to cross the client
boundary while the rest did not.

Everything below describes the code that is actually in this repository: schema in
`convex/schema.ts`, one seed in `convex/seed.ts`, two queries in `convex/patients.ts` and
`convex/measurements.ts`, and one Client Component in
`src/features/monitoring/components/MonitoringDataWorkspace.tsx`.

---

## 1. Convex Versus the Next.js Server

These are two separate servers running two separate programs, and in Phase 3 they never
speak to each other. The browser speaks to both.

```text
Browser ──── HTTP request ────→ Next.js server (renders the page, returns HTML)
   │
   └──────── WebSocket ───────→ Convex deployment (holds the data, pushes updates)
```

The Next.js server's job ends when it finishes a request. It hands back HTML and holds no
connection to that browser afterward — it has no channel to push anything down, and no
memory of who asked. (The process keeps running to serve the next request; what ends is the
execution of *this* request. Nothing about it is "still watching" your page.)

Convex is the opposite. It keeps a WebSocket open for as long as the tab is alive, remembers
which queries that tab is subscribed to, and sends a new result whenever the data behind one
of them changes.

That difference is the reason for every architectural decision in this phase.

---

## 2. Development Deployments

A **deployment** is one running instance of your backend: its own URL, its own data, its own
copy of your functions, its own environment variables. This project's is:

```text
proficient-panda-85 (development)
https://proficient-panda-85.convex.cloud
```

Production is not a flag on that deployment. It is a *different* deployment with a different
URL and completely separate data. Seeding development does nothing to production, and that
is the point — a deployment is an isolation boundary, not a setting.

`npx convex dev` pushes the local `convex/` directory to the development deployment and
watches for changes. `npx convex dev --once` does the same push and exits, which is what
this phase used.

---

## 3. What `convex/` and `_generated/` Are

`convex/` is the source code of the deployment. It is not Next.js code that happens to sit
in the repo; none of it ever runs on the Next.js server. When you push, Convex takes these
files, validates them, and runs them in its own V8 runtime.

`convex/_generated/` is written *by* Convex on every push. It is the typed bridge between the
two programs:

| File | What it gives you |
| --- | --- |
| `api.d.ts` / `api.js` | `api.patients.getByDemoKey` — a reference to a deployed function |
| `dataModel.d.ts` | `Doc<"measurements">`, `Id<"patients">` — types derived from your schema |
| `server.d.ts` / `server.js` | `query`, `mutation`, `internalMutation`, and the `ctx` types |

Two consequences worth internalizing:

- `api.measurements.listRecentForPatient` typechecks in the frontend **only because the push
  succeeded**. The generated file is downstream of a real deployment, so a type error in the
  browser can mean the backend never deployed.
- Never edit anything in `_generated/`. This project ignores it in `eslint.config.mjs` for
  the same reason: it is output, not source.

---

## 4. Documents and Document IDs

Convex stores **documents**, not rows. There is no fixed column set enforced by the storage
engine, no `ALTER TABLE`, and no joins.

Every document gets two system fields automatically:

```text
_id            the document's ID, e.g. "j976c2694sss3bdpvhd25nyn958etbge"
_creationTime  epoch milliseconds, set on insert
```

An ID is not just a string — it carries its table. `v.id("patients")` rejects a value that
is not an ID for the `patients` table, which is why `measurements.patientId` cannot
accidentally hold a measurement's own ID.

One limit worth knowing: the validator checks that the value *is* an ID for that table. It
does not check that the document still exists. `ctx.db.get("patients", id)` returns `null`
for a deleted document, so code must still handle the null rather than assume the validator
guaranteed a hit.

"Documents, not rows" does not mean unstructured. The schema below makes Convex enforce the
shape on every write.

---

## 5. Schema Validators Versus TypeScript Types

This is the distinction that matters most for a system that will one day accept data from
outside.

```text
TypeScript type  → checked while you compile, then erased. Protects you from yourself.
Convex validator → checked at runtime on every call. Protects the database from everyone.
```

TypeScript does not exist at runtime. A caller that is not your code — a script, a curl
command, a future integration, a bug — never sees your types. The validator does.

From `convex/schema.ts`:

```ts
export const measurementType = v.union(
  v.literal("heartRate"),
  v.literal("spo2"),
  v.literal("respiratoryRate"),
  v.literal("skinTemperature"),
);
```

A union of literals rather than `v.string()` because the set is fixed. A write carrying
`"bloodGlucose"` is rejected at the boundary, not discovered three weeks later by a chart
that renders nothing. The same reasoning produced `sourceType` and `monitoringStatus`.

The validators also *generate* the types: `Doc<"measurements">["measurementType"]` is the
union above, so `TYPE_LABELS` in the workspace component is a `Record` that fails to compile
if a new measurement kind is added to the schema without a label. The schema is the single
source of truth in both directions.

Phase 3 also stores `isSynthetic: v.literal(true)` on both tables. A record that asserts its
own nature in the database cannot be mistaken for a real one by code that never saw the seed.

---

## 6. Queries, Mutations, Internal Functions, and Actions

Four registration functions, four different contracts:

| Kind | Reads | Writes | External IO | Subscribable |
| --- | --- | --- | --- | --- |
| `query` | yes | no | no | **yes** |
| `mutation` | yes | yes | no | no |
| `action` | via `ctx.runQuery` | via `ctx.runMutation` | **yes** | no |
| `internal*` | same as its kind, but not callable from a browser | | | |

**Queries are read-only, and that is what makes them subscribable.** Because Convex knows a
query cannot write, it can re-run it whenever the documents it read change, and hand the
client a new result. Subscription is a consequence of purity, not a feature bolted on.

**Mutations write.** They cannot call `fetch`. That restriction is not arbitrary — see the
next section.

**Actions are the escape hatch** for talking to the outside world: HTTP calls, AI providers,
anything non-deterministic. They have no `ctx.db` at all. An action reads and writes by
calling queries and mutations through `ctx.runQuery` / `ctx.runMutation`. Phase 3 has no
actions; Phase 11 will need one to call an AI model.

**`internal*` variants are not part of the public API.** They can only be called by other
Convex functions (or by a developer through the CLI, which authenticates with admin
credentials). This project's seed is an `internalMutation` precisely so that it is not an
endpoint on the public internet.

```text
convex/seed.ts          seedDemoData          internalMutation  ← CLI only
convex/patients.ts      getByDemoKey          query             ← browser calls this
convex/measurements.ts  listRecentForPatient  query             ← browser calls this
```

Every registered function in this project declares both `args` and `returns` validators. The
two queries derive their `returns` from the schema with `schema.doc("patients")` and
`schema.doc("measurements")`, so the declared shape cannot drift from the stored shape.

---

## 7. Transactional Behavior — and Where It Stops

**Queries and mutations are transactions. Actions are not.** Conflating these is the most
expensive mistake available in this model.

A mutation sees a consistent snapshot of the database and its writes land atomically. Convex
runs mutations with optimistic concurrency control: if two mutations touch overlapping data
concurrently, one is retried rather than allowed to interleave. The observable result is
serializable execution.

This is visible in `seedDemoData`, which inserts one patient and then twelve measurements in
a loop:

```text
seedDemoData (one mutation, one transaction)
├── insert patient
├── insert measurement × 12
└── commit  →  all 13 documents land, or none do
```

There is no half-seeded state to clean up, and no window where measurements exist pointing
at a patient that does not. That guarantee is free here — it required no locks, no
try/catch, and no cleanup code.

**An action has none of this.** It can call an external API, get a response, and then fail
before persisting anything; the external call has already happened and cannot be rolled back.
Each `ctx.runMutation` an action makes is its own separate transaction. When Phase 11 calls
an AI model from an action, "the model was charged but nothing was saved" is a state that can
genuinely occur, and it will have to be handled deliberately.

This is also why mutations cannot `fetch`: a transaction that can be retried must be safe to
re-run, and an HTTP call is not.

---

## 8. The Patient / Measurement Relationship

```text
patients                        measurements
┌────────────────────┐          ┌──────────────────────────────┐
│ _id                │◀─────────│ patientId : v.id("patients")  │
│ demoKey (unique)   │   many   │ measurementType, value, unit  │
│ name, age, …       │          │ observedAt, ingestedAt        │
└────────────────────┘          │ sourceDeviceId, sourceType    │
                                └──────────────────────────────┘
```

One patient, many measurements, modelled as a foreign key — not as an array of measurements
inside the patient document. That choice is deliberate: a document has a 1MB ceiling and
every update rewrites the whole thing, so an unbounded list of observations inside a patient
record would fail slowly and then permanently.

There are no joins. `listRecentForPatient` takes a `patientId` and reads the measurements
index directly; nothing dereferences the relationship in both directions at once.

Note also what the schema refuses to model. `measurements.value` is `v.number()`, so blood
pressure (`118/74`) and activity state (`"RESTING"`) do not fit and are still hardcoded on
the dashboard. Naming that gap is better than widening `value` to `v.string()` and losing the
ability to do arithmetic on every reading.

### Two timestamps, not one

`observedAt` is when the device says the observation happened. `ingestedAt` is when this
system received it. The seed sets them one to three seconds apart on purpose. The gap is the
signal: it reveals network delay, offline buffering, and out-of-order delivery. A system that
records only ingestion time has thrown away the clinically meaningful one.

---

## 9. Why Index Field Order Matters

```ts
.index("by_patientId_and_observedAt", ["patientId", "observedAt"])
```

An index is a sorted structure, and the field order is the sort order. This one sorts by
patient first, then by observation time within that patient. Convex appends `_creationTime`
as a final tiebreak column automatically.

The query this index exists for:

```ts
.withIndex("by_patientId_and_observedAt", (q) => q.eq("patientId", args.patientId))
.order("desc")
.take(limit)
```

Equality on the first field selects a contiguous block; ordering on the second is then free,
because the rows are already in that order on disk. The database reads `limit` rows and
stops.

**Reverse the fields and the index becomes useless for this question.** Sorted by
`observedAt` first, one patient's measurements are scattered across the whole index, and
finding their most recent nine means scanning past everyone else's. Convex would have to read
the entire table.

This is why `.filter()` is not a substitute for an index. Filtering happens *after* rows are
read, so it reduces what you see without reducing what the database touched. `.collect()` on
`measurements` would be the same mistake in a different shape: it reads every measurement a
monitoring system has ever recorded, on a table designed to grow without bound.

`listRecentForPatient` also clamps the caller's `limit`:

```ts
const limit = Math.max(1, Math.min(Math.floor(args.limit), MAX_LIMIT)); // MAX_LIMIT = 100
```

The validator proves `limit` is a number. It does not prove the number is reasonable. A
caller asking for ten million rows gets one hundred.

---

## 10. `useQuery()` and WebSocket Subscriptions

```tsx
const patient = useQuery(api.patients.getByDemoKey, { demoKey: DEMO_KEY });
```

There is no fetch call, no refetch call, no polling interval, and no cache invalidation
anywhere in this project. `useQuery` registers a subscription on the WebSocket that
`ConvexClientProvider` opened, and its return value moves through three states:

```text
undefined  → the first result has not arrived yet
value      → the current result
value'     → a new result, pushed because the underlying documents changed
```

The mechanism: Convex records which documents each query read. When a mutation changes one of
those documents, the deployment re-runs the affected query and pushes the new result to every
subscribed client. The component re-renders because its hook returned something new.

`ConvexReactClient` is constructed once at module scope, not per render, because that one
client owns the socket that every subscription in the app shares.

**Phase 3 does not demonstrate a live update.** The subscription is open and correct, but
nothing here changes a measurement after the seed, so nothing has been observed re-rendering
without a reload. Phase 5 exists to produce that first changing value, and that is when this
claim becomes evidence rather than architecture.

---

## 11. Why `useQuery()` Requires a Client Component

A Server Component renders once, produces HTML, and its execution is over. It cannot be
re-rendered later, because there is nothing left of it to re-render and no connection over
which a new result could arrive.

A subscription needs the opposite: something persistent that can receive a message minutes
later and update what is on screen. That is a browser-side React component holding state —
a Client Component.

```text
Server Component   render once → HTML → done
Client Component   render, subscribe, stay alive, re-render on each new result
```

So `MonitoringDataWorkspace` carries `"use client"` because `useQuery` cannot mean anything
without it. Note what the directive is *not* for: the component has no `onClick`, no form,
and no browser API call. Interactivity is the usual reason to cross the boundary; a live
subscription is another, and it is the one that applies here.

---

## 12. How the Client Boundary Propagates Through Imports

This is the part that surprises people, and it happened in this phase:

```text
dashboard/page.tsx            Server Component
└── MonitoringDataWorkspace   "use client"  ← the boundary starts here
    ├── RecentMeasurements    no directive — becomes part of the client bundle
    │   └── Card              no directive — becomes part of the client bundle
    └── lucide icons          client bundle
```

`RecentMeasurements` and `Card` never gained a `"use client"` directive, and both were
Server Components before this phase. Importing them from a Client Component moved them across
the boundary anyway. **The directive marks where the boundary begins; imports carry it
downward.**

Nothing broke, because both are pure presentation with no server-only dependencies. But the
honest answer to "which components are Server Components?" changed without a single directive
being added, and that is worth being able to see coming. If `Card` had imported something
server-only, the build would have failed — and the error would have pointed at `Card`, not at
the component that actually caused it.

The containment strategy is to keep the client boundary as low in the tree as possible, which
is why the dashboard page swapped exactly one section rather than becoming a Client Component
itself.

---

## 13. The Dependent-Query Skip Pattern

The measurements query needs a `patientId`, which does not exist until the patient query
resolves. Hooks cannot be called conditionally, so the hook is always called and the
*subscription* is conditional:

```tsx
const measurements = useQuery(
  api.measurements.listRecentForPatient,
  patient ? { patientId: patient._id, limit: RECENT_LIMIT } : "skip",
);
```

`"skip"` means: this subscription is declared but not opened. No request goes out, the hook
returns `undefined`, and the moment `patient` becomes a document the subscription opens with
real arguments.

Without it there is no correct alternative: calling the hook inside an `if` breaks the rules
of hooks, and passing a fake ID sends a request guaranteed to fail.

The component then handles four distinct states rather than one loading flag:

```text
patient === undefined        connecting — the first result is in flight
patient === null             connected, but this deployment has no demo patient (unseeded)
measurements === undefined   patient resolved, measurements still loading
measurements.length === 0    patient exists, no observations stored
```

`undefined` and `null` mean genuinely different things here — "not yet known" versus "known
to be absent" — and collapsing them would hide the unseeded case behind a spinner that never
stops.

Errors are the state that is *not* represented as a value: a Convex query that throws
server-side throws in the component, and React routes that to the nearest error boundary.
Phase 3 does not install one, so a backend failure blanks this subtree. Phase 14 is where
that gets handled deliberately.

---

## 14. The Complete Data Flow

```text
npx convex run seed:seedDemoData
→ internalMutation inserts 1 patient + 12 measurements in one transaction

Browser loads /dashboard
→ Next.js: proxy.ts resolves the Clerk session
→ dashboard/page.tsx (Server Component) runs await auth.protect()
→ page renders; MonitoringDataWorkspace arrives as a client island
→ ConvexClientProvider's client opens a WebSocket to the deployment

→ useQuery(api.patients.getByDemoKey, { demoKey })
   → patients:getByDemoKey runs on Convex
   → .withIndex("by_demoKey").unique()
   → the patient document is pushed back

→ useQuery(api.measurements.listRecentForPatient, …)   (was "skip" until now)
   → .withIndex("by_patientId_and_observedAt").order("desc").take(9)
   → nine documents pushed back

→ toMeasurementRow() maps each document to the presentational shape
   (numeric timestamps → fixed UTC strings, measurementType → display label)
→ RecentMeasurements renders the rows
```

Timestamps are formatted in the component, not in the database, because formatting is a
presentation concern. The formatter uses a fixed UTC layout rather than `toLocaleString()`
so that the output does not depend on which machine rendered it.

---

## 15. Why CLI and Browser Verification Are Complementary

Phase 3 was verified twice, and neither check subsumes the other.

**From the CLI:**

```text
npx convex run seed:seedDemoData        → { created: true,  measurementsInserted: 12 }
npx convex run seed:seedDemoData        → { created: false, measurementsInserted: 0  }
npx convex run patients:getByDemoKey …  → the patient document
npx convex run measurements:list… …     → three documents, newest first
```

This proves the backend in isolation: the schema accepted the writes, the seed is idempotent,
the index returns the right rows in the right order, and the limit is respected. It says
nothing about whether the app can display any of it.

**From the browser:** nine rows rendered on `/dashboard`, matching the CLI output exactly.

This proves everything the CLI cannot reach: `NEXT_PUBLIC_CONVEX_URL` is set, the provider is
mounted in the right place in the tree, the WebSocket connected, the generated API matched the
deployed functions, the skip pattern released, and the document-to-props mapping produced
correct output.

Each can pass while the other fails. A perfect backend renders nothing if the provider is
mounted in the wrong place; a perfectly wired frontend renders a spinner forever against an
empty deployment. Two checks, two different failure classes.

---

## 16. The Current Security Limitation

Both queries are registered with `query`, not `internalQuery`, and neither one calls
`ctx.auth.getUserIdentity()`.

```text
Anyone who knows https://proficient-panda-85.convex.cloud
can open a WebSocket, call patients:getByDemoKey, and read the demo patient.
No session. No token. No sign-in.
```

And the URL is not a secret: `NEXT_PUBLIC_CONVEX_URL` is compiled into the JavaScript that
every visitor's browser downloads. It is public by design, because the browser needs it to
connect.

This is acceptable in Phase 3 for exactly one reason: every record is synthetic and belongs to
a person who does not exist. It would not be acceptable for anything else.

---

## 17. Why `auth.protect()` Does Not Secure Convex Functions

`/dashboard` calls `await auth.protect()`. That check runs on the **Next.js server** and
governs exactly one thing: whether the Next.js server will render that page for this request.

The Convex deployment is a different server, reached over a different connection, and it
never sees that check.

```text
Browser ──→ Next.js /dashboard   → auth.protect() → allowed or redirected
Browser ──→ Convex WebSocket     → no check at all
```

The second arrow does not pass through the first. Nothing about protecting a page protects a
backend function, because the page is not the only way to reach it.

The current state, stated plainly:

- The **route** is locked. A signed-out browser cannot load the dashboard.
- The **data** is open. A signed-out anything can call the query directly.

Phase 4 closes this, and it takes three changes, none of which are optional:

1. `convex/auth.config.ts`, so Convex knows which JWT issuer to trust. Without it,
   `ctx.auth.getUserIdentity()` returns `null` forever.
2. `ConvexProviderWithClerk` instead of `ConvexProvider`, so the client actually attaches a
   Clerk token to its requests. Plain `ConvexProvider` sends none.
3. An identity check **inside each query function**, deriving the user from
   `ctx.auth.getUserIdentity()` server-side.

On that third point, one rule matters more than the rest: never accept a user ID as a
function argument for authorization. A browser can send any ID it likes. The only identity
worth trusting is the one the server derived from a verified token.

And authentication still is not ownership. Even after Phase 4, "somebody is signed in" is a
different claim from "this signed-in person may read *this* record." Records need an owner
field and a per-document check before that second question has an answer.

---

## 18. Phase 3 Mental Model

```text
convex/ source
→ pushed to a deployment
→ _generated/ gives the frontend typed references
→ useQuery opens a subscription over one shared WebSocket
→ a query re-runs when the documents it read change
→ the Client Component re-renders
```

The principles:

1. Convex and Next.js are two servers; the browser talks to both, and they do not talk to
   each other yet.
2. Queries are subscribable because they are read-only.
3. Queries and mutations are transactions; actions are not, and that distinction is where
   partial failure lives.
4. Validators guard the runtime; TypeScript guards the build. Only one of them is present
   when a stranger calls your function.
5. Index field order is the sort order, and it decides whether a read is a range or a scan.
6. `"use client"` marks where the boundary starts; imports carry it downward.
7. Protecting a page does not protect the data behind it.
