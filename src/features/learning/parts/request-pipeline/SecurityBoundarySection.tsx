// # Filename: src/features/learning/parts/request-pipeline/SecurityBoundarySection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";

/**
 * Section 11 of Article 01. The rules that follow from everything above, each paired with
 * where this repository applies it — or, for actions, where the Phase 11 design commits to
 * it. Static; a Server Component.
 */
const RULES: { rule: string; here: React.ReactNode }[] = [
  {
    rule: "All browser input is untrusted.",
    here: <>The browser runs on a machine the user controls. Anything it sends may have been written by hand.</>,
  },
  {
    rule: "Validate every public function argument.",
    here: (
      <>
        Validators on every <C>args</C>; unknown fields are rejected. A validator proves type,
        not meaning — <C>recordSyntheticHeartRate</C> also bounds the value to 30–200 bpm.
      </>
    ),
  },
  {
    rule: "Authenticate inside protected backend functions.",
    here: <><C>requireIdentity</C> / <C>requireSubject</C> at the top of every patient function.</>,
  },
  {
    rule: "Authorize before reading, writing, or transmitting data.",
    here: <><C>requireOwnedPatient</C> runs before the measurements are read and before the insert.</>,
  },
  {
    rule: "Derive identity from the verified token.",
    here: <><C>ownerSubject</C> is written only from <C>identity.subject</C>.</>,
  },
  {
    rule: "Never accept trusted ownerSubject, role, or approval state from React.",
    here: <>No function takes them as arguments. An injected <C>ownerSubject</C> was rejected in Phase 5 testing.</>,
  },
  {
    rule: "Return minimum-necessary data.",
    here: <><C>listRecentForPatient</C> caps its read at 100 rows regardless of the requested limit.</>,
  },
  {
    rule: "Use internal functions to reduce the public attack surface.",
    here: <>The Phase 4 migration was an <C>internalMutation</C>, unreachable from any browser.</>,
  },
  {
    rule: "Internal functions still need carefully defined trust assumptions.",
    here: <>An internal function trusts its arguments; its public caller must have authorized them first.</>,
  },
  {
    rule: "Actions must validate external results before persistence.",
    here: (
      <>
        Future work. The Phase 11 design treats every byte of model output as untrusted and
        forces stored summaries to <C>&quot;draft&quot;</C> in server code.
      </>
    ),
  },
];

export function SecurityBoundarySection() {
  return (
    <ArticleSection id="security-boundary" number={11} title="The security boundary">
      <p>
        The boundary is the entry to each public Convex function. Everything on the browser side
        of it is a request; everything on the server side is a decision. These rules follow.
      </p>

      <ol className="max-w-[44rem] space-y-3">
        {RULES.map((item, index) => (
          <li key={item.rule} className="flex gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <span className="mt-0.5 font-mono text-xs text-foreground-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 text-sm leading-6">
              <p className="font-semibold text-foreground">{item.rule}</p>
              <p className="mt-0.5 text-foreground-muted">{item.here}</p>
            </div>
          </li>
        ))}
      </ol>

      <Callout tone="principle" title="Synthetic data only — not authorized for PHI">
        <p>
          Post-PCI Watch stores fabricated records for patients who do not exist. It is a teaching
          project, it is not HIPAA compliant, and no example in this article uses real patient
          data, real identifiers, tokens, or secret values. The controls above are necessary for
          handling real data; they are nowhere near sufficient on their own. Current findings are
          tracked in <C>docs/security/SECURITY_POSTURE.md</C>.
        </p>
      </Callout>
    </ArticleSection>
  );
}
