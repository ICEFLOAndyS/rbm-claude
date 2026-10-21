/**
 * Builds the prototype's fixtures. A fixture is described as runbooks, stages and parallel lanes
 * of task durations. The builder works out the planned times, plays the plan forward with chosen
 * delays up to the fixture's start time (so actual starts and ends are a consistent history),
 * then adds the scenario: blockers, issues, failed checks, pauses, calls and watchers.
 *
 * Used by `npm run fixtures` (scripts/fixtures.ts) and by the tests. Pure: no file access.
 */
import type { Blocker, Call, EventFixture, Issue, Person, Runbook, Stage, Task, TaskKind, Watcher } from '../data/types';

const MIN = 60_000;
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

/** Seeded random numbers (mulberry32), so generated fixtures are the same every run. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)]!,
  };
}

// ---- Plan description ------------------------------------------------------

export interface LaneTask {
  minutes: number;
  title?: string;
  kind?: TaskKind;
}

export interface StageSpec {
  name: string;
  /** Parallel chains of tasks. Each chain runs in order. */
  lanes: (number | LaneTask)[][];
  /** A milestone or checkpoint after every lane finishes. */
  closer?: { title: string; kind: 'milestone' | 'checkpoint'; minutes: number };
  /** Stage indexes (in this runbook) this stage waits for. Defaults to the previous stage. */
  after?: number[];
}

export interface RunbookSpec {
  wbs: string;
  number: string;
  name: string;
  /** Minutes after the event window starts. */
  startOffset: number;
  stages: StageSpec[];
}

const titles: Record<string, string[]> = {
  default: ['Confirm readiness', 'Notify service desk', 'Run health check', 'Take snapshot', 'Validate configuration', 'Update runbook log', 'Check monitoring', 'Confirm with business', 'Drain connections', 'Verify backups', 'Clear queues', 'Record timings'],
  prepare: ['Freeze payroll changes', 'Confirm change window', 'Brief the bridge', 'Check vendor contacts', 'Snapshot payroll servers', 'Confirm rollback plan', 'Verify access accounts'],
  extract: ['Stop batch jobs', 'Stop legacy jobs', 'Export payroll data', 'Checksum exports', 'Archive interface files', 'Stop scheduler', 'Disable integrations'],
  failover: ['Reindex payroll database', 'Startup application services', 'Startup application UI', 'Apply configuration patch', 'Refresh test data', 'Run smoke tests', 'Notify service desk', 'Switch DNS', 'Warm caches'],
  verify: ['Account reconciliation', 'Refresh reports', 'Payroll totals check', 'Compare record counts', 'Sample employee records', 'Check tax tables'],
  handover: ['Sign off with payroll', 'Hand over to support', 'Close bridge actions', 'Re-enable monitoring'],
  interfaces: ['Switch payroll interface', 'Test payroll interface', 'Switch bank interface', 'Test bank file', 'Switch HR feed', 'Confirm feeds'],
  reporting: ['Rebuild reports', 'Refresh dashboards', 'Validate report totals', 'Publish reports', 'Notify finance'],
};
const titleFor = (stageName: string, i: number) => {
  const key = Object.keys(titles).find((k) => stageName.toLowerCase().includes(k)) ?? 'default';
  const pool = titles[key]!;
  return pool[i % pool.length]!;
};

interface Built {
  runbooks: Runbook[];
  stages: Stage[];
  tasks: Task[];
}

