import type { ListPreference, ListPreferenceStore } from './interfaces';
import { PAGE_SIZES, type ColumnState, type PageSize } from './types';

export const defaultListPreference = <F extends string>(): ListPreference<F> => ({ panel: 'slideIn', columns: null, lastViewId: null, pageSize: 25 });

/**
 * A stored preference is used part by part: anything unknown or broken falls back to its default, and
 * columns no longer in the list are dropped.
 */
export function sanitiseListPreference<F extends string>(value: unknown, fields: readonly F[]): ListPreference<F> {
  const v = (value ?? {}) as Partial<Record<keyof ListPreference<F>, unknown>>;
  const known = new Set<string>(fields);
  const d = defaultListPreference<F>();
  let columns: ColumnState<F> | null = null;
  const c = v.columns as Partial<ColumnState<F>> | null | undefined;
  if (c && Array.isArray(c.visible)) {
    const visible = c.visible.filter((f): f is F => known.has(f));
    if (visible.length) {
      columns = { visible };
      if (c.widths && typeof c.widths === 'object') columns.widths = Object.fromEntries(Object.entries(c.widths).filter(([f, w]) => known.has(f) && typeof w === 'number' && w > 0)) as ColumnState<F>['widths'];
    }
  }
  return {
    panel: v.panel === 'wide' ? 'wide' : d.panel,
    columns,
    lastViewId: typeof v.lastViewId === 'string' ? v.lastViewId : d.lastViewId,
    pageSize: PAGE_SIZES.includes(v.pageSize as PageSize) ? (v.pageSize as PageSize) : d.pageSize,
  };
}

/**
 * The prototype's list preferences (panel width, columns, last view, page size), one key per list,
 * in localStorage. A ServiceNow user preference replaces it later. Missing or blocked storage falls
 * back to the defaults, as the layout store does.
 */
export function createLocalListPreferenceStore<F extends string>(
  key: string,
  fields: readonly F[],
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined = globalThis.localStorage,
): ListPreferenceStore<F> {
  return {
    async get() {
      try {
        const raw = storage?.getItem(key);
        return raw ? sanitiseListPreference(JSON.parse(raw), fields) : defaultListPreference();
      } catch {
        return defaultListPreference();
      }
    },
    async set(preference) {
      try {
        storage?.setItem(key, JSON.stringify(sanitiseListPreference(preference, fields)));
      } catch {
        // Storage is full or blocked: the preference still applies for this visit.
      }
    },
    async reset() {
      try {
        storage?.removeItem(key);
      } catch {
        // As above.
      }
      return defaultListPreference();
    },
  };
}
