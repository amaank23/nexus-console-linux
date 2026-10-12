import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/ui/DataTable';
import { formatBytes, formatDuration } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { ServiceScope, SystemdService } from '../api/systemd.schema';
import { systemdStateLabel } from '../pages/systemdSelectors';

export const SystemdServicesTable = ({
  services,
  runtimeAvailable,
}: {
  services: SystemdService[];
  runtimeAvailable: Record<ServiceScope, boolean>;
}) => {
  const columns = useMemo<ColumnDef<SystemdService>[]>(
    () => [
      {
        accessorKey: 'unit',
        header: 'Service',
        size: 250,
        meta: { grow: true },
        cell: ({ row: { original: service } }) => (
          <div
            className="min-w-0"
            title={service.aliasOf ? `Alias of ${service.aliasOf}` : service.unit}
          >
            <p className="truncate text-sm font-medium text-fg">{service.unit}</p>
            <p className="truncate text-xs text-fg-muted" title={service.description ?? undefined}>
              {service.description ??
                (service.template ? 'Requires an instance name' : 'Description unavailable')}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'scope',
        header: 'Scope',
        size: 76,
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted">
            {row.original.scope === 'system' ? 'System' : 'User'}
          </span>
        ),
      },
      {
        id: 'state',
        header: 'State',
        size: 130,
        accessorFn: (service) => systemdStateLabel(service, runtimeAvailable[service.scope]),
        cell: ({ row: { original: service } }) => (
          <div
            title={`Load: ${service.loadState ?? 'unobserved'}; state: ${service.activeState ?? 'unobserved'}`}
          >
            <p
              className={cn(
                'text-xs font-medium',
                service.activeState === 'failed' ? 'text-danger' : 'text-fg',
              )}
            >
              {systemdStateLabel(service, runtimeAvailable[service.scope])}
            </p>
            <p className="truncate text-xs text-fg-muted">
              {service.subState ?? 'State unobserved'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'unitFileState',
        header: 'Enablement',
        size: 115,
        cell: ({ row }) => (
          <span
            className="text-xs text-fg-muted"
            title="Unit file enablement; separate from runtime state"
          >
            {row.original.unitFileState ?? 'Unknown'}
          </span>
        ),
      },
      {
        accessorKey: 'mainPid',
        header: 'PID',
        size: 72,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted tabular-nums">{row.original.mainPid ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'memoryBytes',
        header: 'Memory',
        size: 85,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="text-xs text-fg-muted tabular-nums">
            {formatBytes(row.original.memoryBytes)}
          </span>
        ),
      },
      {
        accessorKey: 'cpuTimeSeconds',
        header: 'CPU time',
        size: 92,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span
            className="text-xs text-fg-muted tabular-nums"
            title="Cumulative CPU time, not CPU utilization"
          >
            {formatDuration(row.original.cpuTimeSeconds)}
          </span>
        ),
      },
      {
        accessorKey: 'health',
        header: 'Health',
        size: 84,
        cell: () => (
          <span className="text-xs text-fg-muted" title="No application health probe has run">
            Unknown
          </span>
        ),
      },
    ],
    [runtimeAvailable],
  );
  return (
    <DataTable
      data={services}
      columns={columns}
      getRowId={(service) => `${service.scope}:${service.unit}`}
      estimateRowHeight={58}
    />
  );
};
