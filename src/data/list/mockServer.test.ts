import { createMockEventServer } from './mockServer';
import { EMPTY_EVENT_FILTERS, ListDataError, type EventQuery } from './types';
import { DEFAULT_EVENT_COLUMNS } from './events';
import { events128, eventsBoard, eventsEmpty, eventsLarge } from '../../fixtures/events/build';

const NOW = () => new Date('2026-10-25T02:30:00Z');
const q = (over: Partial<Omit<EventQuery, 'filters'>> & { filters?: Partial<EventQuery['filters']> } = {}): EventQuery => ({
  page: 0,
  pageSize: 25,
  sort: [],
  ...over,
  filters: { ...EMPTY_EVENT_FILTERS, ...over.filters },
});
const server = (fixture = events128(), options = {}) => createMockEventServer(fixture, { now: NOW, ...options });

describe('mock Events server: query', () => {
  it('pages on the server: "1 to 25 of 128", and clamps a page past the end', async () => {
    const s = server();
    const first = await s.query(q());
    expect(first).toMatchObject({ total: 128, page: 0, pageSize: 25 });
    expect(first.rows).toHaveLength(25);
    const last = await s.query(q({ page: 5 }));
    expect(last.rows).toHaveLength(3);
    expect(await s.query(q({ page: 99 }))).toMatchObject({ page: 5, total: 128 });
  });

  it('searches name, number and owner: every word, any order, ignoring case', async () => {
    const s = server(eventsBoard());
    expect((await s.query(q({ filters: { search: 'cutover data' } }))).rows.map((r) => r.name)).toEqual(['Q4 Data Centre Cutover']);
    expect((await s.query(q({ filters: { search: 'rev000003' } }))).rows.map((r) => r.name)).toEqual(['Core Network Refresh']);
    expect((await s.query(q({ filters: { search: 'okafor' } }))).rows.map((r) => r.name)).toEqual(['Payments DB Failover']);
  });

  it('filters by status, owner and environment, which combine', async () => {
    const s = server();
    const all = (await s.query(q({ pageSize: 100, page: 0 }))).total;
    const prod = await s.query(q({ filters: { environment: ['production'] }, pageSize: 100 }));
    expect(prod.total).toBeLessThan(all);
    expect(prod.rows.every((r) => r.environment === 'production')).toBe(true);
    const narrowed = await s.query(q({ filters: { environment: ['production'], status: ['blocked'], owner: ['p-lc'] }, pageSize: 100 }));
    expect(narrowed.total).toBeGreaterThan(0);
    expect(narrowed.total).toBeLessThan(prod.total);
    expect(narrowed.rows.every((r) => r.status === 'blocked' && r.owner.id === 'p-lc' && r.environment === 'production')).toBe(true);
  });

  it('keeps the board’s order with no sort, and sorts on the server when asked', async () => {
    const s = server(eventsBoard());
    expect((await s.query(q())).rows.map((r) => r.number)).toEqual(['REV000001', 'REV000002', 'REV000003', 'REV000004', 'REV000005', 'REV000006', 'REV000007', 'REV000008']);
    expect((await s.query(q({ sort: [{ field: 'windowStart', direction: 'asc' }] }))).rows.map((r) => r.number)).toEqual(['REV000004', 'REV000001', 'REV000002', 'REV000003', 'REV000006', 'REV000007', 'REV000005', 'REV000008']);
    expect((await s.query(q({ sort: [{ field: 'number', direction: 'desc' }] }))).rows[0]!.number).toBe('REV000008');
    expect((await s.query(q({ sort: [{ field: 'owner', direction: 'asc' }] }))).rows[0]!.owner.name).toBe('Andy Smith');
  });

  it('returns an empty page for the empty list', async () => {
    expect(await server(eventsEmpty()).query(q())).toEqual({ rows: [], total: 0, page: 0, pageSize: 25 });
  });

  it('queries the 15,000-row list quickly', async () => {
    const s = server(eventsLarge());
    const t = performance.now();
    const page = await s.query(q({ filters: { search: 'payroll', status: ['active'] }, sort: [{ field: 'name', direction: 'desc' }], page: 3 }));
    expect(performance.now() - t).toBeLessThan(500);
    expect(page.total).toBeGreaterThan(0);
    expect((await s.query(q())).total).toBe(15_000);
  });
});