/** Lays out the plan: ids, WBS, dependencies, "not before" on root tasks, and planned times. */
export function planEvent(windowStart: number, specs: RunbookSpec[]): Built {
  const runbooks: Runbook[] = [];
  const stages: Stage[] = [];
  const tasks: Task[] = [];
  for (const rb of specs) {
    const rbId = `rb-${rb.wbs}`;
    const rbStart = windowStart + rb.startOffset * MIN;
    const stageTails: string[][] = [];
    const stageEnds: number[] = [];
    let rbEnd = rbStart;
    rb.stages.forEach((st, si) => {
      const stageWbs = `${rb.wbs}.${si + 1}`;
      const stageId = `st-${stageWbs}`;
      stages.push({ id: stageId, runbookId: rbId, wbs: stageWbs, name: st.name });
      const waitFor = st.after ?? (si > 0 ? [si - 1] : []);
      const heads = waitFor.flatMap((i) => stageTails[i] ?? []);
      const startAt = waitFor.length ? Math.max(...waitFor.map((i) => stageEnds[i]!)) : rbStart;
      // Lay each lane out in order, then number the stage's tasks by planned start.
      const laid: { lane: number; minutes: number; title?: string; kind: TaskKind; start: number }[] = [];
      st.lanes.forEach((lane, li) => {
        let t = startAt;
        for (const item of lane) {
          const spec = typeof item === 'number' ? { minutes: item } : item;
          laid.push({ lane: li, minutes: spec.minutes, title: spec.title, kind: spec.kind ?? 'task', start: t });
          t += spec.minutes * MIN;
        }
      });
      const order = laid.map((x, i) => ({ ...x, i })).sort((a, b) => a.start - b.start || a.lane - b.lane);
      const idOf = new Map<number, string>();
      order.forEach((x, n) => idOf.set(x.i, `t-${stageWbs}.${n + 1}`));
      const lastOfLane = new Map<number, string>();
      let n = 0;
      for (const x of laid) {
        const id = idOf.get(laid.indexOf(x))!;
        const prev = lastOfLane.get(x.lane);
        const deps = prev ? [prev] : heads;
        const wbs = id.slice(2);
        tasks.push({
          id, runbookId: rbId, stageId, wbs,
          title: x.title ?? titleFor(st.name, n++),
          kind: x.kind, state: 'not_started',
          planned: { start: iso(x.start), end: iso(x.start + x.minutes * MIN) },
          durationMinutes: x.minutes,
          dependencies: deps.map((p) => ({ predecessorId: p, type: 'finish_to_start' as const })),
          ...(deps.length === 0 ? { constraints: { notBefore: iso(x.start) } } : {}),
        });
        lastOfLane.set(x.lane, id);
      }
      let tails = [...lastOfLane.values()];
      let end = Math.max(...laid.map((x) => x.start + x.minutes * MIN));
      if (st.closer) {
        const id = `t-${stageWbs}.${laid.length + 1}`;
        tasks.push({
          id, runbookId: rbId, stageId, wbs: id.slice(2), title: st.closer.title, kind: st.closer.kind, state: 'not_started',
          planned: { start: iso(end), end: iso(end + st.closer.minutes * MIN) }, durationMinutes: st.closer.minutes,
          dependencies: tails.map((p) => ({ predecessorId: p, type: 'finish_to_start' as const })),
        });
        tails = [id];
        end += st.closer.minutes * MIN;
      }
      stageTails[si] = tails;
      stageEnds[si] = end;
      rbEnd = Math.max(rbEnd, end);
    });
    runbooks.push({ id: rbId, number: rb.number, wbs: rb.wbs, name: rb.name, plannedEnd: iso(rbEnd) });
  }
  return { runbooks, stages, tasks };
}

/**
 * Plays the plan forward to `now`: each task starts at the later of its planned start and its
 * predecessors' actual ends, plus any delay, and runs for its duration. Sets state and actual times.
 */
export function playTo(tasks: Task[], now: number, delays: Record<string, number> = {}, holdBack: string[] = []) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const end = new Map<string, number>();
  const visit = (t: Task): number => {
    const known = end.get(t.id);
    if (known !== undefined) return known;
    const ready = Math.max(Date.parse(t.planned.start), ...t.dependencies.map((d) => visit(byId.get(d.predecessorId)!)));
    // A held-back task is due but nobody has picked it up, so it and its successors have not started.
    const start = holdBack.includes(t.wbs) ? Infinity : ready + (delays[t.wbs] ?? 0) * MIN;
    const finish = start + t.durationMinutes * MIN;
    end.set(t.id, finish);
    if (finish <= now) {
      t.state = 'complete';
      t.actual = { start: iso(start), end: iso(finish) };
    } else if (start <= now) {
      t.state = 'active';
      t.actual = { start: iso(start) };
    }
    return finish;
  };
  // Plans are wide rather than deep, so recursion depth stays at the longest chain.
  for (const t of tasks) visit(t);
}

const people: Person[] = [
  { id: 'p-as', name: 'Andy Smith' }, { id: 'p-tb', name: 'Tom Baker' }, { id: 'p-kw', name: 'Karen Wells' }, { id: 'p-rp', name: 'Raj Patel' },
  { id: 'p-jn', name: 'Jo Nash' }, { id: 'p-sd', name: 'Sam Dee' }, { id: 'p-mo', name: 'Mary O’Neill' }, { id: 'p-lc', name: 'Lin Chen' },
];

function assign(tasks: Task[], pool: Person[], rng = seeded(7)) {
  for (const t of tasks) if (t.kind !== 'milestone') t.assigneeId = rng.pick(pool.slice(1)).id;
}

