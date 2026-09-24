// # Filename: src/features/learning/parts/request-pipeline/FourSystemsSection.tsx
import { Atom, KeyRound, Server, Triangle } from "lucide-react";

import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";

/**
 * Section 2 of Article 01. One card per system: its responsibility, where it runs, and —
 * just as important — what it deliberately does not do. Static prose; a Server Component.
 */
const SYSTEMS = [
  {
    name: "Next.js",
    Icon: Triangle,
    responsibility: "Routing, layouts, Server Components, and delivering the application to the browser.",
    runs: "A Node.js server you deploy, and the build that produces the client bundle.",
    doesNot: "Hold a connection to the tab after it responds, or sit anywhere in the live data path.",
  },
  {
    name: "React",
    Icon: Atom,
    responsibility: "Interactive Client Components and turning state into UI.",
    runs: "Components render on both sides; the interactive ones hydrate and keep running in the browser.",
    doesNot: "Talk to the database. It renders whatever value a hook returns.",
  },
  {
    name: "Clerk",
    Icon: KeyRound,
    responsibility: "Authentication, sessions, and signed identity tokens.",
    runs: "Clerk's hosted Frontend API, plus Clerk's SDK in the browser and in proxy.ts.",
    doesNot: "Know that patients exist, or decide whether a clinician may see one.",
  },
  {
    name: "Convex",
    Icon: Server,
    responsibility:
      "Backend functions, the enforcement point for our authorization rules, database transactions, external actions, and reactive synchronization.",
    runs: "A hosted deployment with its own URL, separate from the Next.js server.",
    doesNot: "Write your authorization rules. It enforces what your functions check — and nothing else.",
  },
];

export function FourSystemsSection() {
  return (
    <ArticleSection id="four-systems" number={2} title="The four systems">
      <p>
        Four systems cooperate on every request, and most confusion comes from crediting one of
        them with another&rsquo;s job. Each has a responsibility, a place it runs, and a boundary
        it does not cross.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {SYSTEMS.map(({ name, Icon, responsibility, runs, doesNot }) => (
          <div key={name} className="rounded-xl border border-border bg-surface p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Icon aria-hidden="true" className="size-4 text-primary-text" />
              {name}
            </h3>
            <dl className="mt-3 space-y-2 text-sm leading-6">
              <div>
                <dt className="text-xs font-semibold text-foreground-muted">Responsible for</dt>
                <dd className="text-foreground">{responsibility}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground-muted">Runs</dt>
                <dd className="text-foreground">{runs}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground-muted">Does not</dt>
                <dd className="text-foreground">{doesNot}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <Callout tone="principle" title="Identity is not permission">
        <p>
          Clerk answers one question: <em>who is this?</em> It does not decide whether a clinician
          may access a particular patient, and it could not — patients are our data, in our
          database, with an <C>ownerSubject</C> field Clerk has never heard of. That rule lives in
          our backend code, in <C>convex/authz.ts</C>, and it runs inside every Convex function
          that touches a patient.
        </p>
      </Callout>
    </ArticleSection>
  );
}
