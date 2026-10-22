/**
 * Builds the Events list fixtures: the board's eight events, a 128-row list, a 15,000-row list
 * (seeded, git-ignored) and an empty list. Records are built from their rows by `buildEventRecord`,
 * which the mock server also uses for the large list, so a record is the same whether it came from a
 * file or was built on demand.
 *
 * Used by `npm run fixtures` (scripts/fixtures.ts) and by the tests. Pure: no file access.
 */
import { seeded } from '../build';
import { DEFAULT_EVENT_COLUMNS, formatWhen } from '../../data/list/events';
import { stateFor } from '../../data/list/schema';
import { COMMAND_CENTRE_EVENTS } from '../commandCentreEvents';
import type {
  AttentionItem,
  Environment,
  HistoryEntry,
  PersonRef,
  EventAction,
  EventDependency,
  EventListFixture,
  EventRecord,
  EventRow,
  EventSectionId,
  EventStatus,
  SectionLock,
} from '../../data/list/types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');
const at = (s: string) => Date.parse(s);

export const NOW = '2026-10-25T02:00:00Z';

/** The board's owners, plus a few more for the longer lists. Andy Smith is the current user. */
export const PEOPLE: PersonRef[] = [
  { id: 'p-as', name: 'Andy Smith' },
  { id: 'p-mo', name: 'Mia Okafor' },
  { id: 'p-lc', name: 'Lin Chen' },
  { id: 'p-rp', name: 'Raj Patel' },
  { id: 'p-jn', name: 'Jo Novak' },
  { id: 'p-sd', name: 'Sam Diaz' },
  { id: 'p-tb', name: 'Tom Brown' },
  { id: 'p-kw', name: 'Kate Wright' },
  { id: 'p-ab', name: 'Alex Baker' },
  { id: 'p-rs', name: 'Ravi Silva' },
  { id: 'p-an', name: 'Ana Nash' },
  { id: 'p-br', name: 'Ben Reid' },
];
const person = (id: string) => PEOPLE.find((p) => p.id === id)!;

export const eventNumber = (n: number) => `REV${String(n).padStart(6, '0')}`;

/** The window most events use: 22:00 to 06:00 the next day. */
function nightWindow(day: string) {
  const start = at(`${day}T22:00:00Z`);
  return { windowStart: iso(start), windowEnd: iso(start + 8 * HOUR) };
}

function row(n: number, name: string, status: EventStatus, ownerId: string, day: string, environment: Environment = 'production'): EventRow {
  return { id: `ev-${String(n).padStart(5, '0')}`, number: eventNumber(n), name, status, owner: person(ownerId), state: stateFor(status), environment, ...nightWindow(day) };
}

/** The eight events drawn on the Page templates board, in the board's order. */
export function boardRows(): EventRow[] {
  return [
    row(1, 'Q4 Data Centre Cutover', 'active', 'p-as', '2026-10-24'),
    row(2, 'Payments DB Failover', 'atRisk', 'p-mo', '2026-10-26'),
    row(3, 'Core Network Refresh', 'blocked', 'p-lc', '2026-10-28'),
    row(4, 'Identity Platform Upgrade', 'complete', 'p-rp', '2026-10-12'),
    row(5, 'Warehouse Mgmt Cutover', 'pending', 'p-jn', '2026-11-03'),
    row(6, 'Backup Restore Test', 'paused', 'p-sd', '2026-10-31'),
    row(7, 'ERP Month-end Release', 'active', 'p-tb', '2026-10-31'),
    row(8, 'Storage Array Migration', 'active', 'p-kw', '2026-11-05'),
  ];
}

/**
 * The events the Command Centre prototype opens, REV000009 to REV000012, with the same Event ID, name
 * and window as its fixtures. Andy Smith is the Cutover Manager.
 */
export function commandCentreRows(): EventRow[] {
  return COMMAND_CENTRE_EVENTS.map((e) => ({ ...row(Number(e.number.slice(3)), e.name, e.status, 'p-as', e.windowStart.slice(0, 10)), windowStart: e.windowStart, windowEnd: e.windowEnd }));
}

const SYSTEMS = ['Payroll', 'Billing', 'CRM', 'Identity', 'Core Network', 'Storage', 'ERP', 'Data Warehouse', 'Payments', 'Email', 'Logistics', 'HR', 'Reporting', 'Mainframe', 'Backup'];
const ACTIONS = ['Cutover', 'Migration', 'Failover', 'Upgrade', 'Release', 'Refresh', 'Restore Test', 'Patch'];
const STATUS_WEIGHTS: [EventStatus, number][] = [['active', 30], ['pending', 25], ['complete', 20], ['atRisk', 10], ['blocked', 8], ['paused', 7]];
const ENV_WEIGHTS: [Environment, number][] = [['production', 55], ['preProduction', 20], ['test', 15], ['development', 10]];

