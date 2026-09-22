# Post-PCI Watch — Working Agreement

**`docs/PROJECT_SOURCE.md` is the governing contract for this repository.** Read it before
doing any work here. It defines the product, the architecture, the teaching contract, the
development rules, and the 17-phase roadmap. This file is the operational binding: how that
contract is enforced turn to turn, plus the mutable state (which phase we are in).

Where the two disagree, `docs/PROJECT_SOURCE.md` wins.

## Project state

- **Current phase: Phase 5 — Realtime Data.**
- Phase 1 status: code complete. Its mastery check has not been answered in the learner's
  own words and stays open in `docs/PHASE_LOG.md`.
- Phase 2 status: code complete and verified end to end. Its mastery check is also still
  open.
- Phase 3 status: code complete. Its mastery check is also still open.
- Phase 4 status: code complete and verified. Its mastery check is also still open.
- Phase 5 status: code complete. One manual control records a synthetic heart rate and the
  subscribed table updates without a refresh. Single-client reactivity and cross-client push
  are proven; the two-browser-tab test is blocked by S-20 and is not claimed.
- Not yet permitted in the codebase: AI providers, PhysioNet, Synthea. Within Clerk: no
  organizations, roles, or webhooks. Within Convex: no actions, no scheduled functions, no
  HTTP endpoints.

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
