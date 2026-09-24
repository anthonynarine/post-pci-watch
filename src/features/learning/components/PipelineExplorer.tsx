// # Filename: src/features/learning/components/PipelineExplorer.tsx
"use client";

import { useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, RotateCcw, TriangleAlert } from "lucide-react";

import { LANES, LANE_ORDER } from "../data/lanes";
import type { PipelineScenario } from "../types/learning";
import { CodeBlock } from "./CodeBlock";

/**
 * A Client Component because it owns click state: which scenario, which step. That is all
 * it holds. The scenarios themselves are plain data passed in from a Server Component, so
 * the prose around this explorer ships no JavaScript.
 */

// Literal class names so Tailwind can see them.
const COLUMN_START = ["md:col-start-1", "md:col-start-2", "md:col-start-3", "md:col-start-4"];

export function PipelineExplorer({ scenarios }: { scenarios: PipelineScenario[] }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [stepIndex, setStepIndex] = useState(0);

  const scenario = scenarios.find((candidate) => candidate.id === scenarioId) ?? scenarios[0];
  const step = scenario.steps[stepIndex];
  const lane = LANES[step.lane];
  const isLast = stepIndex === scenario.steps.length - 1;

  function selectScenario(id: string) {
    setScenarioId(id);
    setStepIndex(0);
  }

  function move(delta: number) {
    setStepIndex((current) =>
      Math.min(scenario.steps.length - 1, Math.max(0, current + delta)),
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div
        role="tablist"
        aria-label="Scenario"
        className="flex flex-wrap gap-1 border-b border-border bg-surface-raised p-1.5"
      >
        {scenarios.map((candidate) => {
          const selected = candidate.id === scenario.id;

          return (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              id={`scenario-tab-${candidate.id}`}
              aria-selected={selected}
              aria-controls="pipeline-panel"
              onClick={() => selectScenario(candidate.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground-muted hover:bg-border/60 hover:text-foreground"
              }`}
            >
              {candidate.label}
            </button>
          );
        })}
      </div>

      <div
        id="pipeline-panel"
        role="tabpanel"
        aria-labelledby={`scenario-tab-${scenario.id}`}
        className="p-4 sm:p-5"
      >
        <p className="text-sm text-foreground-muted">{scenario.summary}</p>

        {/* Lane headers. Hidden on narrow screens, where each step carries its own label. */}
        <div className="mt-5 hidden grid-cols-4 gap-2 md:grid">
          {LANE_ORDER.map((id) => (
            <div key={id} className={`rounded-md border px-2 py-1.5 ${LANES[id].border} ${LANES[id].soft}`}>
              <p className={`text-xs font-semibold ${LANES[id].text}`}>{LANES[id].label}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-foreground-muted">{LANES[id].runs}</p>
            </div>
          ))}
        </div>

        {/* The swimlane trace: one row per step, placed in the lane where it runs. A line
            between rows marks the moment work crosses from one machine to another. */}
        <ol className="mt-3 space-y-1.5" aria-label="Steps">
          {scenario.steps.map((candidate, index) => {
            const column = LANE_ORDER.indexOf(candidate.lane);
            const previous = index > 0 ? LANE_ORDER.indexOf(scenario.steps[index - 1].lane) : column;
            const from = Math.min(previous, column);
            const to = Math.max(previous, column);
            const active = index === stepIndex;
            const reached = index <= stepIndex;
            const candidateLane = LANES[candidate.lane];

            return (
              <li key={candidate.title} className="relative grid grid-cols-1 md:grid-cols-4 md:gap-2">
                {from !== to ? (
                  <span
                    aria-hidden="true"
                    className={`absolute top-1/2 hidden h-px md:block ${reached ? "bg-foreground-muted" : "bg-border"}`}
                    style={{ left: `${((from + 0.5) / 4) * 100}%`, width: `${((to - from) / 4) * 100}%` }}
                  />
                ) : null}

                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => setStepIndex(index)}
                  className={`relative flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${COLUMN_START[column]} ${
                    active
                      ? `${candidateLane.border} ${candidateLane.soft} font-semibold text-foreground ring-1 ring-current ${candidateLane.text}`
                      : reached
                        ? "border-border bg-surface text-foreground hover:border-border-strong"
                        : "border-dashed border-border bg-surface text-foreground-muted opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className={`size-1.5 shrink-0 rounded-full ${candidateLane.dot}`} aria-hidden="true" />
                  <span className="font-mono text-[10px] text-foreground-muted">{index + 1}</span>
                  <span className={`min-w-0 flex-1 truncate ${active ? "text-foreground" : ""}`}>
                    <span className="md:hidden">{candidateLane.label}: </span>
                    {candidate.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Detail for the current step. aria-live so moving through steps is announced. */}
        <div aria-live="polite" className={`mt-5 rounded-lg border p-4 ${lane.border}`}>
          <p className={`text-xs font-semibold ${lane.text}`}>
            Step {stepIndex + 1} of {scenario.steps.length} · runs in {lane.label}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-foreground">{step.body}</p>

          {step.crosses ? (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-foreground">
              <ArrowLeftRight aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-foreground-muted" />
              <span>
                <span className="font-semibold">Crosses the boundary: </span>
                {step.crosses}
              </span>
            </p>
          ) : null}

          {step.code ? (
            <div className="mt-3">
              <CodeBlock path={step.code.path} code={step.code.code} />
            </div>
          ) : null}

          {step.corrects ? (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-status-warning-line bg-status-warning-soft px-3 py-2 text-xs text-foreground">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
              <span>
                <span className="font-semibold text-status-warning">Corrects: </span>
                {step.corrects}
              </span>
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStepIndex(0)}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Restart
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-raised disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ChevronLeft aria-hidden="true" className="size-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={isLast}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Next step
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
