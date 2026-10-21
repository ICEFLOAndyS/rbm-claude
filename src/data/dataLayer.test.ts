import { createLocalLayoutStore, sanitise } from './layoutStore';
import { createFixtureSource } from './fixtureSource';
import { createSimClock } from '../engine/clock';
import { weekendPayrollCutover } from '../fixtures/build';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe('layout order (LayoutPreferenceStore)', () => {
  it('starts with the default order: Event ribbon, Task Timeline, Hot-topics strip; ribbon open', async () => {
    expect(await createLocalLayoutStore('k', memoryStorage()).get()).toEqual({ order: ['ribbon', 'timeline', 'hotTopics'], ribbonCollapsed: false });
  });

  it('keeps a changed order and survives a reload (a new store on the same storage)', async () => {
    const storage = memoryStorage();
    await createLocalLayoutStore('k', storage).set({ order: ['timeline', 'hotTopics', 'ribbon'], ribbonCollapsed: true });
    expect(await createLocalLayoutStore('k', storage).get()).toEqual({ order: ['timeline', 'hotTopics', 'ribbon'], ribbonCollapsed: true });
  });

  it('puts the default back on reset', async () => {
    const storage = memoryStorage();
    const store = createLocalLayoutStore('k', storage);
    await store.set({ order: ['hotTopics', 'timeline', 'ribbon'], ribbonCollapsed: true });
    expect(await store.reset()).toEqual({ order: ['ribbon', 'timeline', 'hotTopics'], ribbonCollapsed: false });
    expect(await store.get()).toEqual({ order: ['ribbon', 'timeline', 'hotTopics'], ribbonCollapsed: false });
  });

  it('ignores a stored order that is broken, and storage that throws', async () => {
    expect(sanitise({ order: ['timeline', 'timeline', 'ribbon'] }).order).toEqual(['ribbon', 'timeline', 'hotTopics']);
    expect(sanitise({ order: ['timeline', 'ribbon'] }).order).toEqual(['ribbon', 'timeline', 'hotTopics']);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    const store = createLocalLayoutStore('k', broken);
    await expect(store.set({ order: ['timeline', 'ribbon', 'hotTopics'], ribbonCollapsed: false })).resolves.toBeUndefined();
    expect((await store.get()).order).toEqual(['ribbon', 'timeline', 'hotTopics']);
  });
});

describe('the simulated clock and the fixture source', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs at the chosen speed, and stops at 0', () => {
    const clock = createSimClock(new Date('2026-05-25T03:40:00Z'), { speed: 60 });
    vi.advanceTimersByTime(3000);
    expect(clock.now().toISOString()).toBe('2026-05-25T03:43:00.000Z');
    clock.setSpeed(0);
    vi.advanceTimersByTime(5000);
    expect(clock.now().toISOString()).toBe('2026-05-25T03:43:00.000Z');
    clock.dispose();
  });

  it('recomputes the snapshot as the clock moves, and tells subscribers', () => {
    const f = weekendPayrollCutover();
    const clock = createSimClock(new Date(f.startsAt), { speed: 600 });
    const source = createFixtureSource(f, clock);
    const seen: string[] = [];
    source.subscribe((s) => seen.push(s.now));
    vi.advanceTimersByTime(2000);
    expect(seen).toEqual(['2026-05-25T03:50:00Z', '2026-05-25T04:00:00Z']);
    expect(source.getSnapshot().now).toBe('2026-05-25T04:00:00Z');
    source.dispose();
    clock.dispose();
  });

  it('applies commands through the fake engine and publishes the new snapshot', async () => {
    const f = weekendPayrollCutover();
    const clock = createSimClock(new Date(f.startsAt), { speed: 0 });
    const source = createFixtureSource(f, clock);
    const ready = source.getSnapshot().tasks.find((t) => t.flags.ready)!;
    const result = await source.dispatch({ type: 'start', taskIds: [ready.id] });
    expect(result).toEqual({ ok: true, applied: [ready.id], conflicts: [] });
    expect(source.getSnapshot().tasks.find((t) => t.id === ready.id)!.state).toBe('active');
    expect(source.getSnapshot().log.at(-1)).toMatchObject({ action: 'start', byId: 'p-as' });
    clock.dispose();
  });
});
