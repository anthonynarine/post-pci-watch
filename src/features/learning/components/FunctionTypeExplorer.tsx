// # Filename: src/features/learning/components/FunctionTypeExplorer.tsx
"use client";

import { useRef, useState } from "react";
import { Ban, Globe, Lock } from "lucide-react";

import type { FunctionKind } from "../types/learning";
import { FlowChain } from "./FlowChain";

/**
 * Interactive comparison of the six Convex function builders — three types, two
 * visibilities — for the teaching library. Educational only: it imports no Convex hook and
 * calls no backend function; every value it shows is static data passed in from a Server
 * Component.
 *
 * A Client Component because selection is state and arrow-key navigation needs an event
 * handler. It follows the WAI-ARIA tabs pattern with a roving tabindex: Tab enters the
 * group on the selected option, Left/Right move along a row, Up/Down switch between public
 * and internal, Home/End jump to the ends. Selection follows focus.
 */

const COLUMNS = 3;

export function FunctionTypeExplorer({ kinds }: { kinds: FunctionKind[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = kinds[selectedIndex];
  const isPublic = selected.visibility === "public";

  function select(index: number) {
    const next = (index + kinds.length) % kinds.length;
    setSelectedIndex(next);
    tabs.current[next]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const moves: Record<string, number> = {
      ArrowRight: selectedIndex + 1,
      ArrowLeft: selectedIndex - 1,
      ArrowDown: selectedIndex + COLUMNS,
      ArrowUp: selectedIndex - COLUMNS,
      Home: 0,
      End: kinds.length - 1,
    };

    if (event.key in moves) {
      event.preventDefault();
      select(moves[event.key]);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-surface-raised p-3 sm:p-4">
        <p id="function-explorer-label" className="text-sm font-semibold text-foreground">
          Function type explorer
        </p>
        <p className="mt-0.5 text-xs text-foreground-muted">
          Choose a builder. Arrow keys move across types and between public and internal. Nothing
          here calls a real backend function.
        </p>

        <div
          role="tablist"
          aria-labelledby="function-explorer-label"
          className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3"
        >
          {kinds.map((kind, index) => {
            const active = index === selectedIndex;
            const VisibilityIcon = kind.visibility === "public" ? Globe : Lock;

            return (
              <button
                key={kind.id}
                ref={(element) => {
                  tabs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`function-tab-${kind.id}`}
                aria-selected={active}
                aria-controls="function-explorer-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={handleKeyDown}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:border-border-strong"
                }`}
              >
                <VisibilityIcon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-semibold">{kind.builder}</span>
                  <span className={`block text-[11px] ${active ? "opacity-90" : "text-foreground-muted"}`}>
                    {kind.visibility === "public" ? "Public" : "Internal"} {kind.type}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="function-explorer-panel"
        role="tabpanel"
        aria-labelledby={`function-tab-${selected.id}`}
        className="p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-base font-semibold text-foreground">{selected.builder}</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              isPublic
                ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                : "border-accent-teal/40 bg-accent-teal/10 text-accent-teal"
            }`}
          >
            {isPublic ? <Globe aria-hidden="true" className="size-3" /> : <Lock aria-hidden="true" className="size-3" />}
            {isPublic ? "Public visibility" : "Internal visibility"}
          </span>
          <span className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-foreground-muted">
            Type: {selected.type}
          </span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Field term="Who may invoke it">{selected.invokedBy}</Field>
          <Field term="React hook">
            {selected.reactHook ? (
              <span className="font-mono">{selected.reactHook}</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Ban aria-hidden="true" className="size-3.5 text-status-critical" />
                Not callable from React
              </span>
            )}
          </Field>
          <Field term="Direct database access">{selected.database}</Field>
          <Field term="External API calls">{selected.externalApi}</Field>
          <Field term="Transaction behaviour">{selected.transaction}</Field>
          <Field term="Return behaviour">{selected.returns}</Field>
          <Field term="ctx members" wide>
            <ul className="flex flex-wrap gap-1.5">
              {selected.ctxHighlights.map((member) => (
                <li
                  key={member}
                  className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {member}
                </li>
              ))}
            </ul>
          </Field>
          <Field term={selected.example.status === "current" ? "In this repository" : "Future use — not built"} wide>
            {selected.example.text}
            {selected.example.path ? (
              <span className="mt-1 block font-mono text-[11px] text-foreground-muted">{selected.example.path}</span>
            ) : null}
          </Field>
        </dl>

        {!isPublic ? (
          <p className="mt-4 rounded-md border border-status-warning-line bg-status-warning-soft px-3 py-2 text-xs text-foreground">
            <span className="font-semibold text-status-warning">Internal is visibility, not safety. </span>
            It removes this function from the public attack surface. It does not authorize anything:
            whatever arguments its backend caller passes are trusted by construction, so the caller
            must already have authorized them.
          </p>
        ) : null}

        <div className="mt-4">
          <FlowChain label="Its place in the architecture" steps={selected.flow} />
        </div>
      </div>
    </div>
  );
}

function Field({ term, wide = false, children }: { term: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold text-foreground-muted">{term}</dt>
      <dd className="mt-1 leading-6 text-foreground">{children}</dd>
    </div>
  );
}
