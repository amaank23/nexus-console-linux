import { z } from 'zod';

export const serviceScopeSchema = z.enum(['system', 'user']);
export type ServiceScope = z.infer<typeof serviceScopeSchema>;

/** Mirrors linux/systemd.rs. Null means unobserved or unavailable, never zero. */
export const systemdServiceSchema = z.object({
  scope: serviceScopeSchema,
  unit: z.string().min(1),
  description: z.string().nullable(),
  loadState: z.string().nullable(),
  activeState: z.string().nullable(),
  subState: z.string().nullable(),
  unitFileState: z.string().nullable(),
  mainPid: z.number().int().positive().nullable(),
  memoryBytes: z.number().nonnegative().nullable(),
  cpuTimeSeconds: z.number().nonnegative().nullable(),
  health: z.literal('unknown'),
  template: z.boolean(),
  aliasOf: z.string().nullable(),
});
export type SystemdService = z.infer<typeof systemdServiceSchema>;

export const systemdSnapshotSchema = z.object({
  scopes: z
    .array(
      z
        .object({
          scope: serviceScopeSchema,
          runtimeAvailable: z.boolean(),
          unitFilesAvailable: z.boolean(),
          services: z.array(systemdServiceSchema),
          warnings: z.array(z.string()),
        })
        .superRefine((value, ctx) => {
          if (value.services.some((service) => service.scope !== value.scope))
            ctx.addIssue({ code: 'custom', message: 'Service scope does not match its snapshot' });
        }),
    )
    .length(2)
    .superRefine((scopes, ctx) => {
      if (new Set(scopes.map((scope) => scope.scope)).size !== 2)
        ctx.addIssue({ code: 'custom', message: 'Expected one system and one user snapshot' });
    }),
});
export type SystemdSnapshot = z.infer<typeof systemdSnapshotSchema>;
