import { validateEventFixture, eventFixtureSchema } from '../../data/list/schema';
import { boardRows, buildEventRecord, events128, eventsBoard, eventsEmpty, eventsLarge } from './build';
import board from './events-board.json';
import list128 from './events-128.json';
import empty from './events-empty.json';

describe('Events list fixtures validate against the types', () => {
  it.each([
    ['events-board', board],
    ['events-128', list128],
    ['events-empty', empty],
  ])('%s.json is sound', (_, data) => {
    expect(validateEventFixture(data).errors).toEqual([]);
  });

  it.each([
    ['events-board', board, eventsBoard],
    ['events-128', list128, events128],
    ['events-empty', empty, eventsEmpty],
  ])('%s.json matches its builder (run npm run fixtures after changing the builder)', (_, data, build) => {
    expect(data).toEqual(build());
  });

  it('every record built on demand for the 128-row list is sound', () => {
    const f = events128();
    expect(validateEventFixture({ ...f, records: f.rows.map((r) => buildEventRecord(r, f.rows)) }).errors).toEqual([]);
  });

  it('holds the board’s eight events, as drawn', () => {
    expect(board.rows.map((r) => [r.name, r.status, r.owner.name, r.state, r.windowStart.slice(0, 10)])).toEqual([
      ['Q4 Data Centre Cutover', 'active', 'Andy Smith', 'active', '2026-10-24'],
      ['Payments DB Failover', 'atRisk', 'Mia Okafor', 'active', '2026-10-26'],
      ['Core Network Refresh', 'blocked', 'Lin Chen', 'active', '2026-10-28'],
      ['Identity Platform Upgrade', 'complete', 'Raj Patel', 'complete', '2026-10-12'],
      ['Warehouse Mgmt Cutover', 'pending', 'Jo Novak', 'not_started', '2026-11-03'],
      ['Backup Restore Test', 'paused', 'Sam Diaz', 'paused', '2026-10-31'],
      ['ERP Month-end Release', 'active', 'Tom Brown', 'active', '2026-10-31'],
      ['Storage Array Migration', 'active', 'Kate Wright', 'active', '2026-11-05'],
    ]);
  });

  it('rejects a file that does not match the types', () => {
    const broken = structuredClone(board) as unknown as { rows: { status: string }[] };
    broken.rows[0]!.status = 'cancelled';
    expect(validateEventFixture(broken).errors.join()).toMatch(/rows\.0\.status/);
  });

  it('rejects broken links: a record that disagrees with its row, an unknown owner, a backwards window', () => {
    const broken = eventsBoard();
    broken.records[0]!.name = 'Something else';
    broken.rows[1]!.owner = { id: 'p-x', name: 'Nobody' };
    broken.rows[2]!.windowEnd = broken.rows[2]!.windowStart;
    expect(validateEventFixture(broken).errors).toEqual([
      'REV000002: owner p-x is not a person',
      'REV000003: window ends before it starts',
      'REV000001: record name differs from its row',
      'REV000002: record owner differs from its row',
      'REV000003: record windowEnd differs from its row',
    ]);
  });

  it('rejects a task WBS that is not runbook, stage, task', () => {
    const broken = eventsBoard();
    broken.records[1]!.attention[0]!.wbs = '1.3';
    expect(validateEventFixture(broken).errors.join()).toMatch(/records\.1\.attention\.0\.wbs/);
  });

  it('builds the same large list for the same seed: 15,000 rows, records on demand', () => {
    const a = eventsLarge();
    expect(a.rows).toHaveLength(15_000);
    expect(a.records).toEqual([]);
    expect(eventsLarge().rows.slice(-3)).toEqual(a.rows.slice(-3));
    expect(eventsLarge(1).rows[100]).not.toEqual(a.rows[100]);
    expect(eventFixtureSchema.safeParse(a).success).toBe(true);
  });

  it('builds the same record from the same row', () => {
    const rows = boardRows();
    expect(buildEventRecord(rows[2]!, rows)).toEqual(buildEventRecord(rows[2]!, rows));
  });
});
