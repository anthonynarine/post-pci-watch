// # Filename: src/features/learning/parts/request-pipeline/GeneratedApiSection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";
import { CodeBlock } from "../../components/CodeBlock";

/**
 * Section 4 of Article 01. What `npx convex dev` generates, why `api` and `internal` are
 * typed references rather than implementations, and how one runtime proxy can serve both.
 * Excerpts are copied from the generated files and the installed Convex source. Static; a
 * Server Component.
 */
export function GeneratedApiSection() {
  return (
    <ArticleSection id="generated-api" number={4} title="The generated API object">
      <p>
        Every time <C>npx convex dev</C> pushes your functions, it regenerates{" "}
        <C>convex/_generated/</C>. The file React imports from is <C>api</C>, and it is worth
        being exact about what it is — because it is much less than it looks.
      </p>

      <CodeBlock
        path="convex/_generated/api.d.ts (excerpt)"
        code={`declare const fullApi: ApiFromModules<{
  authz: typeof authz;
  fixtures: typeof fixtures;
  measurements: typeof measurements;
  migrations: typeof migrations;
  patients: typeof patients;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;`}
      />

      <ul>
        <li>
          <C>fullApi</C> is built from <C>typeof</C> each module under <C>convex/</C>, so it knows
          every exported function&rsquo;s argument and return types.
        </li>
        <li>
          <C>api</C> is that object filtered to <strong>public</strong> references;{" "}
          <C>internal</C> is it filtered to <strong>internal</strong> ones. Same source, two
          views.
        </li>
        <li>
          <C>authz</C> and <C>fixtures</C> appear in <C>fullApi</C> but contribute nothing to
          either view: they export plain helpers and constants, not registered functions.
        </li>
      </ul>

      <p>Now the runtime file:</p>

      <CodeBlock
        path="convex/_generated/api.js (excerpt)"
        code={`import { anyApi, componentsGeneric } from "convex/server";

export const api = anyApi;
export const internal = anyApi;`}
      />

      <p>
        At runtime <C>api</C> and <C>internal</C> are <em>the same object</em>. It is a proxy
        whose only job is to turn a property path into a function name:
      </p>

      <CodeBlock
        path="node_modules/convex/dist/esm/server/api.js (excerpt)"
        code={`const path = pathParts.slice(0, -1).join("/");
const exportName = pathParts[pathParts.length - 1];
// ...
return path + ":" + exportName;   // api.patients.getMyDemoPatient → "patients:getMyDemoPatient"`}
      />

      <p>So the generated API reference:</p>

      <ul>
        <li>
          <strong>contains no business logic.</strong> The handler for{" "}
          <C>getMyDemoPatient</C> stays in <C>convex/patients.ts</C> and runs only on the Convex
          deployment. The browser never receives it.
        </li>
        <li>
          <strong>carries types end to end.</strong> The arguments below are checked against the
          validators declared in <C>convex/measurements.ts</C>; pass a string for{" "}
          <C>limit</C> and the React component fails to compile. The result is typed as an array
          of measurement documents.
        </li>
        <li>
          <strong>separates public from internal only in the type system.</strong> The
          deployment enforces the same boundary again at runtime, which is the part that holds
          against a hostile client.
        </li>
      </ul>

      <CodeBlock
        path="src/features/monitoring/components/MonitoringDataWorkspace.tsx"
        code={`const measurements = useQuery(
  api.measurements.listRecentForPatient,
  patient ? { patientId: patient._id, limit: RECENT_LIMIT } : "skip",
);`}
      />

      <Callout tone="correction" title="“The generated API file contains the query implementation.”">
        <p>
          It contains a name-building proxy and a set of types. The implementation lives under{" "}
          <C>convex/</C> and never leaves the deployment.
        </p>
      </Callout>
    </ArticleSection>
  );
}
