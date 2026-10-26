/**
 * Scenarios (app shell brief, section 4b; App shell board, "Scenario"). The model is Andy Smith's (24 Oct 2026);
 * the screens are a proposal that is not approved yet.
 *
 *   shipped default    every scenario available, Planned Change the only one on
 *   customer default   an RBM Admin locks or unlocks each scenario and sets which are on by default
 *   the user's choice  Profile › My scenarios, from the available ones; undefined until they choose
 *
 * The shell's filter starts from the user's scenarios and never changes them. Plain data, no React.
 */

export type RbmScenario = 'planned-change' | 'disaster-recovery' | 'cyber-recovery' | 'service-recovery';

/** The four, in the board's order. Names as written by Andy Smith. */
export const SCENARIOS = ['planned-change', 'disaster-recovery', 'cyber-recovery', 'service-recovery'] as const satisfies readonly RbmScenario[];

export const SCENARIO_LABELS: Record<RbmScenario, string> = {
  'planned-change': 'Planned Change',
  'disaster-recovery': 'Disaster Recovery',
  'cyber-recovery': 'Cyber Recovery',
  'service-recovery': 'Service Recovery',
};

export interface RbmScenarioSettings {
  /** Unlocked by an RBM Admin. At least one. */
  available: RbmScenario[];
  /** The customer default: a subset of `available`, at least one. */
  defaults: RbmScenario[];
}

export const SHIPPED_SCENARIO_SETTINGS: RbmScenarioSettings = { available: [...SCENARIOS], defaults: ['planned-change'] };

/** Keeps the four's order, so lists compare and read the same everywhere. */
export const inOrder = (list: readonly RbmScenario[]) => SCENARIOS.filter((s) => list.includes(s));

/**
 * What the admin page refuses to save (the board's limits, proposed): at least one available, at least one on by
 * default, and nothing on by default that is locked. Empty means the settings are fine.
 */
export function scenarioSettingsErrors(s: RbmScenarioSettings): string[] {
  const errors: string[] = [];
  if (s.available.length === 0) errors.push('At least one scenario must be available.');
  if (s.defaults.length === 0) errors.push('At least one scenario must be on by default.');
  if (s.defaults.some((d) => !s.available.includes(d))) errors.push('A scenario that is on by default must be available.');
  return errors;
}

/**
 * The user's scenarios: their own choice, less any an admin has since locked (proposed: a locked scenario leaves
 * their profile). With no choice, or nothing left of it, the organisation's default.
 */
export function profileScenarios(settings: RbmScenarioSettings, own: readonly RbmScenario[] | undefined): RbmScenario[] {
  const kept = inOrder((own ?? []).filter((s) => settings.available.includes(s)));
  return kept.length ? kept : inOrder(settings.defaults);
}

/** The control's text: the name for one, "2 scenarios" for several, "All available" for all. */
export function scenarioSummary(shown: readonly RbmScenario[], available: readonly RbmScenario[]): string {
  if (shown.length === 1) return SCENARIO_LABELS[shown[0]!];
  if (available.length > 1 && available.every((s) => shown.includes(s))) return 'All available';
  return `${shown.length} scenarios`;
}

/**
 * Where the settings and the user's choice are kept. Async, so ServiceNow (a system property and a user
 * preference) can replace localStorage without changes.
 */
export interface ScenarioStore {
  getSettings(): Promise<RbmScenarioSettings>;
  setSettings(settings: RbmScenarioSettings): Promise<void>;
  /** Undefined until the user chooses: they use the organisation's default. */
  getOwn(): Promise<RbmScenario[] | undefined>;
  /** Undefined resets to the organisation's default. */
  setOwn(own: RbmScenario[] | undefined): Promise<void>;
}

const isScenario = (x: unknown): x is RbmScenario => SCENARIOS.includes(x as RbmScenario);
const list = (x: unknown) => (Array.isArray(x) ? inOrder(x.filter(isScenario)) : undefined);

/**
 * The prototype's store: localStorage, the user's choice keyed by user. Storage that is missing, blocked or holds
 * something unreadable means the shipped default and no choice.
 */
export function createLocalScenarioStore(userId: string, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined = globalThis.localStorage): ScenarioStore {
  const settingsKey = 'rbm.scenarios.settings.v1';
  const ownKey = `rbm.scenarios.own.v1.${userId}`;
  const read = (key: string): unknown => {
    try {
      const raw = storage?.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  };
  const write = (key: string, value: unknown) => {
    try {
      if (value === undefined) storage?.removeItem(key);
      else storage?.setItem(key, JSON.stringify(value));
    } catch {
      // Blocked storage: the change lasts until the page is reloaded.
    }
  };
  return {
    async getSettings() {
      const raw = read(settingsKey) as Partial<Record<keyof RbmScenarioSettings, unknown>> | undefined;
      const s = { available: list(raw?.available) ?? [], defaults: list(raw?.defaults) ?? [] };
      return scenarioSettingsErrors(s).length ? structuredClone(SHIPPED_SCENARIO_SETTINGS) : s;
    },
    setSettings: async (s) => write(settingsKey, s),
    getOwn: async () => list(read(ownKey)),
    setOwn: async (own) => write(ownKey, own),
  };
}

/** A store held in memory, for Storybook and tests. */
export function createMemoryScenarioStore(settings: RbmScenarioSettings = SHIPPED_SCENARIO_SETTINGS, own?: RbmScenario[]): ScenarioStore {
  let s = structuredClone(settings);
  let o = own && [...own];
  return {
    getSettings: async () => structuredClone(s),
    setSettings: async (next) => {
      s = structuredClone(next);
    },
    getOwn: async () => o && [...o],
    setOwn: async (next) => {
      o = next && [...next];
    },
  };
}
