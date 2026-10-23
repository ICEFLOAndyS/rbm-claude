/**
 * The user's sidebar choice (App shell board: "Collapse is remembered per user"). Undefined until the user
 * presses Collapse or Expand; until then the width decides.
 */
export interface SidebarPreferenceStore {
  get(): Promise<boolean | undefined>;
  set(collapsed: boolean): Promise<void>;
}

/**
 * The prototype's store: the choice in localStorage, keyed by user, so it survives a reload. A ServiceNow
 * user preference replaces it later. Storage that is missing or blocked means no choice.
 */
export function createLocalSidebarStore(
  userId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage,
): SidebarPreferenceStore {
  const key = `rbm.shell.sidebarCollapsed.v1.${userId}`;
  return {
    async get() {
      try {
        const raw = storage?.getItem(key);
        return raw === 'true' ? true : raw === 'false' ? false : undefined;
      } catch {
        return undefined;
      }
    },
    async set(collapsed) {
      try {
        storage?.setItem(key, String(collapsed));
      } catch {
        // Blocked storage: the choice lasts until the page is reloaded.
      }
    },
  };
}

/** A store held in memory, for Storybook and tests. */
export function createMemorySidebarStore(initial?: boolean): SidebarPreferenceStore & { value(): boolean | undefined } {
  let value = initial;
  return {
    get: async () => value,
    set: async (collapsed) => {
      value = collapsed;
    },
    value: () => value,
  };
}
