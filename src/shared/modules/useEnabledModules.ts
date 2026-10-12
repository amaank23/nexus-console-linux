import { useAppSelector } from '@/shared/state/hooks';
import {
  ALL_MODULES,
  effectiveModules,
  isModuleAvailable,
  visibleNav,
  visibleTabs,
} from './selectors';
import { type ModuleId, type NavEntry } from './modules.config';
import { useClaudeInstalled } from './useClaudeInstalled';
import type { Tab } from '@/shared/state/uiSlice';
import { useAppContext } from '@/shared/tauri';

export function useModuleDependencies() {
  const { data } = useAppContext();
  const claudeInstalled = useClaudeInstalled();
  return {
    claudeInstalled,
    supportedModules: data?.supportedModules ?? [],
    platform: data?.platform,
  };
}

/** The user's choice, before machine availability. `null` (never chosen) reads as
 * everything on, so the app is fully usable while the first-run picker decides. */
export function useEnabledModules(): ModuleId[] {
  const selected = useAppSelector((s) => s.settings.enabledModules) ?? ALL_MODULES;
  const deps = useModuleDependencies();
  return effectiveModules(selected, deps);
}

export function useModuleEnabled(id: ModuleId): boolean {
  return useEnabledModules().includes(id);
}

export function useModuleAvailable(id: ModuleId): boolean {
  return isModuleAvailable(id, useModuleDependencies());
}

function useEffectiveModules(): ModuleId[] {
  return useEnabledModules();
}

export function useVisibleNav(): NavEntry[] {
  return visibleNav(useEffectiveModules());
}

export function useVisibleTabs(): Tab[] {
  return visibleTabs(useEffectiveModules());
}
