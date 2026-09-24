// # Filename: src/features/learning/parts/request-pipeline/MisconceptionsSection.tsx
import { CircleCheck, CircleX } from "lucide-react";

import { ArticleSection } from "../../components/ArticleSection";

/**
 * Section 12 of Article 01. Ten common simplifications, each labelled in words as a
 * misconception and followed by the correction — never marked by colour or strikethrough
 * alone. Static; a Server Component.
 */
const MISCONCEPTIONS = [
  {
    myth: "Clerk authorizes patient access.",
    fact: "Clerk authenticates. It proves who the user is and knows nothing about patients. requireOwnedPatient in our Convex code decides access.",
  },
  {
    myth: "React calls internal functions.",
    fact: "No client can. The hooks are typed for public references only, and the deployment refuses client calls to internal functions at runtime.",
  },
  {
    myth: "The generated API file contains the query implementation.",
    fact: "It holds a proxy that builds names like \"patients:getMyDemoPatient\" and the types for each function. The handler stays under convex/ and runs only on the deployment.",
  },
  {
    myth: "The mutation pushes its return value to every browser.",
    fact: "The return value goes only to the caller. Other browsers see the change because their own query subscriptions rerun.",
  },
  {
    myth: "React watches Convex directly.",
    fact: "React rerenders because useQuery returned a new value. The ConvexReactClient received that value; the server decided to send it.",
  },
  {
    myth: "An action can use ctx.db.",
    fact: "ActionCtx has no db member. Actions reach the database through ctx.runQuery and ctx.runMutation, each its own transaction.",
  },
  {
    myth: "Internal means automatically secure.",
    fact: "Internal narrows who can call a function. It authorizes nothing, and it trusts whatever arguments its backend caller passes.",
  },
  {
    myth: "Route protection means the database is protected.",
    fact: "auth.protect() gates a Next.js page. Convex has its own public URL; only checks inside Convex functions protect the data.",
  },
  {
    myth: "Convex eliminates the need to write authorization rules.",
    fact: "Convex verifies identity and enforces whatever your functions check. Deciding who may access what is still your code.",
  },
  {
    myth: "Every ctx has the same tools.",
    fact: "QueryCtx, MutationCtx, and ActionCtx are different interfaces: reader versus writer db, scheduler only where writes happen, no db at all in actions.",
  },
];

export function MisconceptionsSection() {
  return (
    <ArticleSection id="misconceptions" number={12} title="Common misconceptions">
      <p>
        Each of these is close enough to the truth to survive a tutorial and wrong enough to
        cause a security bug.
      </p>

      <ul className="grid gap-3 md:grid-cols-2">
        {MISCONCEPTIONS.map((item) => (
          <li key={item.myth} className="rounded-xl border border-border bg-surface p-4 text-sm leading-6">
            <p className="flex items-start gap-2 text-foreground">
              <CircleX aria-hidden="true" className="mt-1 size-4 shrink-0 text-status-critical" />
              <span>
                <span className="font-semibold">Misconception: </span>&ldquo;{item.myth}&rdquo;
              </span>
            </p>
            <p className="mt-2 flex items-start gap-2 text-foreground">
              <CircleCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-status-normal" />
              <span>
                <span className="font-semibold">Actually: </span>
                {item.fact}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </ArticleSection>
  );
}
