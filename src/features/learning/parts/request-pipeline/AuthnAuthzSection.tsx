// # Filename: src/features/learning/parts/request-pipeline/AuthnAuthzSection.tsx
import { Fingerprint, ShieldCheck } from "lucide-react";

import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";
import { CodeBlock } from "../../components/CodeBlock";

/**
 * Section 8 of Article 01. Separates the two questions, shows where each is answered in this
 * repository, and explains why a caller may name a record but never assert who it is.
 * Excerpts are from convex/authz.ts. Static; a Server Component.
 */
export function AuthnAuthzSection() {
  return (
    <ArticleSection id="authn-authz" number={8} title="Authentication versus authorization">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Fingerprint aria-hidden="true" className="size-4 text-accent-amber" />
            Authentication
          </p>
          <p className="mt-2 text-lg font-medium text-foreground">Who is calling?</p>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Answered by Clerk&rsquo;s signed token and Convex&rsquo;s verification of it. Our code
            only reads the answer.
          </p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary-text" />
            Authorization
          </p>
          <p className="mt-2 text-lg font-medium text-foreground">
            May this caller perform this operation on this patient?
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Answered by our code, inside the Convex function, against our data.
          </p>
        </div>
      </div>

      <p>Authentication, as the code sees it, is one call:</p>

      <CodeBlock
        path="convex/authz.ts — requireIdentity"
        code={`const identity = await ctx.auth.getUserIdentity();

if (identity === null) {
  throw new Error("Not authenticated");
}`}
      />

      <p>
        Authorization is a decision about data, so it needs the data. Every function that takes
        a patient ID begins with:
      </p>

      <CodeBlock path="convex/measurements.ts" code={`await requireOwnedPatient(ctx, args.patientId);`} />

      <p>
        which loads the patient and throws unless its <C>ownerSubject</C> equals the verified{" "}
        <C>identity.subject</C>. It throws the same <C>&quot;Patient not found&quot;</C> for a
        patient that does not exist and one that belongs to someone else, so the error cannot be
        used to discover which IDs are real.
      </p>

      <Callout tone="principle" title="Name a record; never claim an identity">
        <p>
          The client may say <em>which</em> record it wants — a <C>patientId</C> — because the
          server checks that claim against the data before using it. The client may never supply
          who it is, who owns something, what role it holds, or whether something is approved.
          Those are the inputs to the authorization decision; accepting them from the browser
          lets the browser make the decision. No function here takes an <C>ownerSubject</C>
          argument, and Phase 5 proved an injected one is rejected by the validator before the
          handler runs.
        </p>
      </Callout>
    </ArticleSection>
  );
}
