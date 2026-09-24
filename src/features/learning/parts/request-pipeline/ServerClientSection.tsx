// # Filename: src/features/learning/parts/request-pipeline/ServerClientSection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";
import { CodeBlock } from "../../components/CodeBlock";

/**
 * Section 10 of Article 01. Where the Next.js route stops and the live Convex path begins:
 * route protection on the server, hooks under a "use client" boundary, how that boundary
 * pulls imports into the client bundle, the three ways Next.js can read Convex, and why
 * protecting the route protects nothing in Convex. Static; a Server Component.
 */
const READ_MODES = [
  {
    api: "useQuery",
    where: "Client Component",
    reactive: "Yes — a live subscription",
    auth: "The connection's token",
    here: "Used for every live read in this app",
  },
  {
    api: "preloadQuery → usePreloadedQuery",
    where: "Server Component, then Client Component",
    reactive: "After hydration",
    auth: "Pass { token } explicitly on the server",
    here: "Not used",
  },
  {
    api: "fetchQuery",
    where: "Server Component, Route Handler, Server Action",
    reactive: "No — one answer",
    auth: "Pass { token } explicitly",
    here: "Not used",
  },
];

export function ServerClientSection() {
  return (
    <ArticleSection id="server-client" number={10} title="Server and Client Components">
      <p>
        The dashboard route is a Server Component. It runs on the Next.js server for each
        request, checks the Clerk session, and renders:
      </p>

      <CodeBlock
        path="src/app/dashboard/page.tsx (excerpt)"
        code={`export default async function DashboardPage() {
  await auth.protect();
  // ...
  <MonitoringDataWorkspace />`}
      />

      <p>
        <C>auth.protect()</C> decides whether <strong>this page</strong> renders for this
        request. When the response is sent, that execution is over; the server keeps no
        connection to the tab and cannot push anything later. So the live path cannot start
        here.
      </p>

      <p>
        <C>useQuery</C>, <C>useMutation</C>, and <C>useAction</C> are hooks that hold a
        subscription or a client reference over time. They need a component that keeps running
        in the browser, which is why <C>MonitoringDataWorkspace</C> begins with{" "}
        <C>&quot;use client&quot;</C>. That directive is a boundary in the module graph: every
        component it imports and renders — <C>RecentMeasurements</C>,{" "}
        <C>RecordSyntheticHeartRate</C>, <C>LiveConnectionLost</C>, <C>Card</C> — joins the
        client bundle with it, whether or not it has a directive of its own.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="hidden w-full table-fixed text-left text-xs md:table">
          <caption className="sr-only">Three ways Next.js code can read Convex data</caption>
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th scope="col" className="px-3 py-2 font-semibold text-foreground">API</th>
              <th scope="col" className="px-3 py-2 font-semibold text-foreground">Runs in</th>
              <th scope="col" className="px-3 py-2 font-semibold text-foreground">Reactive</th>
              <th scope="col" className="px-3 py-2 font-semibold text-foreground">Identity</th>
              <th scope="col" className="px-3 py-2 font-semibold text-foreground">In this app</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {READ_MODES.map((mode) => (
              <tr key={mode.api} className="align-top">
                <th scope="row" className="px-3 py-2.5 font-mono font-medium text-foreground">{mode.api}</th>
                <td className="px-3 py-2.5 text-foreground">{mode.where}</td>
                <td className="px-3 py-2.5 text-foreground">{mode.reactive}</td>
                <td className="px-3 py-2.5 text-foreground">{mode.auth}</td>
                <td className="px-3 py-2.5 text-foreground-muted">{mode.here}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="divide-y divide-border md:hidden">
          {READ_MODES.map((mode) => (
            <li key={mode.api} className="p-3 text-xs">
              <p className="font-mono font-semibold text-foreground">{mode.api}</p>
              <dl className="mt-1.5 grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1">
                <dt className="text-foreground-muted">Runs in</dt>
                <dd className="text-foreground">{mode.where}</dd>
                <dt className="text-foreground-muted">Reactive</dt>
                <dd className="text-foreground">{mode.reactive}</dd>
                <dt className="text-foreground-muted">Identity</dt>
                <dd className="text-foreground">{mode.auth}</dd>
                <dt className="text-foreground-muted">In this app</dt>
                <dd className="text-foreground">{mode.here}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      <Callout tone="correction" title="“Route protection means the database is protected.”">
        <p>
          <C>auth.protect()</C> guards a page on the Next.js server. Convex is a different
          server with a public URL — it has to be, because the browser connects to it directly.
          Anyone can open a connection and call any public function without ever loading{" "}
          <C>/dashboard</C>. Only the checks inside the Convex functions protect the data. The
          route check is a good user experience and a second layer; it is not the boundary.
        </p>
      </Callout>
    </ArticleSection>
  );
}
