# The Teaching Section

## Post-PCI Watch — Outside the Roadmap

A section of the application, at `/learn`, where the big concepts behind this stack are
written up as articles and traced through the code that implements them. It is not a roadmap
phase. It adds no technology, no dependency, and no backend code, and it does not advance or
close any phase.

> **Synthetic data only.** No article contains patient data, real identifiers, tokens,
> secret values, or environment values. Every example is fabricated or quoted from this
> repository's own synthetic fixtures and test evidence.

First article: **How Next.js, Clerk, and Convex Handle One Request** —
`/learn/next-clerk-convex-request-pipeline`.

---

## 1. Routes

```text
/learn                                       library index          src/app/learn/page.tsx
/learn/[slug]                                one article per slug   src/app/learn/[slug]/page.tsx
/learn/next-clerk-convex-request-pipeline    Article 01
```

- **Public.** Neither route calls `auth.protect()`. They hold no patient data, and there is no
  project requirement to gate teaching material.
- **One dynamic route for every article.** `generateStaticParams` lists every slug in the
  catalogue and `dynamicParams = false` makes any other slug a 404 rather than an attempted
  render. Verified: `/learn/nope` returns 404.
- **Still rendered per request.** The build lists both routes as `ƒ (Dynamic)`. That is not
  caused by these pages: `AppHeader` in the root layout uses Clerk's `<Show>`, which reads
  the session, so every route in the app is dynamic (recorded in Phase 2's notes).
- **Slugs are permanent.** A slug is a URL. Renaming one breaks every link to it.

## 2. Content architecture

Typed local metadata plus composed React section components. No Markdown, MDX, or CMS.

**Why not MDX.** The repository has no Markdown pipeline. Adding one means new
dependencies and build configuration to render prose that TSX already renders. It would
also make the interactive explorers harder to embed and remove the type checking that keeps
code excerpts, function names, and data shapes honest. Revisit this if articles ever
outnumber the effort of writing them as components.

```text
src/features/learning/
├── types/learning.ts            ArticleMeta, FunctionKind, CtxCapability, PipelineScenario, Source…
├── data/
│   ├── articles.ts              the catalogue: one ArticleMeta per article (index + TOC + route)
│   ├── functionKinds.ts         the six builders, for FunctionTypeExplorer
│   ├── ctxCapabilities.ts       the verified ctx table
│   ├── requestPipelineScenarios.ts   three traced runs, for PipelineExplorer
│   ├── requestPipelineReference.ts   mastery questions and sources for Article 01
│   └── lanes.ts                 the four execution lanes and their colours
├── components/                  shared by every article
│   ├── ArticleShell.tsx         header, verification stamp, sticky/collapsible TOC
│   ├── ArticleSection.tsx       numbered section + prose measure; C, SubHeading
│   ├── ArticleCard.tsx          one library entry
│   ├── Callout.tsx  CodeBlock.tsx  FlowChain.tsx  SourceList.tsx  MasteryCheck.tsx
│   ├── CapabilityTable.tsx      table ≥ md, stacked cards below
│   ├── FunctionTypeExplorer.tsx CLIENT — interactive island
│   └── PipelineExplorer.tsx     CLIENT — interactive island
├── parts/
│   ├── index.ts                 ARTICLE_CONTENT: slug → content component
│   └── request-pipeline/        Article 01: one file per section + ArchitectureDiagram
│       └── RequestPipelineArticle.tsx   composition only
└── index.ts                     barrel for routes
```

Separation of responsibilities:

| Concern | Lives in |
| --- | --- |
| Article metadata | `data/articles.ts` — never in a page |
| Facts that could go stale | `data/*.ts`, each file naming the source it was transcribed from |
| Page orchestration | `src/app/learn/**/page.tsx` — resolve, frame, render; no content |
| Presentational sections | `parts/<article>/` — one component per section |
| Interactive teaching | `components/FunctionTypeExplorer.tsx`, `components/PipelineExplorer.tsx` |
| Shared layout | `components/ArticleShell.tsx`, `ArticleSection.tsx`, `Callout.tsx`, … |

Metadata and content are registered separately (`data/articles.ts` and `parts/index.ts`), so
the index page can list articles without importing any article body.

## 3. Server and Client Component boundaries

Everything is a Server Component except three small islands:

| Component | Why it is a Client Component |
| --- | --- |
| `FunctionTypeExplorer` | Selection is state; arrow-key navigation needs event handlers and focus management |
| `PipelineExplorer` | Scenario and step selection are state |
| `NavLink` (header) | `usePathname` reads the current URL to mark the active section |

Both explorers receive their data as props from Server Components. Neither imports a Convex
hook or calls a backend function; they are educational only.

What stays on the server, deliberately:

- The mastery answers use native `<details>`/`<summary>`. They are keyboard operable and
  announced as expandable, and they need no JavaScript.
- The mobile table of contents is also a `<details>`. The desktop one is plain anchor links.
- The architecture diagram, the ctx table, and every flow chain are static HTML.

**One deviation from the brief, on purpose:** the brief asked for a single interactive
island. Article 01 has two. `PipelineExplorer` is the only place the article walks
through real repository code step by step and shows where each step runs, and it costs one
more `useState` island with no data fetching. It was kept.

## 4. Accessibility decisions

- **Headings.** One `h1` per page; sections are `h2`, sub-parts `h3`. Verified in the
  browser: the heading sequence never skips a level.
- **Explorers** follow the WAI-ARIA tabs pattern: `role="tablist"`/`"tab"`/`"tabpanel"`,
  `aria-selected`, `aria-controls`, `aria-labelledby`, and a roving `tabindex`. In
  `FunctionTypeExplorer`, Left/Right move along a row, Up/Down switch public ↔ internal, and
  Home/End jump to the ends. Verified with real key presses.
- **No colour-only meaning.** Present/absent capabilities carry an icon *and* the words "Not
  present". Misconceptions are labelled "Misconception:" and "Actually:". The diagram numbers
  every box, and an ordered list below explains each number in words.
- **Contrast.** Added one token, `--primary-text`. It equals `--primary` in light mode and
  is `#f87171` in dark mode. Dark `--primary` (`#991b1b`) measured about 2.6:1 on the page
  background and 1.9:1 on `--primary-soft`, which fails WCAG AA for small text. All red text
  in the learning feature uses the new token. **Not fixed:** the pre-existing "Synthetic data"
  badge in `AppHeader` still uses `text-primary` and has the same dark-mode contrast problem.
- **Narrow screens.** Tables become stacked cards below `md`, flows wrap vertically, and the
  header controls wrap. The header change also fixed a horizontal overflow at 390 px that
  already existed before the Learn link was added.

## 5. Adding an article

1. Add an `ArticleMeta` entry to `data/articles.ts`: next `number`, a permanent `slug`, dates,
   the exact versions verified against, and a `sections` list whose ids you will use.
2. Create `parts/<article-slug>/`. Write one component per section with `ArticleSection` (the
   `id` must match the metadata), and one `<Name>Article.tsx` that only composes them.
3. Put facts that can go stale in `data/`, with a header naming the source they came from.
4. Register the content component in `parts/index.ts` under the same slug.
5. Run `npx next typegen` if TypeScript complains about `PageProps<"/learn/[slug]">`; the
   route types are generated.
6. Verify every claim against the installed version and official docs. List the sources on
   the page. If behaviour comes from reading library code rather than a documented
   guarantee, say so in the article.

Nothing else changes: the index and the route pick the new article up from the catalogue.

## 6. What Article 01 verified, and against what

Checked on 2026-09-23 against convex 1.46.0, @clerk/nextjs 7.9.4, and next 16.3.5.

- **ctx members** — transcribed from `GenericQueryCtx`, `GenericMutationCtx`, and
  `GenericActionCtx` in `node_modules/convex/dist/esm-types/server/registration.d.ts`. New in
  this version compared with most published material: `QueryCtx` and `MutationCtx` both have
  `runQuery`, and `MutationCtx` has `runMutation`. Their transaction semantics are quoted
  from those members' own doc comments.
- **Public vs internal** — `convex/_generated/server.d.ts` builds each builder as
  `QueryBuilder<DataModel, "public" | "internal">`. `FunctionReference<Type, Visibility =
  "public">` defaults to public, and `useQuery`/`useMutation`/`useAction` accept
  `FunctionReference<"query" | "mutation" | "action">`. So passing `internal.*` to a hook is a
  compile error. At runtime `api` and `internal` are the same `anyApi` proxy
  (`convex/_generated/api.js`); the deployment enforces visibility.
- **Scheduler** — `SchedulableFunctionReference` accepts only mutations and actions, so an
  internal query cannot be scheduled.
- **Token transport** — `browser/sync/protocol.d.ts` defines an `Authenticate` message with
  `tokenType: "User"`: identity is sent on the connection, not with each call.
- **Mutation promise ordering** — read from `browser/sync/request_manager.js` and
  `client.js`. A successful mutation's result is held with its commit timestamp and resolved
  only after a query `Transition` at or past that timestamp has been applied. A failed
  mutation resolves immediately. **The documentation does not state this**, so the article
  presents it as current implementation behaviour, not as a contract.
- **Actions** — docs.convex.dev/functions/actions: no `ctx.db`; separate transactions; auth
  propagates to `runQuery`/`runMutation`; no automatic retry; client-to-action calls
  are "in most cases" an anti-pattern (use a mutation that schedules an internal action).
  The brief's AI example (React → public action) is shown, and this correction is placed
  next to it.
- **Clerk** — Clerk's docs now describe a native Convex integration instead of a JWT
  template. This project still uses the `convex` template; its token fetcher accepts either.

## 7. Validation evidence (2026-09-23)

| Check | Result |
| --- | --- |
| `npm run lint` | Clean |
| `npx tsc --noEmit` | Clean (after `npx next typegen` generated the new route's types) |
| `npm run build` | Succeeds; 7 routes, including `/learn` and `/learn/[slug]` |
| `/learn`, article, light and dark | Rendered in the signed-in browser session; theme switch verified |
| Unknown slug | 404 |
| Header, signed in | Learn and Dashboard present; `aria-current` on the active one |
| Header, signed out | Sign in, Create account, and Learn present; no Dashboard (headless, 390 px) |
| FunctionTypeExplorer | Right → `mutation`, Down → `internalMutation`, End → `internalAction`; focus, `aria-selected`, and panel content moved together |
| PipelineExplorer | "Record a heart rate", three Next clicks → "Step 4 of 7 · Return path 1" |
| Responsive, 390 / 768 / 1280 px | No page overflow and no element past the viewport, both routes, measured over CDP. Two defects found and fixed: header overflow at 390 px, and clipped step buttons in PipelineExplorer below `md` |
| Hydration / console, signed-in session | No errors, no hydration warnings, no CSP violations |
| `/dashboard` | Signed out: 307 to sign-in. Signed in: 9 live rows and the record control render |

**CSP observation, not caused by this work:** in the signed-out headless session, Clerk's
development instance tried to POST to `https://clerk-telemetry.com/v1/event`. The existing
`connect-src` blocked it. The policy was not changed. The clean fix would be to disable
Clerk telemetry rather than allow the origin. That is not done here and is not yet recorded
in `SECURITY_POSTURE.md`.

## 8. Practice mode

`/learn/[slug]/practice` turns an article into short, spaced practice sessions. The article
explains; practice is where it is remembered. Reading feels productive because the page
becomes familiar, and familiarity is not recall.

**Techniques, and where each lives in the code**

| Technique | Mechanism | Code |
| --- | --- | --- |
| Retrieval practice | Every item asks before it tells | all cards |
| Generation | Recall items require a written answer before the reveal | `RecallCard` |
| Spacing | Five Leitner boxes: 0, 1, 3, 7, 16 days; a miss returns to box 1 | `utils/practiceScheduler.ts` |
| Interleaving | Round-robin by topic; no topic twice in a row while others remain | `planSession` |
| Discrimination | Near-miss options, each with its own explanation | `ChoiceCard` |
| Transfer | Find the flawed line in unfamiliar code | `BugCard` |
| Causal reconstruction | Rebuild the pipeline order | `OrderCard` |
| Confidence calibration | Certainty is rated before the reveal; confident misses are flagged | `ConfidencePicker`, summary |
| Pretesting | Practice is offered before the article, framed as "try it before you read" | `ArticleShell`, intro |
| Relearning | A missed item is asked once more later in the same session | `PracticeSession` |

**Scoring.** Recall is self-scored against key points ("recalled" means all but one). This is
honest self-assessment by design. Grading free text by machine would need an AI provider,
which is not permitted in this project, and exact-match grading would punish correct answers
written in the learner's own words. Only the first attempt in a session moves an item's box;
the second-chance attempt exists to end on a correct retrieval.

**Persistence.** Per-browser `localStorage`, one key per deck
(`post-pci-watch:practice:<slug>`), read through `useSyncExternalStore`. The server snapshot is
`null`, so server and client markup agree. Nothing leaves the browser: no Convex table, no
request. A Convex progress table was considered and rejected. It would add schema and public
functions to a clinical app just to remember flashcards. Blocked storage degrades to
"practice works but does not remember", and the summary says so.

**Render purity.** `Date.now()` and `Math.random()` are read only inside event handlers
(Start, Continue), never during render, so the React Compiler lint rules pass and hydration
cannot mismatch.

**Adding a deck.** Write items in `data/<article>Practice.ts` using only claims the article
already verified, and register the file in `data/practiceDecks.ts`. Item ids are permanent,
because progress is stored against them.

**Verified 2026-09-23.** Scheduler assertions pass (spacing ladder, box cap, lapse reset,
overdue-before-new, extra round when nothing is due, no adjacent topic repeats). Full sessions
were driven in headless Chrome through all four card types, in dark and light themes: misses
were re-asked, first attempts were stored, and box counts survived a reload. Sequencing was
solved with Move up buttons, and focus followed the moved step. No console errors. No page
overflow at 390, 768, or 1280 px.

## 9. What this document does not claim

Reading an article or its reference answers, or scoring well in practice, does not answer a phase mastery check. Phases
1–5 mastery checks remain open in `docs/PHASE_LOG.md` until the learner answers them in their
own words.
