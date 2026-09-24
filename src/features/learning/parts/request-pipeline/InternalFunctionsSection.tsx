// # Filename: src/features/learning/parts/request-pipeline/InternalFunctionsSection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";
import { CodeBlock } from "../../components/CodeBlock";
import { FlowChain } from "../../components/FlowChain";
import { FunctionTypeExplorer } from "../../components/FunctionTypeExplorer";
import { FUNCTION_KINDS } from "../../data/functionKinds";

/**
 * Section 6 of Article 01. Internal visibility for all three function types, the future AI
 * flow that depends on it, why internal does not mean authorized, and the interactive
 * comparison of all six builders. The explorer is the only interactive island in this
 * section; the prose around it is a Server Component.
 */
export function InternalFunctionsSection() {
  return (
    <ArticleSection id="internal-functions" number={6} title="Internal functions">
      <p>
        <C>internalQuery</C>, <C>internalMutation</C>, and <C>internalAction</C> are not three
        new kinds of function. They are the same three types with a different{" "}
        <strong>visibility</strong>. An internal query is still a read-only, deterministic query;
        it just cannot be called by a client.
      </p>

      <CodeBlock
        path="convex/_generated/server.d.ts (excerpt)"
        code={`export declare const query: QueryBuilder<DataModel, "public">;
export declare const internalQuery: QueryBuilder<DataModel, "internal">;
export declare const mutation: MutationBuilder<DataModel, "public">;
export declare const internalMutation: MutationBuilder<DataModel, "internal">;
export declare const action: ActionBuilder<DataModel, "public">;
export declare const internalAction: ActionBuilder<DataModel, "internal">;`}
      />

      <p>
        Same builder, second type parameter changed. Who can reach each one:
      </p>

      <ul>
        <li>
          <strong>internalQuery</strong> — other functions through <C>ctx.runQuery</C>, the
          dashboard, and the CLI. Not the scheduler: it only accepts mutations and actions.
        </li>
        <li>
          <strong>internalMutation</strong> — other functions through <C>ctx.runMutation</C>,
          the scheduler, crons, the dashboard, and the CLI. This repository has one:{" "}
          <C>migrations.deleteUnownedPatients</C>, run once from the CLI during Phase 4.
        </li>
        <li>
          <strong>internalAction</strong> — other actions through <C>ctx.runAction</C>, the
          scheduler, crons, the dashboard, and the CLI.
        </li>
      </ul>

      <p>
        React cannot call any of them. The hooks are typed to accept only public references, and
        the deployment refuses a client&rsquo;s call to an internal function no matter what the
        browser sends.
      </p>

      <FlowChain
        label="A future AI flow — Phase 11, not built"
        steps={[
          "React",
          "public generateSummary action",
          "authenticate and authorize",
          "internalQuery retrieves minimum necessary context",
          "approved LLM receives bounded context",
          "output is validated",
          "internalMutation stores an AI-generated draft",
        ]}
      />

      <p>
        Each internal function in that flow exists so the browser cannot skip a step. Nobody can
        call the retrieval query directly and read context for a patient they were never
        authorized for; nobody can call the storing mutation directly and save text that never
        passed validation. The design is recorded in{" "}
        <C>docs/concepts/convex-llm-action-security.md</C>. As the previous section notes,
        Convex&rsquo;s docs would start this flow with a mutation that schedules an internal
        action rather than with a public action.
      </p>

      <Callout tone="principle" title="Internal means backend-only visibility. It does not mean authorized or safe.">
        <p>
          An internal function trusts its arguments, because only backend code and operators can
          supply them. That moves the obligation to the caller: the public function in front must
          already have authenticated, authorized, and validated everything it passes along. An
          internal mutation that accepts an <C>ownerSubject</C> will write whatever it is given.
          Removing a function from the public surface narrows who can call it; it does not check
          anything.
        </p>
      </Callout>

      <p>
        Compare all six builders side by side. Select one to see who may call it, what its{" "}
        <C>ctx</C> holds, and where it sits in the architecture.
      </p>

      <FunctionTypeExplorer kinds={FUNCTION_KINDS} />
    </ArticleSection>
  );
}
