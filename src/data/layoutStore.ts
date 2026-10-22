import type { LayoutPreference, LayoutPreferenceStore } from './interfaces';
import { DEFAULT_LAYOUT, type RbmMovableRegion, type RbmRegion } from '../components/RbmLayoutPanel/RbmLayoutPanel';
import type { RbmRibbonView } from '../components/RbmEventRibbon/RbmEventRibbon';

export const DEFAULT_PREFERENCE: LayoutPreference = { order: [...DEFAULT_LAYOUT], collapsed: { ribbon: false, timeline: false, hotTopics: false }, ribbonView: 'all' };

/** A fresh copy of the default, safe to change. */
export const defaultPreference = (): LayoutPreference => ({ ...DEFAULT_PREFERENCE, order: [...DEFAULT_PREFERENCE.order], collapsed: { ...DEFAULT_PREFERENCE.collapsed } });

const REGIONS = new Set<RbmMovableRegion>(DEFAULT_LAYOUT);
const VIEWS = new Set<RbmRibbonView>(['all', 'criticalRunbooks', 'criticalPath']);

/**
 * A stored order is used only if it holds each movable region exactly once. An order saved while the
 * Hot-topics strip moved too still holds `hotTopics`; it is dropped and the rest kept. A preference
 * saved before 22 Oct 2026 has `ribbonCollapsed` instead of `collapsed`; it is carried over.
 */
export function sanitise(value: unknown): LayoutPreference {
  const v = value as (Partial<LayoutPreference> & { ribbonCollapsed?: unknown; ribbonCriticalOnly?: unknown; ribbonCriticalRunbooksOnly?: unknown }) | null;
  const c = (v?.collapsed ?? {}) as Partial<Record<RbmRegion, unknown>>;
  const stored = Array.isArray(v?.order) ? (v.order as unknown[]).filter((r) => r !== 'hotTopics') : [];
  const order = stored.length === REGIONS.size && new Set(stored).size === REGIONS.size && stored.every((r) => REGIONS.has(r as RbmMovableRegion)) ? (stored as RbmMovableRegion[]) : [...DEFAULT_LAYOUT];
  const collapsed = { ribbon: c.ribbon === true || (v?.collapsed === undefined && v?.ribbonCollapsed === true), timeline: c.timeline === true, hotTopics: c.hotTopics === true };
  // The two ribbon filters saved before the view existed map onto it.
  const ribbonView: RbmRibbonView =
    v?.ribbonView && VIEWS.has(v.ribbonView) ? v.ribbonView : v?.ribbonCriticalOnly === true ? 'criticalPath' : v?.ribbonCriticalRunbooksOnly === true ? 'criticalRunbooks' : 'all';
  return { order, collapsed, ribbonView };
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
