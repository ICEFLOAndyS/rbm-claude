import type { LayoutPreference, LayoutPreferenceStore } from './interfaces';
import { DEFAULT_LAYOUT, type RbmRegion } from '../components/RbmLayoutPanel/RbmLayoutPanel';

export const DEFAULT_PREFERENCE: LayoutPreference = { order: [...DEFAULT_LAYOUT], ribbonCollapsed: false, ribbonCriticalOnly: false };

const REGIONS = new Set<RbmRegion>(DEFAULT_LAYOUT);

/** A stored order is used only if it holds each of the three regions exactly once. */
export function sanitise(value: unknown): LayoutPreference {
  const v = value as Partial<LayoutPreference> | null;
  const order = Array.isArray(v?.order) && v.order.length === REGIONS.size && new Set(v.order).size === REGIONS.size && v.order.every((r) => REGIONS.has(r)) ? [...v.order] : [...DEFAULT_LAYOUT];
  return { order, ribbonCollapsed: v?.ribbonCollapsed === true, ribbonCriticalOnly: v?.ribbonCriticalOnly === true };
}

/**
 * The prototype's layout store: the user's preference in localStorage, so it survives a reload.
 * A ServiceNow user preference replaces it later. Storage that is missing or blocked falls back to defaults.
 */
export function createLocalLayoutStore(key = 'rbm.commandCentre.layout.v1', storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined = globalThis.localStorage): LayoutPreferenceStore {
  return {
    async get() {
      try {
        const raw = storage?.getItem(key);
        return raw ? sanitise(JSON.parse(raw)) : { ...DEFAULT_PREFERENCE, order: [...DEFAULT_PREFERENCE.order] };
      } catch {
        return { ...DEFAULT_PREFERENCE, order: [...DEFAULT_PREFERENCE.order] };
      }
    },
    async set(preference) {
      try {
        storage?.setItem(key, JSON.stringify(sanitise(preference)));
      } catch {
        // Storage is full or blocked: the layout still applies for this visit.
      }
    },
    async reset() {
      try {
        storage?.removeItem(key);
      } catch {
        // As above.
      }
      return { ...DEFAULT_PREFERENCE, order: [...DEFAULT_PREFERENCE.order] };
    },
  };
}
