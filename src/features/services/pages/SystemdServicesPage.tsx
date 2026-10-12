import { useMemo, useState } from 'react';
import { LayoutGrid, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorPanel } from '@/shared/ui/ErrorPanel';
import { Spinner } from '@/shared/ui/Spinner';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { ThemeToggle } from '@/shared/layout/ThemeToggle';
import { cn } from '@/shared/lib/cn';
import { useSystemdServices } from '../api/useSystemdServices';
import { SystemdServicesTable } from '../components/SystemdServicesTable';
import { filterSystemdServices, type ScopeFilter, type StateFilter } from './systemdSelectors';

export const SystemdServicesPage = () => {
  const { data, isPending, isError, error, isFetching, refetch, dataUpdatedAt } =
    useSystemdServices();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [state, setState] = useState<StateFilter>('all');
  const services = useMemo(
    () => data?.scopes.flatMap((snapshot) => snapshot.services) ?? [],
    [data],
  );
  const filtered = useMemo(
    () => filterSystemdServices(services, query, scope, state),
    [services, query, scope, state],
  );
  const runtimeAvailable = useMemo(
    () => ({
      system:
        data?.scopes.find((snapshot) => snapshot.scope === 'system')?.runtimeAvailable ?? false,
      user: data?.scopes.find((snapshot) => snapshot.scope === 'user')?.runtimeAvailable ?? false,
    }),
    [data],
  );
  const relevantScopes =
    data?.scopes.filter((snapshot) => scope === 'all' || snapshot.scope === scope) ?? [];
  const unavailable =
    relevantScopes.length > 0 &&
    relevantScopes.every((snapshot) => !snapshot.runtimeAvailable && !snapshot.unitFilesAvailable);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-fg">Services</h1>
          <p className="text-sm text-fg-muted tabular-nums">
            {isPending
              ? 'System and user services'
              : `${filtered.length} of ${services.length} units shown`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              aria-label="Search services"
              data-nx-page-search
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services…"
              className="h-9 w-52 rounded-md border border-border bg-paper pr-3 pl-8 text-sm text-fg placeholder:text-fg-subtle"
            />
          </div>
          <ThemeToggle />
          <Button
            variant="secondary"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <SegmentedControl<ScopeFilter>
          ariaLabel="Service scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'All scopes' },
            { value: 'system', label: 'System' },
            { value: 'user', label: 'User' },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          State
          <select
            value={state}
            onChange={(event) => setState(event.target.value as StateFilter)}
            className="h-9 rounded-md border border-border bg-paper px-3 text-sm text-fg"
          >
            <option value="all">All states</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="failed">Failed</option>
            <option value="unknown">Unobserved</option>
          </select>
        </label>
      </div>
      <p className="border-b border-border px-6 py-2 text-xs text-fg-muted">
        Read-only service inspection. Running state does not establish application health. Start,
        stop, and restart controls are coming in a later update.
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-6">
        {isError && data && (
          <ErrorPanel
            error={error}
            fallback="Refresh failed; previous service data is still shown."
            onRetry={() => void refetch()}
          />
        )}
        {isError && data && (
          <p aria-live="polite" className="text-xs text-warn">
            Showing the previous snapshot from {new Date(dataUpdatedAt).toLocaleTimeString()}.
          </p>
        )}
        {relevantScopes.map(
          (snapshot) =>
            snapshot.warnings.length > 0 && (
              <div
                key={snapshot.scope}
                aria-live="polite"
                className="shrink-0 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-xs text-fg-muted"
              >
                <p className="font-medium text-fg">
                  {snapshot.scope === 'system' ? 'System' : 'User'} discovery is incomplete
                </p>
                {snapshot.warnings.map((warning) => (
                  <p key={warning} className="mt-1 break-words">
                    {warning}
                  </p>
                ))}
              </div>
            ),
        )}
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-paper">
          {isPending ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : isError && !data ? (
            <div className="p-6">
              <ErrorPanel
                error={error}
                fallback="Failed to discover services"
                onRetry={() => void refetch()}
              />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<LayoutGrid className="h-8 w-8" />}
              title={unavailable ? 'Services unavailable' : 'No matching services'}
              description={
                unavailable
                  ? 'Systemd could not be queried for this scope. Review the diagnostics above and refresh.'
                  : query || state !== 'all'
                    ? 'Try another search or state filter.'
                    : 'No service units were found in this scope.'
              }
            />
          ) : (
            <SystemdServicesTable services={filtered} runtimeAvailable={runtimeAvailable} />
          )}
        </div>
      </div>
    </div>
  );
};
