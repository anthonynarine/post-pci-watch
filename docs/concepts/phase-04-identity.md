# Identity Across a Trust Boundary

## Post-PCI Watch — Phase 4 Reference

This document records how a Clerk identity reaches Convex and becomes an authorization
decision. The goal is not to memorize configuration. The goal is to know which component
asserts identity, which component verifies it, which one enforces ownership, and what each
of the tests actually proved.

Phase 3 ended with a locked route in front of an open database. Phase 4 closes that gap.

---

## 1. The Complete Trust Flow

```text
Clerk session (browser)
→ getToken({ template: "convex" })        Clerk mints a JWT from the "convex" template
→ ConvexProviderWithClerk                 hands it to the Convex client, refreshes it
→ WebSocket request                       every call carries the token
→ Convex verifies the signature           against the issuer in convex/auth.config.ts
→ ctx.auth.getUserIdentity()              returns { subject, issuer, … } or null
→ authz.requireSubject(ctx)               identity.subject, and nothing else
→ ownership comparison                    patient.ownerSubject === subject
→ allowed or thrown
```

Every arrow is a place this can fail, and Phase 4's debugging lesson is that most of those
failures look identical from the browser: nothing happens.

---

## 2. Provider Ordering

```tsx
<body>
  <ClerkProvider>                    {/* owns the session */}
    <ConvexProviderWithClerk …>      {/* turns the session into a token for Convex */}
      <ThemeProvider>
        <AppHeader /> <main>{children}</main> <footer>
```

The order is a dependency, not a preference. `ConvexProviderWithClerk` calls Clerk's
`useAuth` hook, which reads Clerk's React context. Outside `ClerkProvider` that context does
not exist and the component cannot render.

Both live inside `<body>`, matching Clerk's current Next.js documentation and the structure
the Clerk CLI generates.

---

## 3. Issuer, Audience, Signature, Expiry, Subject

Five claims do the work, and each answers a different question:

| Claim | Question | Value here |
| --- | --- | --- |
| `iss` (issuer) | Who minted this? | The Clerk frontend API URL |
| `aud` (audience) | Who is it for? | `convex` |
| signature | Was it tampered with? | RS256 over the issuer's private key |
| `exp` (expiry) | Is it still valid? | 3600 seconds after issue |
| `sub` (subject) | Who is the user? | The Clerk user ID |

`convex/auth.config.ts` declares which issuer to trust:

```ts
const authConfig = {
  providers: [
    { domain: process.env.CLERK_FRONTEND_API_URL, applicationID: "convex" },
  ],
};
```

`domain` is the issuer. Convex fetches `{domain}/.well-known/openid-configuration` to
discover the JWKS endpoint, then verifies each token's signature against those public keys.
`applicationID` is checked against the `aud` claim.

Convex never asks Clerk about a specific token. It fetches public keys once and verifies
locally — which is why verification costs nothing per request, and why revoking a session
does not invalidate an already-minted token. That is the mechanism behind finding **S-02**
in `docs/security/SECURITY_POSTURE.md`: with a 3600-second lifetime, revocation can take up
to an hour to reach Convex.

`CLERK_FRONTEND_API_URL` is an environment variable on the **Convex deployment**, not on the
Next.js server. Convex reads it when `auth.config.ts` is evaluated at deploy time.

---

## 4. `ConvexProviderWithClerk`

Phase 3 used plain `ConvexProvider`. Everything worked, because nothing checked identity.

The difference is the token. Reading the installed implementation
(`convex/dist/esm/react-clerk/ConvexProviderWithClerk.js`), it wraps
`ConvexProviderWithAuth` with a token fetcher that:

- calls `getToken({ template: "convex" })`, or plain `getToken()` when the session token
  already carries `aud === "convex"`;
- returns `null` on any thrown error — **it swallows the exception**;
- re-fetches with `skipCache` when Convex asks for a forced refresh;
- rebuilds itself when `orgId`, `orgRole`, or `sessionId` change, so the client re-authenticates.

Plain `ConvexProvider` sends no token at all. Swapping it back would raise no error in the
browser; every protected query would simply start failing with "Not authenticated".

