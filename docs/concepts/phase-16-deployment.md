# Two Deployments, One Build

## Post-PCI Watch — Phase 16 Reference

Development runs against `dev:proficient-panda-85` and `localhost`. The deployed demo runs
against a separate Convex **production** deployment and a Vercel URL. This document explains
what each piece is, where each secret lives, and the exact steps — including the ones only the
project owner can perform.

---

## 1. The Environments

```text
                development                         production (demo)
Next.js         next dev on localhost                Vercel, built from main
Convex          dev:proficient-panda-85              the project's prod deployment (new, empty)
Clerk           development instance                 the SAME development instance (owner decision)
Data            dev test users and fixtures          empty; each user creates their demo patient
```

The two Convex deployments share code, not data. Nothing from development — test users,
simulator rows, audit events — appears in production.

**Owner decision (2026-09-24): Clerk's development instance is used in production.** A Clerk
production instance requires a domain the owner controls; `*.vercel.app` does not qualify.
Consequences, accepted for a demo: Clerk shows a "Development mode" badge, development-instance
user limits apply, and Google sign-in uses Clerk's shared development OAuth credentials. This is
recorded as finding S-22.

---

## 2. What Happens in One Vercel Build

`vercel.json` sets the build command:

```text
npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

As the installed CLI documents its order (`npx convex deploy --help`):

1. `convex deploy` reads `CONVEX_DEPLOY_KEY`, which identifies the production deployment.
2. It runs `npm run build` first, with `NEXT_PUBLIC_CONVEX_URL` set to the production URL —
   named explicitly by `--cmd-url-env-var-name` rather than left to detection. Next.js compiles
   that value into the browser bundle, and `next.config.ts` derives the CSP's Convex origins
   from it.
3. Only if the build succeeds does it typecheck, bundle, and push `convex/` — schema,
   functions, indexes — to production. The push evaluates `convex/auth.config.ts`, which reads
   `CLERK_FRONTEND_API_URL` **from the Convex production deployment's environment**, not from
   Vercel.

A failed frontend build therefore never pushes the backend. The reverse window exists: the
backend is pushed moments before Vercel promotes the new frontend, so for a few seconds the old
frontend talks to the new backend. Schema changes must stay backward-compatible across that
window — the same discipline the staged migrations already follow.

---

## 3. Where Each Value Lives

| Variable | Set in | Secret? | Why there |
| --- | --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | Vercel (Production) | **Yes** | Lets the build push to Convex production |
| `CLERK_SECRET_KEY` | Vercel (Production) | **Yes** | Next.js server verifies sessions in `proxy.ts` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel (Production) | No | Browser Clerk client; also feeds the CSP |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in` | Vercel | No | Clerk routing |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-up` | Vercel | No | Clerk routing |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` = `/` | Vercel | No | Clerk routing |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` = `/` | Vercel | No | Clerk routing |
| `NEXT_PUBLIC_CONVEX_URL` | *set by `convex deploy`* | No | Do **not** set it in Vercel |
| `CLERK_FRONTEND_API_URL` | **Convex production** env | No | The issuer `auth.config.ts` trusts |

`NEXT_PUBLIC_*` values are compiled into the browser bundle and are public by design. The two
secrets never leave Vercel's server environment.

---

## 4. Steps

Owner-only steps are marked **[owner]**: they need an account login or create a credential.

1. **[owner]** Merge the pull request into `main`.
2. **[owner]** Convex dashboard → project `post-pci-watch` → **Production** deployment →
   Settings → Environment Variables → add `CLERK_FRONTEND_API_URL` with the same value as
   development (`https://electric-fowl-7803.clerk.accounts.dev`). This must exist **before** the
   first build, or the push fails when it evaluates `auth.config.ts`.
3. **[owner]** Same page → **Generate Production Deploy Key**. Copy it; it is shown once.
4. **[owner]** Create a Vercel account (Hobby plan) by signing in with GitHub.
5. **[owner]** Vercel → Add New → Project → import `anthonynarine/post-pci-watch`. Framework
   preset: Next.js. Leave the build command alone — `vercel.json` sets it.
6. **[owner]** Before the first deploy, add the environment variables from §3 for the
   **Production** environment. Copy the Clerk values from `.env.local`.
7. **[owner]** Deploy. Vercel builds `main` and assigns a `*.vercel.app` URL.
8. Verify, in order: the home page loads; sign-in works; `/dashboard` shows "No demo patient"
   and creating one works; the simulator starts and the vitals turn "Live"; the browser console
   shows no CSP violations.

Preview deployments are not configured: preview builds have no deploy key, so `convex deploy`
fails them loudly rather than letting a preview write to production. That is deliberate.

---

## 5. What Production Does Not Change

Every open security finding stays open. This deployment is a synthetic-data demo: no PHI, no
BAA, no HIPAA compliance claim. S-04 (environment separation) moves to Partial — development and
production Convex deployments are now separate — while Clerk is still shared (S-22).
