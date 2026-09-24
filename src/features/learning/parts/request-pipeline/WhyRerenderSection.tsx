// # Filename: src/features/learning/parts/request-pipeline/WhyRerenderSection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";
import { CodeBlock } from "../../components/CodeBlock";
import { FlowChain } from "../../components/FlowChain";

/**
 * Section 9 of Article 01. The reactive path from a committed write to a React rerender, and
 * the client-side ordering between a mutation's promise and the query update — read from the
 * installed Convex client source and labelled as implementation behaviour rather than a
 * documented guarantee. Static; a Server Component.
 */
export function WhyRerenderSection() {
  return (
    <ArticleSection id="why-rerender" number={9} title="Why React rerenders">
      <FlowChain
        tone="return"
        label="The reactive path"
        steps={[
          "database changes",
          "Convex detects overlap with a subscribed query's reads",
          "query reruns on the backend",
          "updated result crosses the WebSocket",
          "useQuery receives a new value",
          "React rerenders",
        ]}
      />

      <p>
        React is not watching the database. It cannot: the database is on another machine, and
        React only knows about state and props. What happens is ordinary React. The{" "}
        <C>ConvexReactClient</C> receives a new result on its socket and updates the value its{" "}
        <C>useQuery</C> hooks return. A hook returning a different value rerenders the component
        that called it — exactly like <C>useState</C> changing.
      </p>

      <p>
        Everything interesting happens on the server, before React is involved: the read set
        was recorded when the query first ran, the write was compared against it, and the query
        was rerun there. The client receives an answer, not an instruction to go and fetch one.
      </p>

      <Callout tone="evidence" title="How a mutation's promise is ordered against the update">
        <p>
          The two return paths are separate messages: a mutation response to the caller, and a
          query transition to subscribers. But the installed client does not resolve a
          successful mutation&rsquo;s promise when its response arrives. It parks the result with
          the commit timestamp and resolves it only when a transition at or past that timestamp
          has been applied:
        </p>
        <CodeBlock
          path="node_modules/convex/dist/esm/browser/sync/client.js (excerpt)"
          code={`case "Transition": {
  this.remoteQuerySet.transition(serverMessage);
  // ...
  const completedRequests = this.requestManager.removeCompleted(
    this.remoteQuerySet.timestamp()
  );
  this.notifyOnQueryResultChanges(completedRequests);`}
        />
        <p>
          So by the time <C>await recordSyntheticHeartRate(…)</C> continues, this tab&rsquo;s
          subscribed queries already include the write. A <em>failed</em> mutation settles as
          soon as its response arrives, because there is no commit to wait for. This is read
          from convex 1.46.0&rsquo;s source, not stated in its documentation — treat it as how
          the client behaves today, not as a contract to build on.
        </p>
      </Callout>
    </ArticleSection>
  );
}
