import type { LayoutPreference, LayoutPreferenceStore } from './interfaces';
import { DEFAULT_LAYOUT, type RbmRegion } from '../components/RbmLayoutPanel/RbmLayoutPanel';

export const DEFAULT_PREFERENCE: LayoutPreference = { order: [...DEFAULT_LAYOUT], collapsed: { ribbon: false, timeline: false, hotTopics: false }, ribbonCriticalOnly: false, ribbonCriticalRunbooksOnly: false };

/** A fresh copy of the default, safe to change. */
export const defaultPreference = (): LayoutPreference => ({ ...DEFAULT_PREFERENCE, order: [...DEFAULT_PREFERENCE.order], collapsed: { ...DEFAULT_PREFERENCE.collapsed } });

const REGIONS = new Set<RbmRegion>(DEFAULT_LAYOUT);

/**
 * A stored order is used only if it holds each of the three regions exactly once. A preference
 * saved before 22 Oct 2026 has `ribbonCollapsed` instead of `collapsed`; it is carried over.
 */
export function sanitise(value: unknown): LayoutPreference {
  const v = value as (Partial<LayoutPreference> & { ribbonCollapsed?: unknown }) | null;
  const c = (v?.collapsed ?? {}) as Partial<Record<RbmRegion, unknown>>;
  const order = Array.isArray(v?.order) && v.order.length === REGIONS.size && new Set(v.order).size === REGIONS.size && v.order.every((r) => REGIONS.has(r)) ? [...v.order] : [...DEFAULT_LAYOUT];
  const collapsed = { ribbon: c.ribbon === true || (v?.collapsed === undefined && v?.ribbonCollapsed === true), timeline: c.timeline === true, hotTopics: c.hotTopics === true };
  return { order, collapsed, ribbonCriticalOnly: v?.ribbonCriticalOnly === true, ribbonCriticalRunbooksOnly: v?.ribbonCriticalRunbooksOnly === true };
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
        return raw ? sanitise(JSON.parse(raw)) : defaultPreference();
      } catch {
        return defaultPreference();
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
      return defaultPreference();
    },
  };
}