That swallowed exception is worth remembering. It is why a misconfigured token path produces
silence rather than a stack trace.

---

## 5. `ctx.auth.getUserIdentity()`

Inside any Convex query, mutation, or action:

```ts
const identity = await ctx.auth.getUserIdentity();  // UserIdentity | null
```

It returns `null` in three different situations that are indistinguishable from the caller's
side:

1. No token was presented.
2. A token was presented but failed signature, issuer, audience, or expiry verification.
3. `auth.config.ts` is missing or names an issuer that does not match.

All three mean "not authenticated". None of them throws. **Silence is the failure mode**,
and case 3 is the one that consumed the most time in this phase.

`identity.subject` is the stable Clerk user ID. It is the only value this project writes to
`ownerSubject`.

---

## 6. Authentication Versus Authorization

```text
Authentication → who is making this request?     Clerk answers this.
Authorization  → may they do this to this record? The application answers this.
```

Phase 2 established authentication for the *route*. Phase 4 adds authorization for the
*record*, and they are genuinely separate:

```text
Phase 2  auth.protect() on /dashboard   → protects a page on the Next.js server
Phase 4  requireOwnedPatient() in Convex → protects a record on a different server
```

The second does not follow from the first. `auth.protect()` governs whether Next.js renders
a page. Convex is a different server reached over a different connection, and the browser
holds its public URL. Locking the page never locked the data.

Even now, "somebody is signed in" and "this person may read *this* record" remain different
claims. The first is authentication; only the second is ownership.

---

## 7. Why Browser-Supplied Identity Is Untrusted

A browser can send anything. A request body claiming `userId: "user_AAA"` costs nothing to
forge, and no amount of frontend code makes such a claim meaningful — the frontend is the
part under the attacker's control.

The rule this project follows: **a caller may name a record; it may never name itself.**

```text
patientId  from arguments  → allowed, because ownership is then verified server-side
ownerSubject from arguments → never; it comes from the verified token
```

`ensureMyDemoPatient` and `getMyDemoPatient` take `args: {}` — there is nothing to supply,
because the only input that matters is the identity, and that is read from the token.

Convex object validators are strict about this, and the strictness is enforced by the
platform rather than by application code:

```text
npx convex run patients:ensureMyDemoPatient '{"ownerSubject":"user_AAA"}' --identity user_BBB
→ ArgumentValidationError: Object contains extra field `ownerSubject`
  that is not in the validator.
```

An unknown field is rejected, not ignored. Had it been silently dropped, the mutation would
still have been safe — `ownerSubject` is written from `requireSubject(ctx)` regardless — but
the loud rejection is better, because it fails at the boundary instead of quietly discarding
part of a request.

---

## 8. `ownerSubject`

```ts
patients: defineTable({
  ownerSubject: v.string(),   // identity.subject, and nothing else
  …
}).index("by_ownerSubject_and_demoKey", ["ownerSubject", "demoKey"])
```

Owner first in the index, because every authorized read begins by narrowing to one user:

```ts
.withIndex("by_ownerSubject_and_demoKey", (q) =>
  q.eq("ownerSubject", ownerSubject).eq("demoKey", DEMO_KEY))
```

This is scoping, not filtering. The index range begins at the owner, so another user's
documents are never read — as opposed to being read and then discarded, which is what
`.filter()` would do. A filtered query that returns the right answer still touched rows it
had no business touching.

---

## 9. Parent-Based Measurement Authorization

`measurements` carries no `ownerSubject`. Ownership is proven through the parent patient:

```ts
export const listRecentForPatient = query({
  args: { patientId: v.id("patients"), limit: v.number() },
  handler: async (ctx, args) => {
    await requireOwnedPatient(ctx, args.patientId);   // first, before any read
    …
  },
});
```

Two properties follow:

- **One place to change.** When the ownership rule evolves — shared care teams, delegated
  access — it changes in `requireOwnedPatient` and nowhere else. Denormalizing the owner onto
  every measurement would mean twelve rows per patient to keep in sync, and a drift bug would
  present as a security hole.
- **The check precedes the read.** Not a filter applied to results; a gate before the query
  runs. Nothing is fetched for an unauthorized caller.

