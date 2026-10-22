import { createLocalListPreferenceStore, defaultListPreference } from './preferenceStore';
import { EVENT_COLUMNS } from './events';

const FIELDS = EVENT_COLUMNS.map((c) => c.field);

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data };
}

describe('list preference store (localStorage in the prototype)', () => {
  it('starts with the slide-in, the view’s columns, no last view and 25 rows', async () => {
    const store = createLocalListPreferenceStore('k', FIELDS, memoryStorage());
    expect(await store.get()).toEqual({ panel: 'slideIn', columns: null, lastViewId: null, pageSize: 25 });
  });

  it('keeps width, columns, last view and page size across a reload, and resets', async () => {
    const storage = memoryStorage();
    const pref = { panel: 'wide' as const, columns: { visible: ['name' as const, 'status' as const], widths: { name: 320 } }, lastViewId: 'mine', pageSize: 50 as const };
    await createLocalListPreferenceStore('k', FIELDS, storage).set(pref);
    expect(await createLocalListPreferenceStore('k', FIELDS, storage).get()).toEqual(pref);
    expect(await createLocalListPreferenceStore('k', FIELDS, storage).reset()).toEqual(defaultListPreference());
    expect(storage.data.size).toBe(0);
  });

  it('drops anything broken or unknown, part by part', async () => {
    const storage = memoryStorage();
    storage.setItem('k', JSON.stringify({ panel: 'huge', columns: { visible: ['name', 'colour'], widths: { name: -1, status: 200 } }, lastViewId: 3, pageSize: 30 }));
    expect(await createLocalListPreferenceStore('k', FIELDS, storage).get()).toEqual({ panel: 'slideIn', columns: { visible: ['name'], widths: { status: 200 } }, lastViewId: null, pageSize: 25 });
    storage.setItem('k', '{not json');
    expect(await createLocalListPreferenceStore('k', FIELDS, storage).get()).toEqual(defaultListPreference());
  });

  it('falls back to the defaults when storage is blocked', async () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    const store = createLocalListPreferenceStore('k', FIELDS, blocked);
    await expect(store.set(defaultListPreference())).resolves.toBeUndefined();
    expect(await store.get()).toEqual(defaultListPreference());
  });
});
