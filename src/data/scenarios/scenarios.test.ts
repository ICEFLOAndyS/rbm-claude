import { describe, expect, it } from 'vitest';
import {
  SHIPPED_SCENARIO_SETTINGS,
  createLocalScenarioStore,
  createMemoryScenarioStore,
  profileScenarios,
  scenarioSettingsErrors,
  scenarioSummary,
} from './scenarios';

describe('scenario settings', () => {
  it('ships with all four available and Planned Change the only one on', () => {
    expect(SHIPPED_SCENARIO_SETTINGS).toEqual({ available: ['planned-change', 'disaster-recovery', 'cyber-recovery', 'service-recovery'], defaults: ['planned-change'] });
    expect(scenarioSettingsErrors(SHIPPED_SCENARIO_SETTINGS)).toEqual([]);
  });

  it('refuses none available, none on by default, and a locked scenario on by default', () => {
    expect(scenarioSettingsErrors({ available: [], defaults: [] })).toEqual(['At least one scenario must be available.', 'At least one scenario must be on by default.']);
    expect(scenarioSettingsErrors({ available: ['planned-change'], defaults: [] })).toEqual(['At least one scenario must be on by default.']);
    expect(scenarioSettingsErrors({ available: ['planned-change'], defaults: ['cyber-recovery'] })).toEqual(['A scenario that is on by default must be available.']);
  });
});

describe('profileScenarios: the cascade', () => {
  const settings = { available: ['planned-change', 'disaster-recovery'] as const, defaults: ['planned-change'] as const };
  const s = { available: [...settings.available], defaults: [...settings.defaults] };

  it("uses the organisation's default until the user chooses", () => {
    expect(profileScenarios(s, undefined)).toEqual(['planned-change']);
  });

  it("uses the user's own choice, in the four's order", () => {
    expect(profileScenarios(s, ['disaster-recovery', 'planned-change'])).toEqual(['planned-change', 'disaster-recovery']);
  });

  it('drops a scenario an admin has locked, and falls back to the default when nothing is left', () => {
    expect(profileScenarios(s, ['disaster-recovery', 'cyber-recovery'])).toEqual(['disaster-recovery']);
    expect(profileScenarios(s, ['cyber-recovery'])).toEqual(['planned-change']);
  });
});

describe('scenarioSummary: the control says it in words', () => {
  const all = ['planned-change', 'disaster-recovery'] as const;
  it('names one, counts several, and says when all are shown', () => {
    expect(scenarioSummary(['disaster-recovery'], [...all])).toBe('Disaster Recovery');
    expect(scenarioSummary([...all], [...all])).toBe('All available');
    expect(scenarioSummary(['planned-change', 'disaster-recovery'], ['planned-change', 'disaster-recovery', 'cyber-recovery'])).toBe('2 scenarios');
  });
});

describe('scenario stores', () => {
  it('keeps settings and the user choice in localStorage, keyed by user', async () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
    const store = createLocalScenarioStore('a.smith', storage);
    expect(await store.getSettings()).toEqual(SHIPPED_SCENARIO_SETTINGS);
    expect(await store.getOwn()).toBeUndefined();
    await store.setSettings({ available: ['planned-change', 'cyber-recovery'], defaults: ['cyber-recovery'] });
    await store.setOwn(['planned-change']);
    expect(await createLocalScenarioStore('a.smith', storage).getSettings()).toEqual({ available: ['planned-change', 'cyber-recovery'], defaults: ['cyber-recovery'] });
    expect(await createLocalScenarioStore('a.smith', storage).getOwn()).toEqual(['planned-change']);
    expect(await createLocalScenarioStore('m.okafor', storage).getOwn()).toBeUndefined();
    await store.setOwn(undefined);
    expect(await store.getOwn()).toBeUndefined();
  });

  it('falls back to the shipped default when storage is blocked or holds rubbish', async () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    const store = createLocalScenarioStore('a.smith', blocked);
    await store.setOwn(['planned-change']);
    expect(await store.getSettings()).toEqual(SHIPPED_SCENARIO_SETTINGS);
    const rubbish = { getItem: () => '{"available":["x"],"defaults":[]}', setItem: () => {}, removeItem: () => {} };
    expect(await createLocalScenarioStore('a.smith', rubbish).getSettings()).toEqual(SHIPPED_SCENARIO_SETTINGS);
  });

  it('a memory store returns copies', async () => {
    const store = createMemoryScenarioStore();
    const s = await store.getSettings();
    s.available.pop();
    expect((await store.getSettings()).available).toHaveLength(4);
  });
});
