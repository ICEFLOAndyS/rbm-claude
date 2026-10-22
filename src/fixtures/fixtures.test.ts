import { validateFixture } from '../data/schema';
import { badlyLateEvent, healthyEvent, largeEvent, planEvent, waitForStage, weekendPayrollCutover } from './build';
import { computeSnapshot } from '../engine/engine';
import weekend from './weekend-payroll-cutover.json';
import healthy from './healthy-event.json';
import late from './badly-late-event.json';

describe('fixtures validate against the types', () => {
  it.each([
    ['weekend-payroll-cutover', weekend],
    ['healthy-event', healthy],
    ['badly-late-event', late],
  ])('%s.json is sound', (_, data) => {
    expect(validateFixture(data).errors).toEqual([]);
  });

  it.each([
    ['weekend-payroll-cutover', weekend, weekendPayrollCutover],
    ['healthy-event', healthy, healthyEvent],
    ['badly-late-event', late, badlyLateEvent],
  ])('%s.json matches its builder (run npm run fixtures after changing the builder)', (_, data, build) => {
    expect(data).toEqual(build());
  });

  it('rejects a file that does not match the types', () => {
    const broken = structuredClone(weekend) as unknown as { tasks: { state: string }[] };
    broken.tasks[0]!.state = 'cancelled';
    expect(validateFixture(broken).errors.join()).toMatch(/tasks\.0\.state/);
  });

  it('rejects an event number that is not REVnnnnnn', () => {
    const broken = structuredClone(weekend) as unknown as { event: { number: string } };
    broken.event.number = 'E12345';
    expect(validateFixture(broken).errors.join()).toMatch(/event\.number/);
  });

  it('rejects broken links between records', () => {
    const broken = structuredClone(weekendPayrollCutover());
    const task = broken.tasks[5]!;
    task.dependencies.push({ predecessorId: 'nope', type: 'finish_to_start' });
    broken.blockers[0]!.taskIds = ['missing'];
    const { errors } = validateFixture(broken);
    expect(errors).toContain(`task ${task.wbs}: unknown predecessor nope`);
    expect(errors).toContain('BLK-102: unknown task missing');
  });

  it('rejects a dependency loop', () => {
    const broken = structuredClone(weekendPayrollCutover());
    const [a, b] = [broken.tasks[0]!, broken.tasks[4]!];
    a.dependencies = [{ predecessorId: b.id, type: 'finish_to_start' }];
    expect(validateFixture(broken).errors.some((e) => e.startsWith('dependency loop'))).toBe(true);
  });
});

describe('weekend-payroll-cutover', () => {
  const f = weekendPayrollCutover();

  it('is the Command board example: 3 runbooks, 124 tasks, 2 blockers, 5 issues', () => {
    expect(f.runbooks.map((r) => `${r.number} ${r.name}`)).toEqual(['RBK0000001 Payroll cutover', 'RBK0000002 Interfaces', 'RBK0000003 Reporting']);
    expect(f.tasks).toHaveLength(124);
    expect(f.blockers.map((b) => b.number)).toEqual(['BLK-102', 'BLK-202']);
    expect(f.issues).toHaveLength(5);
    expect(f.issues.map((i) => i.severity).sort()).toEqual(['high', 'low', 'medium', 'medium', 'medium']);
  });

  it('plans to the board’s times for Payroll cutover (06:00) and Interfaces (05:00); Reporting ends 05:30 with Verify, which Hand over waits for', () => {
    expect(f.runbooks.map((r) => r.plannedEnd.slice(11, 16))).toEqual(['06:00', '05:00', '05:30']);
    const handOverHead = f.tasks.find((t) => t.wbs === '1.5.1')!;
    expect(handOverHead.dependencies.map((d) => d.predecessorId)).toEqual(['t-1.4.19', 't-3.1.5']);
    expect(f.event.window).toEqual({ start: '2026-05-24T22:00:00Z', end: '2026-05-25T06:00:00Z' });
  });

  it('starts at 03:40 with a failed check, an at-risk task and the Go / No-Go call open', () => {
    expect(f.startsAt).toBe('2026-05-25T03:40:00Z');
    expect(f.tasks.filter((t) => t.result?.value === 'fail')).toHaveLength(1);
    expect(f.tasks.find((t) => t.atRisk)?.atRisk?.reason).toBe('Test data refresh slow');
    expect(f.calls.find((c) => c.checkpointTaskId)?.open).toBe(true);
  });
});

