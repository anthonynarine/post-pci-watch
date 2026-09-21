# Phase Log

One entry per phase. A phase is closed only after its mastery check is answered by the
learner in their own words. Roadmap and phase contents live in `PROJECT_SOURCE.md`.

| Phase | Name | Status | Closed on |
| --- | --- | --- | --- |
| 1 | Next.js Foundation | Code complete, mastery check open | — |
| 2 | Clerk Authentication | In progress | — |
| 3 | Convex Foundation | Not started | — |
| 4 | Clerk and Convex Identity | Not started | — |
| 5 | Realtime Data | Not started | — |
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

**Mastery check (must be answered before Phase 3)**

Not yet written.
