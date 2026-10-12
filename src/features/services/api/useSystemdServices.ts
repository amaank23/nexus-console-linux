import { useQuery } from '@tanstack/react-query';
import { CMD, ipc, useAppContext } from '@/shared/tauri';
import { useAppSelector } from '@/shared/state/hooks';
import { systemdSnapshotSchema } from './systemd.schema';

export function useSystemdServices() {
  const { data: context } = useAppContext();
  const active = useAppSelector((s) => s.ui.activeTab === 'services');
  const enabled = active && context?.supportedModules.includes('systemd') === true;
  return useQuery({
    queryKey: ['services', 'systemd'],
    queryFn: () => ipc(CMD.LIST_SYSTEMD_SERVICES, undefined, systemdSnapshotSchema),
    enabled,
    // Enumerating installed units is heavier than a per-service state lookup.
    // Poll only this visible page, with a minimum ten-second interval.
    refetchInterval: enabled ? 10_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}
