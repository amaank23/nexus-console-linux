import type { ServiceScope, SystemdService } from '../api/systemd.schema';

export type ScopeFilter = ServiceScope | 'all';
export type StateFilter = 'all' | 'active' | 'inactive' | 'failed' | 'unknown';

export function filterSystemdServices(
  services: SystemdService[],
  query: string,
  scope: ScopeFilter,
  state: StateFilter,
): SystemdService[] {
  const search = query.trim().toLowerCase();
  return services.filter(
    (service) =>
      (scope === 'all' || service.scope === scope) &&
      (state === 'all' ||
        (state === 'unknown' ? service.activeState === null : service.activeState === state)) &&
      (!search ||
        [service.unit, service.description, service.aliasOf].some((value) =>
          value?.toLowerCase().includes(search),
        )),
  );
}

export function systemdStateLabel(service: SystemdService, runtimeAvailable: boolean): string {
  if (service.activeState !== null) return service.activeState;
  if (!runtimeAvailable) return 'Unknown';
  if (service.template) return 'Template';
  return 'Not loaded';
}
