// # Filename: src/features/learning/parts/request-pipeline/ArchitecturalSentenceSection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";

/**
 * Section 1 of Article 01. States the one-sentence mental model, then names each place where
 * the sentence is a simplification and replaces it with the precise version the rest of the
 * article defends. Static prose; a Server Component.
 */
export function ArchitecturalSentenceSection() {
  return (
    <ArticleSection id="architectural-sentence" number={1} title="The architectural sentence">
      <blockquote className="max-w-[44rem] border-l-4 border-primary pl-5 text-lg leading-8 text-foreground">
        Next.js and React ask Convex to run backend functions. Clerk establishes who the caller
        is. Convex verifies that identity, supplies the function with an appropriate context, and
        runs our authorization and business logic. Reactive query results then update the React
        interface.
      </blockquote>

      <p>
        That sentence is a mental model. It is good enough to orient yourself and to explain the
        system to someone in thirty seconds. It is not precise enough to defend an architectural
        decision, and every vague phrase in it hides a mechanism you will eventually need.
      </p>

      <p>Here is what each phrase actually means in this codebase:</p>

      <ul>
        <li>
          <strong>&ldquo;Ask Convex to run backend functions.&rdquo;</strong> A Client Component
          calls a hook with a generated reference such as <C>api.patients.getMyDemoPatient</C>.
          The browser sends a message naming that <em>public</em> function over a WebSocket that
          was already open. It is not an HTTP request to a URL you designed.
        </li>
        <li>
          <strong>&ldquo;Clerk establishes who the caller is.&rdquo;</strong> Clerk signs a
          short-lived JWT for the signed-in session. The token rides the Convex connection. It is
          not attached to each call.
        </li>
        <li>
          <strong>&ldquo;Convex verifies that identity.&rdquo;</strong> Convex checks the JWT
          signature against the issuer that <C>convex/auth.config.ts</C> trusts. Until that
          succeeds, <C>ctx.auth.getUserIdentity()</C> returns <C>null</C>.
        </li>
        <li>
          <strong>&ldquo;An appropriate context.&rdquo;</strong> There are three context types,
          and they are not interchangeable. A query&rsquo;s <C>ctx.db</C> cannot write. An action
          has no <C>ctx.db</C> at all.
        </li>
        <li>
          <strong>&ldquo;Runs our authorization.&rdquo;</strong> Nothing authorizes for you.
          Convex hands the function a verified identity; whether that identity may touch this
          patient is a rule we wrote.
        </li>
        <li>
          <strong>&ldquo;Reactive query results update React.&rdquo;</strong> Yes — but a
          mutation&rsquo;s own return value is a second, separate path that reaches only the
          caller.
        </li>
      </ul>

      <Callout tone="principle" title="The precise version">
        <p>
          A Client Component selects a <strong>public</strong> function through a generated
          reference. The Convex client sends the call over a connection that Clerk&rsquo;s signed
          token has already authenticated. Convex verifies the token, then invokes the function
          with a context typed for a query, mutation, or action. Our code reads the verified
          identity, validates and authorizes the request, and only then reads, writes, or calls
          out. The caller gets one answer; every subscriber whose query read the changed data
          gets a new result, and <C>useQuery</C> hands React a new value.
        </p>
      </Callout>
    </ArticleSection>
  );
}