describe('mock Events server: latency, cancel and failures', () => {
  it('waits for the latency set', async () => {
    vi.useFakeTimers();
    const s = server(eventsBoard(), { latencyMs: 1500 });
    let done = false;
    void s.query(q()).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(1400);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toBe(true);
    vi.useRealTimers();
  });

  it('stops waiting at once when the request is aborted', async () => {
    const s = server(eventsBoard(), { latencyMs: 10_000 });
    const controller = new AbortController();
    const pending = s.query(q(), { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow();
  });

  it('fails with a message and a support reference; no access says who to ask', async () => {
    const s = server(eventsBoard(), { fail: { query: 'failed' } });
    const error = await s.query(q()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ListDataError);
    expect(error).toMatchObject({ kind: 'failed', message: 'Could not load events.', reference: 'REF-20261025-0001' });

    const denied = server(eventsBoard(), { fail: { query: 'noAccess' } });
    await expect(denied.query(q())).rejects.toMatchObject({ kind: 'noAccess', contact: 'Ask your RBM administrator for the Event reader role.' });
  });

  it('can fail just the next call, for Retry', async () => {
    const s = server(eventsBoard());
    s.failNext('query', 'failed');
    await expect(s.query(q())).rejects.toMatchObject({ kind: 'failed' });
    expect((await s.query(q())).total).toBe(8);
  });
});

describe('mock Events server: records and saving', () => {
  it('reads a record from the file, or builds it from its row', async () => {
    const s = server();
    expect((await s.readRecord('ev-00001')).name).toBe('Q4 Data Centre Cutover');
    const built = await s.readRecord('ev-00100');
    expect(built.id).toBe('ev-00100');
    expect(await s.readRecord('ev-00100')).toEqual(built);
    await expect(s.readRecord('nope')).rejects.toMatchObject({ kind: 'notFound' });
  });

  it('saves a section: bumps the version, writes History and updates the row', async () => {
    const s = server(eventsBoard());
    const before = await s.readRecord('ev-00005');
    const result = await s.saveSection('ev-00005', 'details', { name: 'Warehouse Cutover', environment: 'test' }, before.version);
    expect(result.kind).toBe('saved');
    if (result.kind !== 'saved') return;
    expect(result.record.version).toBe(before.version + 1);
    expect(result.record.history[0]).toMatchObject({
      at: '2026-10-25T02:30:00Z',
      by: { name: 'Andy Smith' },
      sectionId: 'details',
      changes: [
        { field: 'name', label: 'Name', from: 'Warehouse Mgmt Cutover', to: 'Warehouse Cutover' },
        { field: 'environment', label: 'Environment', from: 'Production', to: 'Test' },
      ],
    });
    expect((await s.query(q({ filters: { search: 'warehouse' } }))).rows[0]).toMatchObject({ name: 'Warehouse Cutover', environment: 'test' });
  });

  it('refuses invalid values, saying what is wrong, and writes nothing', async () => {
    const s = server(eventsBoard());
    const r = await s.readRecord('ev-00005');
    expect(await s.saveSection('ev-00005', 'schedule', { windowEnd: r.windowStart }, r.version)).toEqual({
      kind: 'invalid',
      errors: {
        windowEnd: 'End must be after the start, or the event has no time to run.',
        rollbackBy: 'Rollback by must fall inside the window, so there is time to roll back.',
      },
    });
    expect(await s.saveSection('ev-00005', 'details', { windowEnd: r.windowStart }, r.version)).toMatchObject({ kind: 'invalid', errors: { windowEnd: 'This field cannot be changed in this section.' } });
    expect((await s.readRecord('ev-00005')).version).toBe(r.version);
  });

  it('reports a conflict when someone else saved first, with what changed', async () => {
    const s = server(eventsBoard());
    const mine = await s.readRecord('ev-00005');
    s.externalEdit('ev-00005', { description: 'Updated by Jo' }, { id: 'p-jn', name: 'Jo Novak' });
    const result = await s.saveSection('ev-00005', 'details', { name: 'Mine' }, mine.version);
    expect(result).toMatchObject({ kind: 'conflict', by: { name: 'Jo Novak' }, changes: [{ label: 'Description', to: 'Updated by Jo' }] });
    expect((await s.readRecord('ev-00005')).name).toBe('Warehouse Mgmt Cutover');
  });

  it('refuses a locked section with its reason', async () => {
    const s = server(eventsBoard());
    const r = await s.readRecord('ev-00001');
    await expect(s.saveSection('ev-00001', 'schedule', { freezeAt: null }, r.version)).rejects.toMatchObject({
      kind: 'noAccess',
      message: 'The window cannot change while the event is running. Ask the Event Manager.',
    });
  });

  it('keeps each server separate from its fixture', async () => {
    const fixture = eventsBoard();
    const s = server(fixture);
    const r = await s.readRecord('ev-00005');
    await s.saveSection('ev-00005', 'details', { name: 'Changed' }, r.version);
    expect(fixture.rows[4]!.name).toBe('Warehouse Mgmt Cutover');
  });
});

describe('mock Events server: saved views', () => {
  it('lists the system views first, then the user’s own', async () => {
    expect((await server().listViews()).map((v) => `${v.kind}:${v.name}`)).toEqual(['system:Active', 'system:All events', 'user:Production at risk']);
  });

  it('the Active view hides Complete events', async () => {
    const s = server(eventsBoard());
    const active = (await s.listViews())[0]!;
    expect((await s.query(q({ filters: active.filters }))).rows.some((r) => r.status === 'complete')).toBe(false);
  });

  it('saves a new view, replaces one, and deletes it', async () => {
    const s = server();
    const saved = await s.saveView({ id: '', name: ' Blocked ', filters: { ...EMPTY_EVENT_FILTERS, status: ['blocked'] }, columns: DEFAULT_EVENT_COLUMNS, sort: [] });
    expect(saved).toMatchObject({ id: 'view-2', name: 'Blocked', kind: 'user' });
    await s.saveView({ ...saved, name: 'Blocked events' });
    expect((await s.listViews()).filter((v) => v.kind === 'user').map((v) => v.name)).toEqual(['Production at risk', 'Blocked events']);
    await s.deleteView('view-2');
    expect((await s.listViews()).map((v) => v.id)).not.toContain('view-2');
  });

  it('will not change or delete a system view', async () => {
    const s = server();
    const active = (await s.listViews())[0]!;
    await expect(s.saveView(active)).rejects.toMatchObject({ kind: 'noAccess', message: 'System views cannot be changed. Save it as a new view.' });
    await expect(s.deleteView('active')).rejects.toMatchObject({ kind: 'noAccess' });
  });
});