The tradeoff, stated honestly: every measurement read costs one extra document read for the
parent. That is the right trade at this scale and worth revisiting if a read path ever needs
to span many patients at once.

---

## 10. Non-Enumerating Errors

```ts
if (patient === null || patient.ownerSubject !== subject) {
  throw new Error("Patient not found");
}
```

Two distinct facts — "no such record" and "not yours" — deliberately collapse into one
message. Reporting the difference would let anyone probe IDs and learn which exist, turning
an authorization boundary into an enumeration oracle.

Combined with Convex's random 32-character document IDs, enumeration is impractical rather
than merely inconvenient.

One residual leak, recorded as **S-10** in the security posture: passing an ID from the wrong
table produces a platform error naming that table. It reveals schema shape, not record
contents, and requires already holding a valid ID.

---

## 11. The Three-Stage Schema Migration

Adding a required field to a populated table fails the push outright. Convex validates every
existing document against the new schema before accepting it, so the Phase 3 rows — written
before ownership existed — would have made a one-step change impossible.

```text
Stage 1  ownerSubject: v.optional(v.string())
         index by_demoKey replaced by by_ownerSubject_and_demoKey
         → push accepted; existing rows still validate

Stage 2  npx convex run migrations:deleteUnownedPatients
         → { patientsDeleted: 1, measurementsDeleted: 12 }

Stage 3  ownerSubject: v.string()
         → push accepted
```

**Stage 3 succeeding is itself the proof that no unowned row survived.** No separate
verification query was needed: had a single row lacked the field, the deploy would have been
rejected. The schema push is the assertion.

This ordering — widen, backfill or remove, then tighten — is the general pattern for evolving
a populated table, not a quirk of this project.

---

## 12. Why the Unowned Fixture Was Deleted

The Phase 3 patient belonged to nobody. `ownerSubject` was `undefined`, and
`requireOwnedPatient` compares `patient.ownerSubject !== subject` — which is true for every
possible subject. The record was permanently unreachable: no authorization rule could ever
answer "yes" for it.

Deleting rather than backfilling was right **here**, for reasons that do not generalize:

- The data is a synthetic development fixture.
- Any user recreates an identical copy in one click via `ensureMyDemoPatient`.
- There was no correct owner to assign. Picking one would have been fabricating provenance.

Real records would be claimed or backfilled, never dropped. The security posture records this
as a deliberate, logged action rather than routine cleanup.

Measurements were deleted first. A measurement whose patient is gone is an orphan whose
ownership can never be resolved, because ownership is proven through the parent.

---

## 13. Internal Authorization Helpers

`convex/authz.ts` holds three plain async functions — not registered Convex functions, so
nothing in it is reachable from a client:

| Helper | Contract |
| --- | --- |
| `requireIdentity(ctx)` | Returns the verified identity, or throws |
| `requireSubject(ctx)` | Returns `identity.subject` — the only source of `ownerSubject` |
| `requireOwnedPatient(ctx, patientId)` | Returns the patient if the caller owns it, else throws |

They throw rather than return a boolean, and that is the design point. A function returning
`false` can be ignored by a caller who forgets to check it; a function that throws cannot.
The authorization decision is not advisory.

Each protected function calls one as its **first statement**, before any data access. A new
function that forgets is silently public — which is why this belongs on a review checklist,
not in anyone's memory.

---

## 14. Injected-Identity Tests Versus Real-Token Tests

Two kinds of evidence were gathered, and the distinction matters more than either result.

**Injected identity** (`npx convex run --identity '{"subject":"user_AAA", …}'`) supplies an
identity at the deployment boundary using admin CLI credentials:

```text
signed out → getMyDemoPatient           → Not authenticated
signed out → listRecentForPatient       → Not authenticated
user_AAA   → ensureMyDemoPatient        → created: true
user_AAA   → ensureMyDemoPatient again  → created: false, same patientId
user_BBB   → ensureMyDemoPatient        → created: true, different patientId
user_AAA   → own measurements           → 3 rows
user_BBB   → user_AAA's patientId       → Patient not found
```

