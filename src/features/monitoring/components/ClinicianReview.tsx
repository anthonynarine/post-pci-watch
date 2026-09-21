// # Filename: src/features/monitoring/components/ClinicianReview.tsx
import { ClipboardCheck, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function ClinicianReview() {
  return (
    <Card
      title="Clinician review"
      description="Where an AI-drafted summary of the monitoring window will appear."
      icon={ClipboardCheck}
      action={<StatusBadge tone="neutral" label="Not available" />}
    >
      <div className="rounded-lg border border-dashed border-border bg-surface-raised p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles aria-hidden="true" className="size-4 text-foreground-muted" />
          No summary generated
        </p>
        <p className="mt-2 text-xs text-foreground-muted">
          AI summarization is planned for a later phase and is not connected. No model has read
          this data and nothing on this page is model-generated.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-foreground-muted">
          <li>
            A summary will arrive as a <span className="font-mono">DRAFT</span> and stay a draft
            until a clinician accepts or rejects it.
          </li>
          <li>
            Measurements and rule-derived events remain the source of truth; the summary only
            organises them.
          </li>
        </ul>
      </div>
    </Card>
  );
}