const byWbs = (tasks: Task[], wbs: string) => {
  const t = tasks.find((x) => x.wbs === wbs);
  if (!t) throw new Error(`no task ${wbs}`);
  return t;
};

/** The first task of each lane in a stage (no predecessor in the same stage). */
const laneHeads = (tasks: Task[], stageWbs: string) => {
  const inStage = new Set(tasks.filter((t) => t.wbs.startsWith(`${stageWbs}.`)).map((t) => t.id));
  return tasks.filter((t) => inStage.has(t.id) && !t.dependencies.some((d) => inStage.has(d.predecessorId)));
};

// ---- The Weekend Payroll Cutover, as on the Command board ----------------------------

const WINDOW_START = Date.parse('2026-05-24T22:00:00Z');
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return Date.parse(`2026-05-${h >= 12 ? 24 : 25}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
};

const lanes = (counts: number[], minutes: number) => counts.map((c) => Array.from({ length: c }, () => minutes));

function payrollPlan(): RunbookSpec[] {
  return [
    {
      wbs: '1', number: 'RBK0000001', name: 'Payroll cutover', startOffset: 0,
      stages: [
        { name: 'Prepare', lanes: lanes([6, 6, 6, 6], 15) },
        { name: 'Extract and stop', lanes: lanes([10, 10, 9], 15), closer: { title: 'Data extracted', kind: 'milestone', minutes: 0 } },
        { name: 'Application failover', lanes: lanes([10, 10, 9], 15), closer: { title: 'Application failover', kind: 'milestone', minutes: 0 } },
        { name: 'Verify', lanes: lanes([6, 6, 6], 10), closer: { title: 'Validation complete', kind: 'milestone', minutes: 0 } },
        { name: 'Hand over', lanes: lanes([3, 3, 3], 5), closer: { title: 'Go / No-Go', kind: 'checkpoint', minutes: 15 } },
      ],
    },
    { wbs: '2', number: 'RBK0000002', name: 'Interfaces', startOffset: 300, stages: [{ name: 'Switch interfaces', lanes: lanes([6], 20) }] },
    { wbs: '3', number: 'RBK0000003', name: 'Reporting', startOffset: 360, stages: [{ name: 'Rebuild reporting', lanes: lanes([5], 20) }] },
  ];
}

function baseFixture(name: string, number: string, built: Built, now: number): EventFixture {
  const end = Math.max(...built.runbooks.map((r) => Date.parse(r.plannedEnd)));
  return {
    startsAt: iso(now),
    currentUserId: 'p-as',
    event: { id: `ev-${number}`, number, name, state: 'active', owner: 'Cutover Manager Team', window: { start: iso(WINDOW_START), end: iso(end) }, programme: 'Q4 Data Centre Migration' },
    people,
    ...built,
    blockers: [],
    issues: [],
    calls: [],
    watchers: [],
    log: [],
  };
}

const calls = (tasks: Task[], open: boolean): Call[] => [
  { id: 'call-collab', open: true, participantIds: people.slice(1, 8).map((p) => p.id) },
  { id: 'call-gonogo', checkpointTaskId: tasks.find((t) => t.title === 'Go / No-Go')!.id, open, ...(open ? {} : { opensAt: iso(at('05:30')) }), participantIds: open ? ['p-tb', 'p-lc', 'p-rp', 'p-sd'] : [] },
];

const watchers: Watcher[] = [{ id: 'w-1', title: 'Payroll Interface Monitoring', since: iso(at('01:00')) }];

/** Delays the start of every lane in a stage by the given minutes. */
const delayStage = (tasks: Task[], stageWbs: string, minutes: number) => Object.fromEntries(laneHeads(tasks, stageWbs).map((t) => [t.wbs, minutes]));

/** The Command board's example: 3 runbooks, 124 tasks, forecast +12 minutes, 2 blockers, 5 issues. */
export function weekendPayrollCutover(): EventFixture {
  const now = at('03:40');
  const built = planEvent(WINDOW_START, payrollPlan());
  const { tasks } = built;
  // 1.3.18 is due but not picked up: Ready and Late to start. Its lane has 15 minutes of slack, so the forecast holds.
  playTo(tasks, now, { ...delayStage(tasks, '1.3', 12), '2.1.1': 27 }, ['1.3.18']);
  assign(tasks, people);
  const f = baseFixture('Weekend Payroll Cutover', 'E12345', built, now);

  const active = tasks.filter((t) => t.wbs.startsWith('1.3.') && t.state === 'active');
  const check = active[1]!;
  check.kind = 'checkpoint';
  check.title = 'Payroll totals check';
  check.result = { value: 'fail', byId: 'p-rp', at: iso(now - 4 * MIN), comment: 'Totals differ by 3 records' };
  const next = (t: Task) => tasks.find((x) => x.dependencies.some((d) => d.predecessorId === t.id) && x.stageId === t.stageId)!;
  next(active[0]!).atRisk = { reason: 'Test data refresh slow' };
  byWbs(tasks, '1.3.18').title = 'Refresh test data';

  const blocked1 = byWbs(tasks, '1.4.2');
  blocked1.title = 'Account reconciliation';
  const blockers: Blocker[] = [
    { id: 'b-102', number: 'BLK-102', title: 'Waiting on vendor', severity: 'high', state: 'open', taskIds: [blocked1.id], raisedAt: iso(at('02:50')) },
    { id: 'b-202', number: 'BLK-202', title: 'Network connectivity', severity: 'high', state: 'open', taskIds: [byWbs(tasks, '2.1.4').id], raisedAt: iso(at('03:20')) },
  ];
  const issueOn = (id: string, number: string, title: string, severity: Issue['severity'], wbs: string, when: string): Issue => ({ id, number, title, severity, state: 'open', taskIds: [byWbs(tasks, wbs).id], raisedAt: iso(at(when)) });
  const issues: Issue[] = [
    issueOn('i-101', 'INC-101', 'Batch job overran', 'high', '1.3.9', '03:10'),
    issueOn('i-102', 'INC-102', 'Slow report refresh', 'medium', '1.4.3', '03:15'),
    issueOn('i-103', 'INC-103', 'Monitoring gap', 'medium', '1.3.12', '03:25'),
    issueOn('i-104', 'INC-104', 'Login warning on UI', 'medium', active[0]!.wbs, '03:30'),
    issueOn('i-105', 'INC-105', 'Log rotation noise', 'low', '3.1.2', '03:35'),
  ];
  return { ...f, blockers, issues, calls: calls(tasks, true), watchers };
}

/** On schedule, no alerts: the alert counter is hidden. */
export function healthyEvent(): EventFixture {
  const now = at('03:40');
  const built = planEvent(WINDOW_START, payrollPlan());
  playTo(built.tasks, now);
  assign(built.tasks, people);
  return { ...baseFixture('Weekend Payroll Cutover (healthy)', 'E12346', built, now), calls: calls(built.tasks, false), watchers };
}

/** A Red forecast, several blockers, a failed check and a paused task. */
export function badlyLateEvent(): EventFixture {
  const now = at('03:40');
  const built = planEvent(WINDOW_START, payrollPlan());
  const { tasks } = built;
  playTo(tasks, now, { ...delayStage(tasks, '1.3', 40), '2.1.1': 35 });
  assign(tasks, people);
  const f = baseFixture('Weekend Payroll Cutover (late)', 'E12347', built, now);
  const active = tasks.filter((t) => t.wbs.startsWith('1.3.') && t.state === 'active');
  const check = active[0]!;
  check.kind = 'checkpoint';
  check.title = 'Payroll totals check';
  check.result = { value: 'fail', byId: 'p-rp', at: iso(now - 6 * MIN) };
  const paused = active[1]!;
  // Paused halfway between its start and now, so the minutes worked are real.
  const pausedAt = Math.round((Date.parse(paused.actual!.start!) + now) / 2 / MIN) * MIN;
  paused.state = 'paused';
  paused.paused = { byId: 'p-as', at: iso(pausedAt), reason: 'Waiting for DBA' };
  paused.workedMinutes = Math.round((pausedAt - Date.parse(paused.actual!.start!)) / MIN);
  const blocker = (n: number, title: string, severity: Blocker['severity'], wbs: string): Blocker => ({ id: `b-${n}`, number: `BLK-${n}`, title, severity, state: 'open', taskIds: [byWbs(tasks, wbs).id], raisedAt: iso(now - n * MIN / 10) });
  return {
    ...f,
    blockers: [blocker(102, 'Waiting on vendor', 'high', '1.4.2'), blocker(202, 'Network connectivity', 'high', '2.1.3'), blocker(305, 'Firewall change pending', 'medium', '1.4.5'), blocker(311, 'Licence key expired', 'low', '3.1.1')],
    issues: [
      { id: 'i-201', number: 'INC-201', title: 'Database failover slow', severity: 'high', state: 'open', taskIds: [active[2]!.id], raisedAt: iso(now - 20 * MIN) },
      { id: 'i-202', number: 'INC-202', title: 'Cache errors', severity: 'medium', state: 'open', taskIds: [byWbs(tasks, '1.3.20').id], raisedAt: iso(now - 15 * MIN) },
    ],
    calls: calls(tasks, false),
    watchers,
  };
}

// ---- The large event: about 15,000 tasks, generated -----------------------------------------

/** About 15,000 tasks across many runbooks and stages, with overlapping stages. Same output for the same seed. */
export function largeEvent(seed = 20261021): EventFixture {
  const rng = seeded(seed);
  const pool = Array.from({ length: 40 }, (_, i) => ({ id: `p-${i}`, name: `${rng.pick(['Alex', 'Sam', 'Jo', 'Kai', 'Lin', 'Ravi', 'Mia', 'Tom', 'Ana', 'Ben'])} ${rng.pick(['Baker', 'Chen', 'Patel', 'Nash', 'Wells', 'Dee', 'Okafor', 'Silva', 'Novak', 'Reid'])}` }));
  const specs: RunbookSpec[] = Array.from({ length: 30 }, (_, r) => ({
    wbs: String(r + 1),
    number: `RBK${String(1000 + r).padStart(7, '0')}`,
    name: `${rng.pick(['Payroll', 'Finance', 'HR', 'Billing', 'Identity', 'Network', 'Storage', 'CRM', 'Reporting', 'Logistics'])} ${rng.pick(['cutover', 'migration', 'failover', 'upgrade', 'switch'])} ${r + 1}`,
    startOffset: rng.int(0, 240),
    stages: Array.from({ length: 10 }, (_, s) => {
      const laneCount = rng.int(2, 5);
      const counts = Array.from({ length: laneCount }, () => 0);
      for (let i = 0; i < 49; i++) counts[i % laneCount]!++;
      return {
        name: `${rng.pick(['Prepare', 'Extract', 'Failover', 'Verify', 'Load', 'Switch', 'Test', 'Hand over'])} ${s + 1}`,
        lanes: counts.map((c) => Array.from({ length: c }, () => rng.int(2, 12))),
        closer: { title: `Stage ${r + 1}.${s + 1} complete`, kind: 'milestone' as const, minutes: 0 },
        // Some stages start alongside the one before them, so stages overlap.
        after: s === 0 ? [] : s >= 2 && rng.next() < 0.3 ? [s - 2] : [s - 1],
      };
    }),
  }));
  const built = planEvent(WINDOW_START, specs);
  const now = WINDOW_START + 10 * 60 * MIN;
  const delays: Record<string, number> = {};
  for (const t of built.tasks) if (rng.next() < 0.03) delays[t.wbs] = rng.int(5, 30);
  playTo(built.tasks, now, delays);
  for (const t of built.tasks) if (t.kind !== 'milestone') t.assigneeId = rng.pick(pool).id;
  const notStarted = built.tasks.filter((t) => t.state === 'not_started' && t.kind === 'task');
  const activeOnes = built.tasks.filter((t) => t.state === 'active' && t.kind === 'task');
  const pickSome = (xs: Task[], n: number) => Array.from({ length: n }, () => rng.pick(xs));
  pickSome(activeOnes, 3).forEach((t) => {
    t.kind = 'checkpoint';
    t.result = { value: 'fail', byId: pool[0]!.id, at: iso(now - 3 * MIN) };
  });
  const severities = ['high', 'medium', 'low'] as const;
  const fx = baseFixture('Data Centre Migration (large)', 'E20000', built, now);
  return {
    ...fx,
    people: [...people, ...pool],
    blockers: pickSome(notStarted, 25).map((t, i) => ({ id: `b-${i}`, number: `BLK-${500 + i}`, title: `Blocker ${i + 1}`, severity: rng.pick(severities), state: 'open' as const, taskIds: [t.id], raisedAt: iso(now - rng.int(5, 120) * MIN) })),
    issues: pickSome([...notStarted, ...activeOnes], 60).map((t, i) => ({ id: `i-${i}`, number: `INC-${700 + i}`, title: `Issue ${i + 1}`, severity: rng.pick(severities), state: 'open' as const, taskIds: [t.id], raisedAt: iso(now - rng.int(5, 240) * MIN) })),
    calls: [{ id: 'call-collab', open: true, participantIds: pool.slice(0, 12).map((p) => p.id) }],
    watchers: [{ id: 'w-1', title: 'Core network monitoring', since: iso(WINDOW_START) }],
  };
}

export const fixtureBuilders = {
  'weekend-payroll-cutover': weekendPayrollCutover,
  'healthy-event': healthyEvent,
  'badly-late-event': badlyLateEvent,
  'large-event': () => largeEvent(),
} as const;

export type FixtureName = keyof typeof fixtureBuilders;
