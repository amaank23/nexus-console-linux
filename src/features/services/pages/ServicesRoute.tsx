import { lazy } from 'react';
import { useAppContext } from '@/shared/tauri';

const MacServicesPage = lazy(() =>
  import('./ServicesPage').then((m) => ({ default: m.ServicesPage })),
);
const LinuxServicesPage = lazy(() =>
  import('./SystemdServicesPage').then((m) => ({ default: m.SystemdServicesPage })),
);

/** Choose before mounting hooks: Linux never queries the Homebrew backend. */
export const ServicesRoute = () => {
  const { data } = useAppContext();
  return data?.platform === 'linux' ? <LinuxServicesPage /> : <MacServicesPage />;
};