function weighted<T>(rng: ReturnType<typeof seeded>, items: [T, number][]): T {
  let r = rng.next() * items.reduce((a, [, w]) => a + w, 0);
  for (const [x, w] of items) if ((r -= w) < 0) return x;
  return items[items.length - 1]![0];
}

/** Generated rows after the board's eight, numbered on from `from`. */
function generatedRows(count: number, seed: number, from: number): EventRow[] {
  const rng = seeded(seed);
  return Array.from({ length: count }, (_, i) => {
    const n = from + i;
    const status = weighted(rng, STATUS_WEIGHTS);
    // Complete events ran in the past; the rest are spread over the next ten weeks.
    const offsetDays = status === 'complete' ? -rng.int(1, 60) : status === 'pending' ? rng.int(3, 70) : rng.int(-1, 14);
    const day = iso(at(NOW) + offsetDays * DAY).slice(0, 10);
    const name = `${rng.pick(SYSTEMS)} ${rng.pick(ACTIONS)}${n > 999 ? ` ${n}` : ''}`;
    return row(n, name, status, rng.pick(PEOPLE).id, day, weighted(rng, ENV_WEIGHTS));
  });
}

// ---- Records ---------------------------------------------------------------

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const RUNNING: EventStatus[] = ['active', 'atRisk', 'blocked', 'paused'];
const TASK_TITLES = ['Stop application services', 'Take final backup', 'Validate migrated data', 'Switch traffic to new platform', 'Run smoke tests', 'Confirm rollback point', 'Update DNS records', 'Restart batch scheduler'];

/** Who may change what. The page shows the lock and the reason; it never decides. */
function locks(r: EventRow): Partial<Record<EventSectionId, SectionLock>> {
  if (r.status === 'complete') {
    const reason = 'Complete events are read-only. Ask an Event Manager to reopen it.';
    return { details: { reason }, schedule: { reason }, people: { reason } };
  }
  if (RUNNING.includes(r.status)) return { schedule: { reason: 'The window cannot change while the event is running. Ask the Event Manager.' } };
  return {};
}

const actions = (s: EventStatus): EventAction[] => (s === 'pending' ? ['startRun'] : RUNNING.includes(s) ? ['openCommandCentre'] : []);

/**
 * An event's full record, built from its row. The same row (and list) always gives the same record.
 * `rows` gives the events it can depend on.
 */
