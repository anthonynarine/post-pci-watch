// # Filename: src/features/learning/parts/request-pipeline/PublicFunctionsSection.tsx
import { ArticleSection, C, SubHeading } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";
import { CodeBlock } from "../../components/CodeBlock";
import { FlowChain } from "../../components/FlowChain";

/**
 * Section 5 of Article 01. The three public function types — query, mutation, action — each
 * with its flow, its guarantees, and what it is for. The mutation part separates the
 * caller's return value from the reactive path; the action part is future-facing, because
 * actions are not permitted in this codebase yet. Static; a Server Component.
 */
export function PublicFunctionsSection() {
  return (
    <ArticleSection id="public-functions" number={5} title="Public function types">
      <p>
        Convex has exactly three function types: <strong>query</strong>,{" "}
        <strong>mutation</strong>, and <strong>action</strong>. Each can be declared public or
        internal. This section covers the public ones — the only ones a browser can reach.
      </p>

      <SubHeading>Query</SubHeading>

      <FlowChain
        label="Query"
        steps={["React useQuery", "public Convex query", "authenticate", "authorize", "read database", "return subscribed result"]}
      />

      <ul>
        <li>
          <strong>Read-only.</strong> <C>ctx.db</C> is a <C>GenericDatabaseReader</C>. There is no
          insert, patch, or delete to call.
        </li>
        <li>
          <strong>A subscription, not a request.</strong> <C>useQuery</C> registers the query with
          its arguments on the WebSocket and keeps it registered for as long as the component is
          mounted.
        </li>
        <li>
          <strong>Loading is <C>undefined</C>.</strong> Until the first result arrives the hook
          returns <C>undefined</C>. Passing <C>&quot;skip&quot;</C> instead of arguments keeps the
          subscription closed — this app skips until Convex reports the connection authenticated,
          and skips the measurements query until the patient is known.
        </li>
        <li>
          <strong>Dependency tracking.</strong> While the handler runs, Convex records what it read
          — for <C>listRecentForPatient</C>, one index range for one patient. That read set is
          stored with the subscription.
        </li>
        <li>
          <strong>Reruns after relevant changes.</strong> When a committed write overlaps that
          read set, Convex reruns the query on the server and pushes the new result. Writes that
          do not overlap rerun nothing.
        </li>
        <li>
          <strong>Deterministic.</strong> Same arguments, same database state, same result. That is
          what makes rerunning safe, and why a query may not call an external API.
        </li>
      </ul>

      <Callout tone="note" title="Why there is no useEffect or refetch">
        <p>
          <C>useEffect</C> + fetch, polling, <C>router.refresh()</C>, and cache invalidation all
          solve the same problem: the client not knowing when data changed. Here the server knows
          — it tracked what the query read — and it tells the client. There is no staleness for
          the client to manage.
        </p>
      </Callout>

      <SubHeading>Mutation</SubHeading>

      <FlowChain
        label="Mutation — the caller's path"
        steps={["React useMutation", "public Convex mutation", "authenticate", "authorize", "transactional write", "return once"]}
      />

      <FlowChain
        tone="return"
        label="Mutation — the separate reactive path"
        steps={["mutation commits", "affected query reruns", "subscription receives new result", "React rerenders"]}
      />

      <p>
        A mutation is one transaction. Every read inside it sees a consistent snapshot, and every
        write commits together — if the handler throws halfway, nothing was written. Like a
        query, it must be deterministic and may not call third-party APIs.
      </p>

      <p>
        Its return value goes to <strong>the caller, once</strong>. It is not broadcast. A second
        tab watching the same patient never called the mutation and has no promise waiting for
        it; it sees the new row only because its own subscription read the range the mutation
        wrote into. The mutation changes backend truth; the subscriptions distribute it.
      </p>

      <CodeBlock
        path="src/features/monitoring/components/RecordSyntheticHeartRate.tsx"
        code={`await recordSyntheticHeartRate({ patientId, value: nextDemoValue() });
// Nothing is done with the return value on purpose. The row appears because the
// subscription delivers it, not because this call resolved.`}
      />

      <SubHeading>Action</SubHeading>

      <FlowChain
        label="Action — future use, not built in this codebase"
        steps={[
          "React useAction",
          "public Convex action",
          "authenticate",
          "authorize (through ctx.runQuery)",
          "external service call",
          "internal query / mutation for database work",
          "return once",
        ]}
      />

      <ul>
        <li>
          <strong>For the outside world.</strong> An action is the only function type that may
          call <C>fetch</C> or an external SDK — a payment provider, an email service, an LLM.
        </li>
        <li>
          <strong>No direct <C>ctx.db</C>.</strong> The context type does not have one. Reads go
          through <C>ctx.runQuery</C>, writes through <C>ctx.runMutation</C>, and Convex
          propagates the caller&rsquo;s identity into them.
        </li>
        <li>
          <strong>Not a transaction.</strong> Each <C>runQuery</C> and <C>runMutation</C> is its
          own transaction, and two of them are not guaranteed to see consistent data. An action
          can call a paid API, be billed, and then fail before anything is saved.
        </li>
        <li>
          <strong>Retries and idempotency are yours.</strong> Convex retries neither automatically,
          because an action may already have had side effects. If a caller retries, the external
          call may happen twice unless you designed for it — for example by recording a request
          ID before calling out.
        </li>
        <li>
          <strong>Not for ordinary reads and writes.</strong> An action that only touches the
          database gains nothing and loses the transaction, the determinism, and the reactivity:
          <C>useAction</C> returns once and never updates.
        </li>
      </ul>

      <Callout tone="correction" title="The documented pattern is usually mutation first">
        <p>
          Convex&rsquo;s own docs call a direct client-to-action call an anti-pattern in most
          cases. The recommended shape is: the client calls a <strong>mutation</strong>, which
          records the intent in the database and schedules an <strong>internal action</strong>.
          The intent is then durable, visible to subscriptions, and not lost if the tab closes.
          This project will decide between the two in Phase 11; neither exists yet.
        </p>
      </Callout>
    </ArticleSection>
  );
}
