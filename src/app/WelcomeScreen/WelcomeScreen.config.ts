import type { ModuleId } from '@/shared/modules';

/** One-click starting points. Unavailable ones are filtered out at render. */
export const PRESETS: { label: string; modules: ModuleId[] }[] = [
  { label: 'Everything', modules: ['homebrew', 'systemd', 'ports', 'doctor', 'claude'] },
  { label: 'Services only', modules: ['systemd'] },
  { label: 'Homebrew only', modules: ['homebrew'] },
  { label: 'Ports only', modules: ['ports'] },
  { label: 'Claude Chats only', modules: ['claude'] },
];
