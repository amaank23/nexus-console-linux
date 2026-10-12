import { expect, test } from 'vitest';
import type { SystemdService } from '../api/systemd.schema';
import { filterSystemdServices, systemdStateLabel } from './systemdSelectors';

const service: SystemdService = {
  scope: 'system',
  unit: 'worker.service',
  description: 'Queue worker',
  loadState: 'loaded',
  activeState: 'active',
  subState: 'exited',
  unitFileState: 'enabled',
  mainPid: null,
  memoryBytes: null,
  cpuTimeSeconds: null,
  health: 'unknown',
  template: false,
  aliasOf: null,
};

test('scope filtering distinguishes identical user and system unit names', () => {
  const user: SystemdService = { ...service, scope: 'user' };
  expect(filterSystemdServices([service, user], '', 'user', 'all')).toEqual([user]);
  expect(filterSystemdServices([service, user], ' QUEUE ', 'system', 'active')).toEqual([service]);
});

test('inactive filtering never includes unobserved services', () => {
  const inactive = { ...service, activeState: 'inactive', subState: 'dead' };
  const unknown = { ...service, activeState: null, subState: null };
  expect(filterSystemdServices([inactive, unknown], '', 'all', 'inactive')).toEqual([inactive]);
  expect(filterSystemdServices([inactive, unknown], '', 'all', 'unknown')).toEqual([unknown]);
});

test('state labels preserve active exited semantics and distinguish a missing bus', () => {
  expect(systemdStateLabel(service, true)).toBe('active');
  const unloaded = { ...service, activeState: null };
  expect(systemdStateLabel(unloaded, true)).toBe('Not loaded');
  expect(systemdStateLabel(unloaded, false)).toBe('Unknown');
  expect(systemdStateLabel({ ...unloaded, template: true }, true)).toBe('Template');
});
