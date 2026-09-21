// # Filename: src/features/monitoring/components/DeviceStatus.tsx
import {
  BatteryMedium,
  RefreshCw,
  Waves,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

import type { ConnectionState, MonitoringDevice } from "../types/monitoring";

const CONNECTION_ICONS: Record<ConnectionState, LucideIcon> = {
  connected: Wifi,
  degraded: Wifi,
  offline: WifiOff,
};

export function DeviceStatus({ device }: { device: MonitoringDevice }) {
  const ConnectionIcon = CONNECTION_ICONS[device.connection];

  const rows = [
    { Icon: ConnectionIcon, label: "Connection", value: device.connectionLabel },
    { Icon: RefreshCw, label: "Last sync", value: device.lastSyncAt },
    { Icon: BatteryMedium, label: "Battery", value: `${device.batteryPercent} %` },
    { Icon: Waves, label: "Sample rate", value: device.sampleRate },
  ];

  return (
    <Card
      title="Device and connectivity"
      description={`${device.model} · ${device.id}`}
      icon={ConnectionIcon}
      action={<StatusBadge tone={device.status} label={device.connectionLabel} />}
    >
      <dl className="space-y-2.5">
        {rows.map(({ Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-xs text-foreground-muted">
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </dt>
            <dd className="font-mono text-xs text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
