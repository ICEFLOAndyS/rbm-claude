import { useCallback, useSyncExternalStore } from 'react';
import type { RbmNavCounts, RbmNavPermission } from './nav';

/** What the menu needs from the platform: the user's permissions and the live counts. */
export interface NavSnapshot {
  /** The permissions the platform grants the signed-in user. Empty until it has answered. */
  permissions: readonly RbmNavPermission[];
  /** Live counts by item id. No item has a count yet (App shell board). */
  counts: RbmNavCounts;
}

/**
 * Where the menu reads its permissions and counts. The shell never knows whether they came from the mock
 * or from ServiceNow; the platform's API decides permissions, never the UI.
 */
export interface NavData {
  /** The current state. Cheap to call; returns the same object until something changes. */
  getSnapshot(): NavSnapshot;
  /** Called with each new snapshot. Returns an unsubscribe function. */
  subscribe(listener: (snapshot: NavSnapshot) => void): () => void;
}

/** Until the platform answers, the user has no permissions, so Admin stays hidden rather than flashing up. */
export const EMPTY_NAV: NavSnapshot = { permissions: [], counts: {} };

const noData: NavData = { getSnapshot: () => EMPTY_NAV, subscribe: () => () => {} };

function useNavSnapshot(data: NavData | undefined): NavSnapshot {
  const source = data ?? noData;
  const subscribe = useCallback((onChange: () => void) => source.subscribe(onChange), [source]);
  return useSyncExternalStore(subscribe, source.getSnapshot, source.getSnapshot);
}

/** Whether the platform grants the user a permission. Without data, nothing is granted. */
export function useNavPermissions(data: NavData | undefined): (permission: RbmNavPermission) => boolean {
  const { permissions } = useNavSnapshot(data);
  return useCallback((permission: RbmNavPermission) => permissions.includes(permission), [permissions]);
}

/** The live counts by item id. Without data, there are none. */
export function useNavCounts(data: NavData | undefined): RbmNavCounts {
  return useNavSnapshot(data).counts;
}

export interface MockNavData extends NavData {
  setPermissions(permissions: readonly RbmNavPermission[]): void;
  setCounts(counts: RbmNavCounts): void;
}

/**
 * Stands in for the platform in Storybook, tests and the prototype: a stub user granted both admin groups,
 * and no counts (the brief: build the count pill and the rail dot, and wire them to nothing).
 */
export function createMockNavData({ permissions = ['rbmAdmin', 'techAdmin'], counts = {} }: Partial<NavSnapshot> = {}): MockNavData {
  let snapshot: NavSnapshot = { permissions, counts };
  const listeners = new Set<(s: NavSnapshot) => void>();
  const update = (next: Partial<NavSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((l) => l(snapshot));
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPermissions: (p) => update({ permissions: p }),
    setCounts: (c) => update({ counts: c }),
  };
}
