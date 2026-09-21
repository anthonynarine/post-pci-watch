# Clerk Major Concepts

## Post-PCI Watch — Phase 2 Reference

This document records the authentication concepts demonstrated during Phase 2. The goal is
not to memorize Clerk's API surface. The goal is to know where identity comes from, which
part of the system establishes it, which part enforces it, and what it does not yet protect.

Phase 2 used `@clerk/nextjs@7.9.4`, which is **Clerk Core 3**. Core 3 removed `<SignedIn>`
and `<SignedOut>`; `<Show when="signed-in">` and `<Show when="signed-out">` replace them.
Code written against older Clerk versions will not run unchanged.

---

## 1. Authentication Versus Authorization

These are two different questions, asked in order.

```text
Authentication → who is making this request?
Authorization  → is this person allowed to do this particular thing?
```

Authentication produces an identity: a user ID that the server trusts because it verified a
signed token. Authorization takes that identity and compares it against a rule: does this
user own this record, hold this role, belong to this organization?

Phase 2 implements **authentication only**. `/dashboard` asks "is anyone signed in?" and
nothing more. Every signed-in user sees exactly the same dashboard. Authorization begins in
Phase 4, when Convex records have owners worth checking.

A system can have perfect authentication and no authorization at all. That is precisely the
state this project is in right now, and it is worth being able to say so out loud.

---

## 2. User Versus Session

A **user** is a durable identity: one person, one record in Clerk's user store, one stable
`userId`. It survives sign-out, password changes, and new devices.

A **session** is one authenticated period of activity for that user, on one device. It is
created at sign-in, it expires, and it can be revoked without touching the user.

```text
User  user_abc          (one person, permanent)
 ├── Session sess_1     laptop, signed in Tuesday
 └── Session sess_2     phone, signed in Wednesday
```

Signing out ends a session. It does not delete the user. Revoking `sess_2` from the Clerk
dashboard would sign the phone out and leave the laptop working.

This distinction matters later: monitoring records will be owned by a **user**, never by a
session. A session is how someone proves who they are right now; it is not who they are.

---

## 3. Cookie Versus Token

A **token** is the credential: a signed JWT that asserts "this request belongs to user X,
and it has not been tampered with, and it expires at this time". The server trusts it
because it verifies the signature against Clerk's public key — not because the browser
claims it is true.

A **cookie** is a transport mechanism: a named value the browser stores for a domain and
attaches automatically to matching requests.

Clerk puts the token in a cookie. These are the cookie names in the installed SDK
(`@clerk/backend`, `Cookies` constants):

| Cookie | Purpose |
| --- | --- |
| `__session` | The session token itself — the signed JWT the server verifies |
| `__client_uat` | A timestamp saying when the client was last authenticated; lets code make a fast signed-in/signed-out decision without verifying a JWT |
| `__clerk_db_jwt` | Development-only browser token, needed because dev runs on a different origin than Clerk's frontend API |
| `__clerk_handshake` | Short-lived cookie used while Clerk reconciles session state between its frontend API and your app |

The session token is deliberately short-lived and is refreshed in the background by Clerk's
client code. You can check the lifetime yourself rather than trusting this document: sign
in, copy the `__session` cookie, decode the JWT, and compare its `iat` and `exp` claims.

A short lifetime is a containment decision. A stolen token stops working quickly, and
revoking a session takes effect at the next refresh instead of being unenforceable until
the token expires on its own.

When this project's development server is asked for a page with no Clerk cookies at all, the
response carries these headers — observed, not imagined:

```text
x-clerk-auth-status: signed-out
x-clerk-auth-reason: dev-browser-missing
```

---

## 4. ClerkProvider

`src/app/layout.tsx` renders `<ClerkProvider>` inside `<body>`, wrapping `ThemeProvider` and
everything below it.

`ClerkProvider` is a Server Component that reads the auth state for the current request and
publishes it downward, including across the client boundary. It is what makes `UserButton`,
`SignInButton`, and `SignUpButton` work: those are Client Components that need to know the
session state in the browser, and they read it from this provider's context rather than each
fetching it themselves.

Two things it is **not**:

- It is not what establishes the session. That already happened in `proxy.ts` before any
  component rendered.
- It is not a guard. Wrapping the app in `ClerkProvider` protects nothing. It distributes
  auth state; it does not enforce anything with it.

---

## 5. `proxy.ts`