describe('healthy-event and badly-late-event', () => {
  it('healthy has nothing wrong: no blockers, issues or failed checks', () => {
    const f = healthyEvent();
    expect([f.blockers.length, f.issues.length, f.tasks.filter((t) => t.result?.value === 'fail').length]).toEqual([0, 0, 0]);
  });

  it('badly late has several blockers, a failed check and a paused task', () => {
    const f = badlyLateEvent();
    expect(f.blockers.length).toBeGreaterThanOrEqual(3);
    expect(f.tasks.some((t) => t.result?.value === 'fail')).toBe(true);
    expect(f.tasks.filter((t) => t.state === 'paused')).toHaveLength(1);
  });
});

describe('large-event', () => {
  const f = largeEvent();

  it('has about 15,000 tasks across many runbooks and stages, and validates', () => {
    expect(f.tasks).toHaveLength(15_000);
    expect(f.runbooks.length).toBeGreaterThanOrEqual(20);
    expect(f.stages.length).toBeGreaterThanOrEqual(200);
    expect(validateFixture(f).errors).toEqual([]);
  });

  it('has overlapping stages: some stages wait for the stage two before, not the one before', () => {
    const byId = new Map(f.tasks.map((t) => [t.id, t]));
    const stageNo = (wbs: string) => Number(wbs.split('.')[1]);
    // A stage overlaps the one before it when one of its tasks waits on the stage two before.
    const overlapping = f.stages.filter((s) =>
      f.tasks.some(
        (t) => t.stageId === s.id && t.dependencies.some((d) => stageNo(byId.get(d.predecessorId)!.wbs) === stageNo(s.wbs) - 2),
      ),
    );
    expect(overlapping.length).toBeGreaterThan(10);
  });

  it('is the same for the same seed, and different for another', () => {
    expect(largeEvent(1).tasks.slice(0, 50)).toEqual(largeEvent(1).tasks.slice(0, 50));
    expect(largeEvent(2).runbooks.map((r) => r.name)).not.toEqual(largeEvent(1).runbooks.map((r) => r.name));
  });
});

describe('the critical path crosses runbooks in every fixture', () => {
  const criticalRunbooks = (build: () => ReturnType<typeof weekendPayrollCutover>) => {
    const f = build();
    const s = computeSnapshot(f, new Date(f.startsAt), f.currentUserId);
    return [...new Set(s.stages.filter((st) => st.critical).map((st) => st.runbookId))];
  };

  it.each([
    ['weekend-payroll-cutover', weekendPayrollCutover, ['rb-1', 'rb-3']],
    ['healthy-event', healthyEvent, ['rb-1', 'rb-3']],
    ['badly-late-event', badlyLateEvent, ['rb-1', 'rb-3']],
  ] as const)('%s has Payroll cutover and Reporting on the critical path', (_, build, expected) => {
    expect(criticalRunbooks(build)).toEqual(expected);
  });

  it('large-event has more than one runbook on the critical path', () => {
    expect(criticalRunbooks(() => largeEvent()).length).toBeGreaterThan(1);
  }, 30_000);

  it('plans a hand-off between runbooks: the stage starts when the stage in the other runbook ends', () => {
    const built = planEvent(Date.parse('2026-05-24T22:00:00Z'), [
      { wbs: '1', number: 'R1', name: 'First', startOffset: 0, stages: [{ name: 'A', lanes: [[60]] }] },
      { wbs: '2', number: 'R2', name: 'Second', startOffset: 0, stages: [{ name: 'B', lanes: [[10]] }, { name: 'C', lanes: [[10]], waitsFor: ['1.1'] }] },
    ]);
    const c = built.tasks.find((t) => t.wbs === '2.2.1')!;
    expect(c.planned.start).toBe('2026-05-24T23:00:00Z');
    expect(c.dependencies.map((d) => d.predecessorId)).toEqual(['t-2.1.1', 't-1.1.1']);
    expect(() => planEvent(0, [{ wbs: '1', number: 'R1', name: 'First', startOffset: 0, stages: [{ name: 'A', lanes: [[5]], waitsFor: ['2.1'] }] }])).toThrow(/not in an earlier runbook/);
  });

  it('refuses a hand-off the plan does not allow', () => {
    const built = planEvent(Date.parse('2026-05-24T22:00:00Z'), [
      { wbs: '1', number: 'R1', name: 'First', startOffset: 0, stages: [{ name: 'A', lanes: [[60]] }] },
      { wbs: '2', number: 'R2', name: 'Second', startOffset: 0, stages: [{ name: 'B', lanes: [[10]] }] },
    ]);
    expect(() => waitForStage(built.tasks, '2.1', '1.1')).toThrow(/plan has it start first/);
  });
});
