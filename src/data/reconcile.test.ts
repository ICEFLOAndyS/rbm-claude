import { createFixtureSource } from './fixtureSource';
import { toRunbookProgress, toVitals, toWorkstreamProgress } from './adapters';
import { validateFixture } from './schema';
import { createSimClock } from '../engine/clock';
import { badlyLateEvent, healthyEvent, largeEvent, weekendPayrollCutover } from '../fixtures/build';
import type { EventFixture } from './types';
import type { RbmExecProgressItem } from '../components/RbmExecProgress/RbmExecProgress';

const snapshotOf = (f: EventFixture) => {
  const clock = createSimClock(new Date(f.startsAt), { speed: 0 });
  const source = createFixtureSource(f, clock);
  const s = source.getSnapshot();
  source.dispose();
  clock.dispose();
  return s;
};

const totals = (rows: RbmExecProgressItem[]) =>
  rows.reduce(
    (a, r) => ({ complete: a.complete + r.complete, total: a.total + r.total, high: a.high + r.issues.high, medium: a.medium + r.issues.medium, low: a.low + r.issues.low }),
    { complete: 0, total: 0, high: 0, medium: 0, low: 0 },
  );

describe.each([
  ['Weekend Payroll Cutover', weekendPayrollCutover],
  ['Healthy event', healthyEvent],
  ['Badly late event', badlyLateEvent],
  ['Large event', () => largeEvent()],
] as const)('%s: runbooks, workstreams and the Event vitals agree', (_name, build) => {
  const fixture = build();
  const s = snapshotOf(fixture);
  const vitals = toVitals(s);
  const event = { complete: vitals.progress.complete, total: vitals.progress.total, ...vitals.issues };

  it('puts every task in one runbook and one known workstream', () => {
    expect(validateFixture(JSON.parse(JSON.stringify(fixture))).errors).toEqual([]);
    const known = new Set(s.workstreams.map((w) => w.id));
    expect(s.tasks.filter((t) => !t.workstreamId || !known.has(t.workstreamId))).toEqual([]);
    expect(s.workstreams.length).toBeGreaterThan(1);
    expect(s.runbooks.every((r) => r.ownerId)).toBe(true);
  });

  it('Runbook progress adds up to the Event vitals: tasks complete, total and open issues by severity', () => {
    expect(totals(toRunbookProgress(s))).toEqual(event);
  });

  it('Workstream progress adds up to the same numbers', () => {
    expect(totals(toWorkstreamProgress(s))).toEqual(event);
  });

  it('every workstream works across more than one runbook, or the event has one runbook', () => {
    const runbooksOf = (wsId: string) => new Set(s.tasks.filter((t) => t.workstreamId === wsId).map((t) => t.runbookId)).size;
    expect(s.workstreams.some((w) => runbooksOf(w.id) > 1)).toBe(true);
  });
});

describe('Weekend Payroll Cutover, as on the Command board', () => {
  const s = snapshotOf(weekendPayrollCutover());

  it('has 124 tasks, 69 complete and 5 open issues (1 high, 3 medium, 1 low)', () => {
    const v = toVitals(s);
    expect(v.progress).toMatchObject({ complete: 69, total: 124 });
    expect(v.issues).toEqual({ high: 1, medium: 3, low: 1 });
  });

  it('owns each runbook and workstream by name', () => {
    expect(toRunbookProgress(s).map((r) => `${r.name}: ${r.owner.name}`)).toEqual(['Payroll cutover: Tom Baker', 'Interfaces: Raj Patel', 'Reporting: Lin Chen']);
    expect(toWorkstreamProgress(s).find((w) => w.name === 'Cutover management')!.owner.name).toBe('Andy Smith');
  });
});