```tsx
// src/proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

Next.js 16 calls this file `proxy.ts`. Through Next.js 15 the same file was `middleware.ts`;
the code is identical and only the filename changed. Documentation and blog posts written
before that rename will say `middleware.ts`.

It runs before the matched request reaches a route. `clerkMiddleware()` reads the Clerk
cookies, verifies the session token, and attaches a request-scoped auth context that
`auth()` can later read on the server.

The `matcher` decides which requests it runs on. The first pattern skips Next.js internals
and static asset extensions; the second makes sure API routes are always included.

**This file gates nothing in this project.** Called with no arguments, `clerkMiddleware()`
establishes context and lets every request through. Clerk supports route matching here — a
public-first or protected-first strategy — and Post-PCI Watch deliberately does not use it.
The reason is in the next two sections.

Without this file, `auth()` in a Server Component would have no verified session to read.

---

## 6. `auth()` Versus `auth.protect()`

Both come from `@clerk/nextjs/server`. Both must be awaited. They answer different questions.

### `auth()` — ask

```tsx
const { isAuthenticated, userId } = await auth();
```

Returns the auth state and lets your code decide what to do with it. It never redirects and
never throws on a signed-out request. Use it when signed-out is a legitimate state that the
page should render something for.

In Core 3, `isAuthenticated` is the boolean to check. Older code checks `!!userId`.

### `auth.protect()` — enforce

```tsx
await auth.protect();
```

Enforces. It does not return a boolean for you to ignore; on failure it ends the request.
From the installed type definitions:

| Authenticated | Authorized | `auth.protect()` does |
| --- | --- | --- |
| Yes | Yes | Returns the `Auth` object |
| Yes | No | Returns a `404` |
| No | No | Redirects to sign-in (for document requests) |

For non-document requests such as API calls, an unauthenticated caller gets a `404` rather
than a redirect, because redirecting a fetch to an HTML sign-in page is useless.

The 404-instead-of-403 choice is deliberate: a 403 confirms that the resource exists and you
merely lack access. A 404 does not confirm anything.

`src/app/dashboard/page.tsx` calls `await auth.protect()` as its first statement, before any
monitoring component renders.

---

## 7. Public Versus Protected Routes

```text
/                       public      landing page
/sign-in/[[...sign-in]] public      Clerk's sign-in flow
/sign-up/[[...sign-up]] public      Clerk's sign-up flow
/dashboard              protected   auth.protect()
```

The `[[...sign-in]]` segment is an **optional catch-all**. Clerk's flow has multiple steps —
password, second factor, email verification, recovery — and each is its own path underneath
`/sign-in`. The optional catch-all hands all of them to one route file.

Two places can enforce protection, and the difference is worth holding onto:

```text
Path-based   → proxy.ts matches the URL and calls auth.protect()
Resource-based → the page itself calls auth.protect() as it renders
```

Post-PCI Watch protects at the **resource**. The rule lives in the file it guards, so moving
or renaming the route cannot silently unprotect it, and reading `dashboard/page.tsx` tells
you its access rule without cross-referencing a matcher pattern elsewhere.

Path-based protection in middleware is not wrong — it is better when many routes share one
rule, and it rejects the request earlier. For one protected route in a teaching project,
keeping the rule next to the resource is clearer.

What would be wrong is believing a route is protected because a matcher pattern exists,
when the pattern no longer matches the path.

---

## 8. The Signed-Out Request Flow

```text
GET /dashboard  (no valid session cookie)
→ src/proxy.ts runs clerkMiddleware()
→ no valid session found; a signed-out auth context is attached to the request
→ Next.js begins rendering src/app/dashboard/page.tsx
→ await auth.protect() reads that context, finds no user, and throws a redirect
→ no monitoring component ever renders
→ 307 to /sign-in?redirect_url=http://localhost:3000/dashboard
→ Clerk's <SignIn /> runs its flow
→ on success the user is returned to /dashboard
```

Verified against the running development server:

```text
HTTP/1.1 307 Temporary Redirect
x-clerk-auth-status: signed-out
location: http://localhost:3000/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A3000%2Fdashboard
```

The `redirect_url` parameter is what makes sign-in return you to where you were going
instead of dumping you on a generic page.

The important detail is the ordering: the redirect happens **before** rendering, not after.
No synthetic monitoring data is serialized into a response that then gets thrown away.

---

## 9. The Signed-In Request Flow

```text
GET /dashboard  (with a valid __session cookie)
→ src/proxy.ts verifies the session token and attaches userId to the request context
→ Next.js renders src/app/dashboard/page.tsx
→ await auth.protect() finds a user and returns the Auth object instead of redirecting
→ the monitoring components render from the hardcoded synthetic records
→ ClerkProvider publishes the session to the client
→ <Show when="signed-in"> in AppHeader renders UserButton, which owns sign-out
```

Sign-out is the same story in reverse: `UserButton` asks Clerk to end the session, the
cookies stop representing a valid session, and the next request for `/dashboard` takes the
signed-out path above.

---

## 10. Why Every Route Became Dynamic

Phase 1 built a statically prerendered dashboard. After Phase 2, the build reports:

```text
ƒ /                        ƒ /dashboard
ƒ /sign-in/[[...sign-in]]  ƒ /sign-up/[[...sign-up]]
ƒ  (Dynamic)  server-rendered on demand
```

Every route, including the public landing page, is now rendered per request.

The mechanism is specific, and it is readable in the installed package at
`@clerk/nextjs/dist/esm/app-router/server/controlComponents.js`: in Core 3, `<Show>` is a
**Server Component** whose first line is `await auth()`.

```text
<Show> awaits auth()
→ auth() reads this request's cookies
→ a component that reads the request cannot be prerendered
→ AppHeader uses <Show>
→ AppHeader is in the root layout
→ every route that uses the root layout is dynamic
```

Phase 1's dashboard was static only because nothing in it read the request. Adding one
request-dependent component to the shared layout changed the rendering mode of the entire
application.

This is expected and normal for an authenticated product, not a defect. It is worth
understanding rather than accepting, because it is a real cost: every page view now costs a
server render. If the landing page ever needs to be static again, the fix follows directly
from the mechanism — keep request-reading components out of the shared layout and let a
Client Component using `useAuth()` render the auth controls after load instead.

---

## 11. What Clerk Manages

- The user store: accounts, emails, passwords, profile data
- Credential handling: password hashing, verification, reset flows
- Multi-factor authentication and social sign-in
- Session creation, refresh, expiry, and revocation
- Signing and verifying session tokens
- Setting and reading the cookies that carry them
- The hosted UI for sign-in, sign-up, and account management
- The redirect back to `redirect_url` after a successful sign-in

Clerk is the identity provider. It answers, reliably, "who is this?"

---

## 12. What the Application Must Still Enforce

Clerk will never decide any of the following:

- **Which routes require a session.** `/dashboard` is protected because its own code says
  so. Delete that one line and the route is public while Clerk keeps working perfectly.
- **Which records a given user may read or write.** Clerk knows the user ID. It has no
  concept of a patient record, let alone who owns one.
- **Whether server code trusts a client-supplied identity.** A browser can send any user ID
  it likes in a request body. The only identity worth trusting is the one derived
  server-side from a verified token — `userId` from `await auth()`, never a value that
  arrived in the payload.
- **Where authorization runs.** A check performed only in the UI is a display rule, not a
  security control. Hiding a button hides nothing from anyone using the network tab.

```text
Clerk answers   → who is this?
The app answers → what is this person allowed to touch?
```

---

## 13. Why Authentication Does Not Yet Protect Individual Patient Records

Right now it protects nothing of the kind, for a simple reason: **there are no records.**

The synthetic patient lives in `src/features/monitoring/data/`. It is a TypeScript module
compiled into the application bundle. It has no owner field, no per-user scope, and no
database behind it. Every signed-in user renders the identical hardcoded object.

```text
Today:  signed in? → yes → render the one and only synthetic patient
Later:  signed in? → yes → which records belong to this userId? → render only those
```

Authentication gates the *route*. It does not scope the *data*. Those are separate controls,
and getting the first one right does nothing for the second.

Record-level protection needs three things this project does not have yet:

1. Records that live in a database rather than a bundled module.
2. An owner stored on each record.
3. A check on the server, inside the query that reads them, comparing that owner against the
   authenticated user — enforced where the data is read, not where it is displayed.

Phase 3 introduces Convex, which supplies the first. Phase 4 connects Clerk identity to
Convex and supplies the second and third, and it is finished only when two real users exist
and one provably cannot read the other's data.

Until then, the honest description of this application's security posture is: *the front
door is locked, and every room inside it is shared.*

---

## 14. Phase 2 Mental Model

```text
Request
→ proxy.ts verifies the session cookie and establishes auth context
→ the route decides whether it requires that context
→ auth.protect() enforces, or auth() reports
→ ClerkProvider publishes session state to the components
→ <Show> chooses what the header renders
```

The principles:

1. Establishing identity and enforcing access are separate steps in separate places.
2. `clerkMiddleware()` establishes; it does not enforce.
3. `auth()` reports; `auth.protect()` enforces.
4. Protection placed on the resource cannot be detached from it by a route change.
5. Reading the request makes a route dynamic, and that propagates from the root layout.
6. Clerk answers who; the application must answer what they may touch.
7. Authentication is not authorization, and neither is ownership.
