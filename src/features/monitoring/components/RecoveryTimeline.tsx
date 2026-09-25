// # Filename: src/features/monitoring/components/RecoveryTimeline.tsx
import { Circle, CircleCheck, CircleDot, Clock, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";

import type { MilestoneState, RecoveryMilestone } from "../types/monitoring";

const STATES: Record<MilestoneState, { Icon: LucideIcon; label: string; className: string }> = {
  complete: { Icon: CircleCheck, label: "Complete", className: "text-status-normal" },
  current: { Icon: CircleDot, label: "In progress", className: "text-primary" },
  upcoming: { Icon: Circle, label: "Scheduled", className: "text-foreground-muted" },
};

export function RecoveryTimeline({ milestones }: { milestones: RecoveryMilestone[] }) {
  return (
    <Card
      title="Recovery timeline"
      description="Illustrative milestones for this fictional record. Static page content, not stored data."
      icon={Clock}
    >
      <ol className="space-y-4">
        {milestones.map((milestone) => {
          const { Icon, label, className } = STATES[milestone.state];

          return (
            <li key={milestone.id} className="flex gap-3">
              <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${className}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{milestone.label}</p>
                <p className="text-xs text-foreground-muted">
                  <span className="font-mono">{milestone.at}</span> &middot; {label}
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted">{milestone.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
