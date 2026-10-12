import { expect, test } from 'vitest';
import { systemdServiceSchema, systemdSnapshotSchema, type SystemdService } from './systemd.schema';

export const serviceFixture: SystemdService = {
  scope: 'system',
  unit: 'worker.service',
  description: 'Queue worker',
  loadState: 'loaded',
  activeState: 'active',
  subState: 'running',
  unitFileState: 'enabled',
  mainPid: 42,
  memoryBytes: 4096,
  cpuTimeSeconds: 1.5,
  health: 'unknown',
  template: false,
  aliasOf: null,
};

test('unknown counters and unloaded unit states are accepted without invented defaults', () => {
  const service = systemdServiceSchema.parse({
    ...serviceFixture,
    loadState: null,
    activeState: null,
    subState: null,
    mainPid: null,
    memoryBytes: null,
    cpuTimeSeconds: null,
  });
  expect(service.activeState).toBeNull();
  expect(service.memoryBytes).toBeNull();
});

test('invalid metrics, scopes, and unprobed healthy states are rejected', () => {
  for (const fields of [
    { scope: 'root' },
    { mainPid: 0 },
    { mainPid: 1.5 },
    { memoryBytes: -1 },
    { cpuTimeSeconds: -1 },
    { health: 'healthy' },
  ])
    expect(systemdServiceSchema.safeParse({ ...serviceFixture, ...fields }).success).toBe(false);
});

test('partial discovery retains explicit scope diagnostics', () => {
  const result = systemdSnapshotSchema.parse({
    scopes: [
      {
        scope: 'system',
        runtimeAvailable: true,
        unitFilesAvailable: true,
        services: [serviceFixture],
        warnings: [],
      },
      {
        scope: 'user',
        runtimeAvailable: false,
        unitFilesAvailable: false,
        services: [],
        warnings: ['Cannot connect to user bus'],
      },
    ],
  });
  expect(result.scopes[1].runtimeAvailable).toBe(false);
  expect(result.scopes[1].warnings).toEqual(['Cannot connect to user bus']);
});

test('duplicate scopes or a service in the wrong scope fail at the IPC boundary', () => {
  const scope = {
    scope: 'system',
    runtimeAvailable: true,
    unitFilesAvailable: true,
    services: [serviceFixture],
    warnings: [],
  };
  expect(systemdSnapshotSchema.safeParse({ scopes: [scope, scope] }).success).toBe(false);
  expect(
    systemdSnapshotSchema.safeParse({ scopes: [scope, { ...scope, scope: 'user' }] }).success,
  ).toBe(false);
});