export function buildEventRecord(r: EventRow, rows: readonly EventRow[]): EventRecord {
  const rng = seeded(hash(r.id));
  const start = at(r.windowStart);
  const end = at(r.windowEnd);
  // The record's progress (the list has none). Q4 Data Centre Cutover has the 68% and 124 tasks drawn
  // on the Single record template.
  const drawnTotal = rng.int(20, 160);
  const drawnPercent = r.status === 'complete' ? 100 : r.status === 'pending' ? 0 : rng.int(5, 95);
  const q4 = r.id === 'ev-00001';
  const total = q4 ? 124 : drawnTotal;
  const percent = q4 ? 68 : drawnPercent;
  const complete = Math.round((percent * total) / 100);
  const blocked = r.status === 'blocked' ? rng.int(1, 3) : 0;
  const atRisk = r.status === 'atRisk' ? rng.int(1, 3) : r.status === 'blocked' ? rng.int(0, 2) : 0;
  const late = r.status === 'atRisk' || r.status === 'blocked' ? rng.int(0, 3) : 0;

  // Task WBS is runbook, stage, task (an event holds runbooks, a runbook stages, a stage tasks).
  const runbookCount = rng.int(1, 5);
  const attention: AttentionItem[] = [];
  const add = (reason: AttentionItem['reason'], count: number, detail: string) => {
    for (let i = 0; i < count && attention.length < 5; i++) attention.push({ wbs: `${rng.int(1, runbookCount)}.${rng.int(1, 6)}.${rng.int(1, 9)}`, title: rng.pick(TASK_TITLES), reason, detail });
  };
  add('blocked', blocked, 'Blocked by BLK-102');
  add('atRisk', atRisk, 'Test data refresh slow');
  add('late', late, 'Late to start');

  // Dependencies on near neighbours in the list, so the board's events link to each other.
  const index = rows.findIndex((x) => x.id === r.id);
  const pick = seeded(hash(r.id) + 1); // Its own sequence, so other changes here do not move the links.
  const ref = (x: EventRow, relationship: EventDependency['relationship']): EventDependency => ({ event: { id: x.id, number: x.number, name: x.name }, status: x.status, relationship });
  const upstream = [rows[index + 2]].filter((x): x is EventRow => !!x && pick.next() < 0.7).map((x) => ref(x, 'waitsFor'));
  const downstream = [rows[index - 2], rows[index + 1]].filter((x): x is EventRow => !!x && pick.next() < 0.4).map((x) => ref(x, 'runsWith'));

  const others = PEOPLE.filter((p) => p.id !== r.owner.id);
  const roles = (['Reviewer', 'Approver'] as const).map((role, i) => ({ role, person: others[(hash(r.id) + i * 5) % others.length]!, response: i === 0 && r.status === 'pending' ? ('awaiting' as const) : ('accepted' as const) }));

  // History is always in the past, oldest first: created, environment change, window change.
  const now = at(NOW);
  const h3 = Math.min(start - 2 * DAY, now - 2 * HOUR);
  const h2 = Math.min(start - 3 * DAY, h3 - DAY);
  const createdAt = Math.min(start - 22 * DAY, r.status === 'pending' ? now - DAY : h2 - DAY);
  const history: HistoryEntry[] = [
    { id: `${r.id}-h1`, at: iso(createdAt), by: r.owner, sectionId: 'details', changes: [{ field: 'name', label: 'Name', from: 'None', to: r.name }] },
  ];
  if (r.status !== 'pending') {
    const reviewer = roles[0]!.person;
    history.push({ id: `${r.id}-h2`, at: iso(h2), by: reviewer, sectionId: 'details', changes: [{ field: 'environment', label: 'Environment', from: 'Test', to: 'Production' }] });
    history.push({ id: `${r.id}-h3`, at: iso(h3), by: r.owner, sectionId: 'schedule', changes: [{ field: 'windowStart', label: 'Start', from: formatWhen(iso(start - DAY)), to: formatWhen(r.windowStart) }] });
  }
  history.reverse(); // Newest first.

  return {
    id: r.id,
    number: r.number,
    version: history.length,
    permissions: { locked: locks(r) },
    history,
    updatedAt: history[0]!.at,
    updatedBy: history[0]!.by,
    name: r.name,
    description: `${r.name}: move the service to its new platform with a tested rollback.`,
    environment: r.environment,
    state: r.state,
    windowStart: r.windowStart,
    windowEnd: r.windowEnd,
    freezeAt: iso(start - 28 * HOUR),
    rollbackBy: iso(start + (end - start) / 2),
    owner: r.owner,
    roles,
    status: r.status,
    progress: { percent, complete, total, blocked, atRisk, late },
    linkedChanges: Array.from({ length: rng.int(0, 2) }, (_, i) => ({ number: `CHG${String(31200 + (hash(r.id) % 700) + i).padStart(7, '0')}`, title: `${r.name} change ${i + 1}`, state: r.status === 'complete' ? 'Closed' : 'Scheduled' })),
    attention,
    upstream,
    downstream,
    createdAt: iso(createdAt),
    actions: actions(r.status),
  };
}

function fixture(rows: EventRow[], withRecords: boolean, views: EventListFixture['views'] = []): EventListFixture {
  return { now: NOW, currentUserId: 'p-as', people: PEOPLE, rows, records: withRecords ? rows.map((r) => buildEventRecord(r, rows)) : [], views };
}

/** The board's eight events, with their records. */
export const eventsBoard = () => fixture(boardRows(), true);

/**
 * 128 events: the board's eight, the Command Centre's four, then 116 generated. One saved view of the user's own. Records are
 * built on demand, which keeps the file small (with them it is 600 KB).
 */
export const events128 = () =>
  fixture([...boardRows(), ...commandCentreRows(), ...generatedRows(116, 128, 13)], false, [
    {
      id: 'view-1',
      name: 'Production at risk',
      kind: 'user',
      filters: { search: '', status: ['atRisk', 'blocked'], owner: [], environment: ['production'] },
      columns: DEFAULT_EVENT_COLUMNS,
      sort: [{ field: 'windowStart', direction: 'asc' }],
    },
  ]);

/** About 15,000 events. Records are built on demand. Same output for the same seed. */
export const eventsLarge = (seed = 20261022) => fixture([...boardRows(), ...commandCentreRows(), ...generatedRows(14_988, seed, 13)], false);

export const eventsEmpty = () => fixture([], false);

export const eventFixtureBuilders = {
  'events-board': eventsBoard,
  'events-128': events128,
  'events-large': eventsLarge,
  'events-empty': eventsEmpty,
} as const;
