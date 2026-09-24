// # Filename: src/features/learning/components/CapabilityTable.tsx
import { Check, Minus } from "lucide-react";

import { CTX_CAPABILITIES, CTX_COLUMNS } from "../data/ctxCapabilities";
import type { CtxCell } from "../types/learning";

/**
 * Renders the verified ctx capability data two ways: a comparison table from the md
 * breakpoint up, and one stacked card per context type below it, so a phone never needs to
 * scroll sideways to read it. Present and absent are marked by icon and by text, never by
 * colour alone. A Server Component: the data is static and nothing is interactive.
 */

function CellView({ cell }: { cell: CtxCell }) {
  if (cell === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-foreground-muted">
        <Minus aria-hidden="true" className="size-3.5 shrink-0" />
        Not present
      </span>
    );
  }

  return (
    <span className="inline-flex items-start gap-1.5 text-foreground">
      <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-status-normal" />
      <span>{cell.detail}</span>
    </span>
  );
}

const EXTERNAL_API = {
  query: "Not allowed — must be deterministic",
  mutation: "Not allowed — must be deterministic",
  action: "Allowed — fetch or an SDK",
} as const;

export function CapabilityTable() {
  return (
    <div>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
        <table className="w-full table-fixed text-left text-xs">
          <caption className="sr-only">
            Members of each Convex context type, from the installed convex 1.46.0 type definitions
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th scope="col" className="w-[26%] px-3 py-2 font-semibold text-foreground-muted">
                Member
              </th>
              {CTX_COLUMNS.map((column) => (
                <th key={column.key} scope="col" className="px-3 py-2 font-mono font-semibold text-foreground">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CTX_CAPABILITIES.map((row) => (
              <tr key={row.member} className="align-top">
                <th scope="row" className="px-3 py-2.5 font-normal">
                  <span className="font-mono font-medium text-foreground">{row.member}</span>
                  {row.note ? (
                    <span className="mt-1 block text-[11px] leading-snug text-foreground-muted">{row.note}</span>
                  ) : null}
                </th>
                {CTX_COLUMNS.map((column) => (
                  <td key={column.key} className="px-3 py-2.5">
                    <CellView cell={row[column.key]} />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="align-top bg-surface-raised">
              <th scope="row" className="px-3 py-2.5 font-normal">
                <span className="font-medium text-foreground">Call a third-party API</span>
                <span className="mt-1 block text-[11px] leading-snug text-foreground-muted">
                  Not a ctx member — a rule about the function type.
                </span>
              </th>
              {CTX_COLUMNS.map((column) => (
                <td key={column.key} className="px-3 py-2.5 text-foreground">
                  {EXTERNAL_API[column.key]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {CTX_COLUMNS.map((column) => (
          <section key={column.key} className="rounded-xl border border-border bg-surface p-4">
            <h3 className="font-mono text-sm font-semibold text-foreground">{column.label}</h3>
            <dl className="mt-3 space-y-2.5 text-xs">
              {CTX_CAPABILITIES.map((row) => (
                <div key={row.member}>
                  <dt className="font-mono font-medium text-foreground">{row.member}</dt>
                  <dd className="mt-0.5">
                    <CellView cell={row[column.key]} />
                  </dd>
                </div>
              ))}
              <div>
                <dt className="font-medium text-foreground">Third-party API</dt>
                <dd className="mt-0.5 text-foreground">{EXTERNAL_API[column.key]}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
