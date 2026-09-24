// # Filename: src/features/learning/parts/request-pipeline/RequestPipelineSection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";
import { FlowChain } from "../../components/FlowChain";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

/**
 * Section 3 of Article 01. The architecture diagram, the eleven-step pipeline, and one
 * paragraph per transition naming the mechanism that carries it. Static; a Server Component.
 */
const PIPELINE = [
  "React Client Component",
  "useQuery / useMutation / useAction",
  "generated public reference",
  "authenticated Convex connection",
  "Clerk token verification",
  "Convex function begins",
  "ctx.auth exposes verified identity",
  "application authorization",
  "read, write, or external call",
  "result or reactive update returns",
  "React rerenders",
];

const TRANSITIONS: { from: string; to: string; how: React.ReactNode }[] = [
  {
    from: "Client Component",
    to: "hook",
    how: (
      <>
        Hooks only run in components that execute in the browser, so the caller must sit under a{" "}
        <C>&quot;use client&quot;</C> boundary. In this app that is <C>MonitoringDataWorkspace</C>.
      </>
    ),
  },
  {
    from: "hook",
    to: "generated reference",
    how: (
      <>
        The hook is given <C>api.module.function</C>. The hooks&rsquo; type signatures accept only
        public references, so an internal one is a compile error before it is ever a runtime one.
      </>
    ),
  },
  {
    from: "reference",
    to: "authenticated connection",
    how: (
      <>
        The reference resolves to a name like <C>patients:getMyDemoPatient</C>, and the
        ConvexReactClient sends it, with the arguments, over its one WebSocket. The token was
        already sent on that connection; the call itself carries no identity.
      </>
    ),
  },
  {
    from: "connection",
    to: "token verification",
    how: (
      <>
        Convex checks the JWT&rsquo;s signature against the public keys of the issuer named in{" "}
        <C>auth.config.ts</C>, and its audience against <C>applicationID: &quot;convex&quot;</C>.
        A missing or unverifiable token is not an error here — it simply produces no identity.
      </>
    ),
  },
  {
    from: "verification",
    to: "function begins",
    how: (
      <>
        Convex validates the arguments against the function&rsquo;s declared validators —
        rejecting unknown fields — then calls the handler with a freshly constructed <C>ctx</C>.
      </>
    ),
  },
  {
    from: "function",
    to: "ctx.auth",
    how: (
      <>
        <C>await ctx.auth.getUserIdentity()</C> returns the verified claims, including{" "}
        <C>subject</C> (the Clerk user ID), or <C>null</C>. Our helper <C>requireIdentity</C> turns{" "}
        <C>null</C> into a thrown error.
      </>
    ),
  },
  {
    from: "ctx.auth",
    to: "authorization",
    how: (
      <>
        Our code compares the verified subject against the data: a patient&rsquo;s{" "}
        <C>ownerSubject</C>. This is where access is decided, and it is the step most likely to be
        forgotten, because nothing fails loudly without it.
      </>
    ),
  },
  {
    from: "authorization",
    to: "read / write / call",
    how: (
      <>
        A query reads through <C>ctx.db</C>. A mutation reads and writes in one transaction. An
        action has no <C>ctx.db</C>; it calls the outside world and reaches the database only
        through <C>ctx.runQuery</C> and <C>ctx.runMutation</C>.
      </>
    ),
  },
  {
    from: "work",
    to: "return",
    how: (
      <>
        Two different things come back. The caller receives the function&rsquo;s return value,
        once. Every subscribed query that read data this call wrote is rerun on the server, and
        its new result is pushed to every client holding it.
      </>
    ),
  },
  {
    from: "return",
    to: "rerender",
    how: (
      <>
        <C>useQuery</C> starts returning a new value; React rerenders the component that called
        it. Nothing in the component asked for the update.
      </>
    ),
  },
];

export function RequestPipelineSection() {
  return (
    <ArticleSection id="request-pipeline" number={3} title="End-to-end request pipeline">
      <p>
        Before the individual pieces, the whole shape. The diagram below places each step in the
        system that runs it; the numbered explanation underneath says the same thing in words.
      </p>

      <ArchitectureDiagram />

      <FlowChain label="The pipeline, in order" steps={PIPELINE} />

      <p>Each arrow is a real transition with a mechanism behind it:</p>

      <ol className="max-w-[44rem] space-y-3">
        {TRANSITIONS.map((transition, index) => (
          <li key={transition.from} className="flex gap-3">
            <span className="mt-1 font-mono text-xs text-foreground-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="min-w-0 flex-1">
              <span className="font-semibold">
                {transition.from} → {transition.to}.
              </span>{" "}
              {transition.how}
            </p>
          </li>
        ))}
      </ol>

      <Callout tone="correction" title="Not a REST endpoint">
        <p>
          There is no route per function and no component building an{" "}
          <C>Authorization</C> header. The browser keeps one authenticated connection and names
          the functions it wants run. Wrapping Convex to imitate REST would throw away the
          subscription model the rest of this article depends on.
        </p>
      </Callout>
    </ArticleSection>
  );
}
