// # Filename: src/features/monitoring/components/PatientSummary.tsx
import { UserRound } from "lucide-react";

import { StatusBadge } from "@/components/ui/StatusBadge";

import type { SyntheticPatient } from "../types/monitoring";

export function PatientSummary({ patient }: { patient: SyntheticPatient }) {
  const details = [
    { label: "Procedure", value: patient.procedure },
    { label: "Stent location", value: patient.stentLocation },
    { label: "Procedure completed", value: patient.procedureCompletedAt },
    { label: "Monitoring since", value: patient.monitoringSince },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-raised text-foreground-muted">
            <UserRound aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {patient.name}
            </h2>
            <p className="text-xs text-foreground-muted">
              Fictional record{" "}
              <span className="font-mono">{patient.recordId}</span> &middot; {patient.age} years
              &middot; {patient.sex}
            </p>
          </div>
        </div>
        <StatusBadge tone={patient.monitoringStatus} label={patient.monitoringState} />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {details.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-foreground-muted">{label}</dt>
            <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
