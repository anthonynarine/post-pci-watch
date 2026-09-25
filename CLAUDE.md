# Post-PCI Watch — Working Agreement

**`docs/PROJECT_SOURCE.md` is the governing contract for this repository.** Read it before
doing any work here. It defines the product, the architecture, the teaching contract, the
development rules, and the 17-phase roadmap. This file is the operational binding: how that
contract is enforced turn to turn, plus the mutable state (which phase we are in).

Where the two disagree, `docs/PROJECT_SOURCE.md` wins.

## Project state

- **Current phase: Phase 17 — Demo Polish** (code complete 2026-09-25; the trend sparkline
  awaits a visual check). Phase 16 deployed and verified end to end
  on 2026-09-24: Vercel + Convex production `rosy-pigeon-94` + Clerk development instance
  (S-22). The Convex deploy key and Clerk secret key were exposed in a session transcript and
  must be rotated (S-11). Phases 8, 9, 11–15 were skipped under the finish scope.
- Phase 1 status: code complete. Its mastery check has not been answered in the learner's
  own words and stays open in `docs/PHASE_LOG.md`.
- Phase 2 status: code complete and verified end to end. Its mastery check is also still
  open.
- Phase 3 status: code complete. Its mastery check is also still open.
- Phase 4 status: code complete and verified. Its mastery check is also still open.
- Phase 5 status: code complete. One manual control records a synthetic heart rate and the
  subscribed table updates without a refresh. Single-client reactivity and cross-client push
  are proven; the two-browser-tab test is **still blocked by S-20 and is not claimed.**
  S-20 remediation items 1 and 2 were applied on 2026-09-23 — the dashboard now reports a
  definitive authentication failure instead of an endless "Authenticating with Convex…", and
  a bounded one-shot recovery fires on a genuine offline-to-online transition. Neither the
  two-tab test nor the recovery path passed verification: the test machine's `NlaSvc` service
  is stopped, so `navigator.onLine` is permanently false and Clerk refuses to mint tokens.
  Close-out conditions are in `docs/security/SECURITY_POSTURE.md` under S-20.
  On 2026-09-24 the project owner **deferred S-20 as environmental** to the test machine.
  S-20 stays open; the two-tab claim stays unclaimed. The Phase 5 mastery check is
  **unanswered by owner decision**; the owner waived hard rule 1 to begin Phase 5.5.
- Phase 5.5 status: code complete and verified by injected-identity tests (2026-09-24).
  Append-only `auditEvents` written atomically with successful writes; one client-declared
  workspace-access event per workspace mount; owner-scoped "Synthetic activity history"
  panel; measurement `origin` required and fixture provenance corrected. S-05 is **Partial**,
  not resolved; new finding S-21. The panel and one-event-per-mount access were observed in the
  owner's browser.
- 2026-09-24: the owner **waived the Phase 5 and Phase 5.5 mastery checks** to prioritise
  finishing the application. Waived, not answered.
- **Finish scope (owner decision, 2026-09-24): a deployed demo** — Phases 6, 7, 10, 16, 17.
  Phases 8, 9, 11–15 are out of scope for this finish, not done.
- Phase 6 status: code complete and verified by injected-identity tests. Server-side
  simulator on Convex's scheduler, started and stopped from the dashboard, auto-stops after
  15 minutes.
- Phase 7 status: code complete and verified. Live current vitals and 5-minute / 1-hour window
  summaries from stored data; the hardcoded vitals cards are removed.
- Phase 10 status: code complete and verified. Versioned deterministic rules (`rules-v1`)
  evaluated in the writing transaction; the hardcoded events card is removed. The
  measurement-gap condition is computed on screen and not stored.
- Outside the roadmap: a public teaching library at `/learn` (`src/features/learning/`).
  It is not a phase and does not advance or close one. Add articles as described in
  `docs/concepts/teaching-section.md` §5. Every article's claims are verified against the
  installed versions and official docs. When a Convex, Clerk, or Next.js upgrade lands,
  recheck `src/features/learning/data/` and the article's `verifiedAgainst`.
- Not yet permitted in the codebase: AI providers, PhysioNet, Synthea. Within Clerk: no
  organizations, roles, or webhooks. Within Convex: no actions, no crons, no HTTP endpoints.
  Scheduled functions (`ctx.scheduler`) are permitted **only** for the Phase 6 simulator loop
  in `convex/simulator.ts` — owner decision, 2026-09-24.

Phase completions and mastery checks are recorded in `docs/PHASE_LOG.md`.
Security findings and their statuses are tracked in `docs/security/SECURITY_POSTURE.md`.

## Hard rules

1. **Phase gate.** Do the current phase only. Stop at its end and run the phase's mastery
   check. Do not begin the next phase until the learner has answered it. Advancing the
   phase is the learner's call, never an inference from "we finished the code".
2. **Explain before building.** Before any new technology or architectural feature, answer
   the seven questions in the Learning Contract (what problem, where it runs, what talks to
   it, what crosses the boundary, what code is coming, why it belongs there, what breaks
   without it). Never say something "works automatically" — name the mechanism.
3. **No premature dependencies.** No extra libraries, abstractions, design systems, state
   managers, or infrastructure. Prefer the native capabilities of Next.js, Clerk, and
   Convex. Do not wrap Convex to imitate REST.
4. **Filename headers.** Every file shown in a reply carries its project-relative path as the
   first comment line, e.g. `// # Filename: src/components/dashboard/PatientOverview.tsx`.
   Execution-step comments only where they materially help; no comments on obvious code.
5. **TypeScript throughout.** Readable over clever. Small enough to hold in your head.
6. **Concept reference per phase.** Each major part gets one document under
   `docs/concepts/`, named `phase-NN-<topic>.md`, recording the concepts that part
   demonstrated and why the code is shaped the way it is. Write it when the phase's code is
   complete, link it from that phase's section in `docs/PHASE_LOG.md`, and keep its claims
   checked against the code. It records understanding; it does not substitute for the
   learner answering the mastery check.
7. **Clinical safety.** Synthetic data only. No real patient data. No diagnostic
   functionality. No medical advice. AI summarizes; it never diagnoses and never becomes
   the source of truth for measurements or deterministic events. Human review stays in the
   loop.

## Audience

An experienced clinical vascular technologist learning software engineering. React, APIs,
auth concepts, databases, and backend architecture are already understood. The unknown is
the Next.js / Clerk / Convex ecosystem. Teach at that level: skip React fundamentals,
explain the ecosystem from first principles, and aim for the learner being able to defend
every architectural decision out loud.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