Both users hold byte-identical fixture data, so any difference in what they can read is
attributable to ownership alone — not to the data.

```text
This PROVES:        ownership comparisons, denial paths, index scoping,
                    validator behaviour, error non-disclosure
This DOES NOT:      mint a token, verify a signature, match issuer or audience,
                    or exercise the provider wiring at all
```

**Real token** closes that gap, and only one observation does it: a genuine Clerk subject,
`user_3JcGwzrPUEiWaO3Fua8grENT7Cd`, written to `ownerSubject` by a browser session. That
value could not exist unless Clerk minted a token, Convex verified it, and
`getUserIdentity().subject` returned it.

Neither check alone is honest. The next section is why.

---

## 15. The Missing JWT Template

During implementation the dashboard sat indefinitely on "Authenticating with Convex…". No
browser console error. No Convex error visible in the app. Every `--identity` test passed.

The cause:

```text
npx -y clerk@latest api /jwt_templates  →  []
```

No JWT template named `convex` existed. So `getToken({ template: "convex" })` failed, the
provider's `catch` returned `null` (§4), the client sent no token, and Convex answered
"Not authenticated" — which the deployment logs showed and the browser did not.

```text
Symptom:   UI waits forever, console silent
Mechanism: missing template → getToken throws → swallowed → null → no token sent
Diagnosis: convex logs showed repeated "Uncaught Error: Not authenticated"
           while the client reported no error at all
Fix:       create the template
```

Two transferable lessons:

1. **The deployment logs were the only component telling the truth.** `npx convex logs` is
   the first place to look when authenticated queries fail silently, because the failure
   happens on a server the browser cannot report on.
2. **Injected-identity tests passed throughout the outage.** They were testing a layer
   underneath the broken one. A green test suite proved nothing about the thing that was
   actually broken — the precise reason §14 insists on both kinds of evidence.

---

## 16. Why the Template Keeps Empty Custom Claims

The template is created with `claims: {}`:

```text
{ name: "convex", lifetime: 3600, claims: {}, allowed_clock_skew: 5 }
```

Knowing that Convex matches `applicationID` against the `aud` claim, adding
`claims: {"aud": "convex"}` looks like the correct, explicit thing to do. **It breaks token
acceptance.** This was done during implementation, observed to break a working setup, and
reverted.

Clerk derives the audience from the template name. Setting `aud` as a custom claim interferes
with that rather than reinforcing it. Leave `claims` empty.

Recording this matters because the broken state is indistinguishable from the missing-template
state described in §15 — same silent UI, same "Not authenticated" in the logs — so without
this note the next person would re-diagnose it from scratch and quite likely "fix" it the
same wrong way.

---

## 17. What Remains Untested

Stated plainly, because an unverified claim in a security-adjacent document is worse than no
claim:

| Untested | Why it matters |
| --- | --- |
| A second **real** browser user | Isolation between real Clerk identities is proven only for injected subjects. Two real accounts signing in and failing to see each other's data is the check that has not been run. |
| Token refresh across the 3600s boundary | `ConvexProviderWithClerk` refreshes automatically, but no session in this project has been observed crossing an expiry. Shortening the lifetime (posture item S-02) depends on this working. |
| Production error redaction | Convex is documented to redact non-`ConvexError` messages on production deployments. No production deployment exists, so this was not observed. |

Everything in §14 marked "PROVES" was executed and its output recorded. Everything here was
not. The line between the two is the whole point of this section.

---

## 18. Phase 4 Mental Model

```text
Clerk asserts identity
→ Convex verifies it against a trusted issuer
→ the application derives the subject server-side
→ the record's owner is compared to that subject
→ allowed, or indistinguishably refused
```

The principles:

1. Assertion, verification, and enforcement are three steps in three different places.
2. A caller may name a record; it may never name itself.
3. Ownership is enforced at the parent, before any child is read.
4. Refusals reveal nothing — missing and forbidden look identical.
5. Widen, migrate, tighten: a populated table cannot gain a required field in one step.
6. A test that injects identity cannot prove the identity pipeline.
7. When authenticated calls fail silently, read the deployment's logs, not the browser's.
