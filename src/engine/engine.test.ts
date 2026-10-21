import { applyCommand, computeSnapshot, ragFor, settleMilestones, DEFAULT_SETTINGS } from './engine';
import type { EventRecords, Task } from '../data/types';
import { badlyLateEvent, healthyEvent, weekendPayrollCutover } from '../fixtures/build';

// A small event: A -> B -> M (milestone) -> C, and D in parallel after A. Planned 10:00 to 11:00.
const T = (hhmm: string) => `2026-05-25T${hhmm}:00Z`;
const at = (hhmm: string) => new Date(T(hhmm));
function task(id: string, start: string, minutes: number, deps: string[] = [], over: Partial<Task> = {}): Task {
  const s = Date.parse(T(start));
  return {
    id, runbookId: 'rb', stageId: 'st', wbs: `1.1.${id}`, title: `Task ${id}`, kind: 'task', state: 'not_started',
    planned: { start: T(start), end: new Date(s + minutes * 60_000).toISOString().replace('.000Z', 'Z') },
    durationMinutes: minutes, dependencies: deps.map((p) => ({ predecessorId: p, type: 'finish_to_start' as const })), ...over,
  };
}
function event(tasks: Task[], over: Partial<EventRecords> = {}): EventRecords {
  return {
    event: { id: 'e', number: 'E1', name: 'Test', state: 'active', owner: 'Team', window: { start: T('10:00'), end: T('11:00') } },
    people: [{ id: 'me', name: 'Andy Smith' }, { id: 'lc', name: 'L. Chen' }],
    runbooks: [{ id: 'rb', number: 'RBK0000001', wbs: '1', name: 'Runbook', plannedEnd: T('11:00') }],
    stages: [{ id: 'st', runbookId: 'rb', wbs: '1.1', name: 'Stage' }],
    tasks, blockers: [], issues: [], calls: [], watchers: [], log: [], ...over,
  };
}
const plan = () => [
  task('A', '10:00', 20, [], { constraints: { notBefore: T('10:00') } }),
  task('B', '10:20', 20, ['A']),
  task('M', '10:40', 0, ['B'], { kind: 'milestone' }),
  task('C', '10:40', 20, ['M']),
  task('D', '10:20', 10, ['A']),
];
const snap = (r: EventRecords, now: string) => computeSnapshot(r, at(now), 'me');
const view = (r: EventRecords, now: string, id: string) => snap(r, now).tasks.find((t) => t.id === id)!;
const act = (r: EventRecords, cmd: Parameters<typeof applyCommand>[1], now: string, by = 'me') => applyCommand(r, cmd, at(now), by);

describe('Ready and Up next', () => {
  it('a task is ready when every predecessor has finished and no constraint holds it', () => {
    expect(view(event(plan()), '10:00', 'A').flags.ready).toBe(true);
    expect(view(event(plan()), '09:55', 'A').flags.ready).toBe(false); // not before 10:00
    expect(view(event(plan()), '10:00', 'B').flags.ready).toBe(false);
  });

  it('a task is up next after its only unfinished predecessor, when that one is active', () => {
    const started = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:00').records;
    expect(view(started, '10:05', 'B').flags.upNextAfter).toBe('A');
    expect(view(started, '10:05', 'C').flags.upNextAfter).toBeUndefined(); // two steps away
  });

  it('a skipped predecessor counts as finished', () => {
    let r = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:00').records;
    r = act(r, { type: 'skip', taskIds: ['A'], reason: 'Not needed' }, '10:05').records;
    expect(view(r, '10:05', 'B').flags.ready).toBe(true);
  });
});

describe('Forecast, gap and RAG', () => {
  it('forecasts an on-plan event on time and Green', () => {
    const s = snap(event(plan()), '10:00');
    expect(s.forecast).toMatchObject({ forecastEnd: T('11:00'), gapMinutes: 0, rag: 'green' });
  });

  it('pushes the forecast when a task starts late, and never starts anything before now', () => {
    const s = snap(event(plan()), '10:10'); // A not started yet: it can only start now
    expect(s.forecast.forecastEnd).toBe(T('11:10'));
    expect(s.forecast.gapMinutes).toBe(10);
  });

  it('runs an active task for its duration from its actual start, or to now if longer', () => {
    const r = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:05').records;
    expect(view(r, '10:10', 'A').forecast.end).toBe(T('10:25'));
    expect(view(r, '10:30', 'A').forecast.end).toBe(T('10:30'));
  });

  it('keeps a pause: a paused task finishes its remaining minutes from now', () => {
    let r = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:00').records;
    r = act(r, { type: 'pause', taskIds: ['A'] }, '10:08').records; // 8 of 20 worked
    expect(view(r, '10:30', 'A').forecast.end).toBe(T('10:42'));
    r = act(r, { type: 'resume', taskIds: ['A'] }, '10:30').records;
    expect(view(r, '10:31', 'A').forecast.end).toBe(T('10:42'));
  });

  it.each([
    [0, 'green'],
    [-8, 'green'],
    [1, 'amber'],
    [15, 'amber'],
    [16, 'red'],
  ] as const)('a gap of %i minutes is %s', (gap, rag) => {
    expect(ragFor(gap, DEFAULT_SETTINGS)).toBe(rag);
  });

  it('gives each runbook its own forecast against its planned end', () => {
    const s = snap(event(plan()), '10:10');
    expect(s.runbooks[0]!.forecast.gapMinutes).toBe(10);
  });

  it('marks the critical path back from the latest finish', () => {
    const s = snap(event(plan()), '10:00');
    expect(s.tasks.filter((t) => t.flags.critical).map((t) => t.id).sort()).toEqual(['A', 'B', 'C', 'M']);
  });
});

describe('Flags', () => {
  it('blocked and has an issue come from open blockers and issues', () => {
    const r = event(plan(), {
      blockers: [{ id: 'b', number: 'BLK-1', title: 'x', severity: 'high', state: 'open', taskIds: ['B'], raisedAt: T('10:00') }],
      issues: [{ id: 'i', number: 'INC-1', title: 'y', severity: 'low', state: 'open', taskIds: ['D'], raisedAt: T('10:00') }],
    });
    expect(view(r, '10:00', 'B').flags.blocked).toBe(true);
    expect(view(r, '10:00', 'D').flags.hasIssue).toBe(true);
  });

  it('late to start once the planned start has passed; late to finish once past the planned end', () => {
    expect(view(event(plan()), '10:01', 'A').flags.lateToStart).toBe(true);
    const r = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:10').records;
    expect(view(r, '10:15', 'A').flags.lateToFinish).toBe(true); // forecast 10:30 > planned 10:20
  });

  it('a failed check is a checkpoint whose result is fail', () => {
    let r = event([task('K', '10:00', 10, [], { kind: 'checkpoint' })]);
    r = act(r, { type: 'start', taskIds: ['K'] }, '10:00').records;
    r = act(r, { type: 'record_result', taskIds: ['K'], result: 'fail' }, '10:05').records;
    expect(view(r, '10:05', 'K').flags.failedCheck).toBe(true);
    expect(view(r, '10:05', 'K').state).toBe('active'); // it stays in focus
  });
});

describe('Alerts and the next checkpoint', () => {
  it('raises nothing when the event is healthy, so the counter hides', () => {
    expect(snap(event(plan()), '10:00').alerts).toEqual([]);
  });

  it('raises an Amber forecast alert when a little late, and Red when very late', () => {
    expect(snap(event(plan()), '10:10').alerts).toEqual([expect.objectContaining({ kind: 'forecast', severity: 'amber', title: 'Forecast end is 10 minutes late' })]);
    expect(snap(event(plan()), '10:30').alerts[0]).toMatchObject({ severity: 'red', title: 'Forecast end is 30 minutes late' });
  });

  it('raises a Red alert for blockers, counting the tasks they hold', () => {
    const r = event(plan(), { blockers: [{ id: 'b', number: 'BLK-1', title: 'x', severity: 'high', state: 'open', taskIds: ['A'], raisedAt: T('10:00') }] });
    expect(snap(r, '10:00').alerts[0]).toMatchObject({ kind: 'blockers', severity: 'red', title: '1 blocker is holding 3 tasks' });
  });

  it('names the next checkpoint without a result, with its forecast against the plan', () => {
    const r = event([...plan(), task('G', '11:00', 10, ['C'], { kind: 'checkpoint' })]);
    const s = snap(r, '10:10');
    expect(s.nextCheckpoint).toMatchObject({ taskId: 'G', at: T('11:00') });
    expect(s.nextCheckpoint!.forecast.gapMinutes).toBe(10);
  });
});

describe('Commands', () => {
  it('Start makes a ready task active now, and refuses one that is not ready or is blocked', () => {
    const { records, result } = act(event(plan()), { type: 'start', taskIds: ['A', 'B'] }, '10:00');
    expect(result.applied).toEqual(['A']);
    expect(result.conflicts).toEqual([expect.objectContaining({ taskId: 'B', reason: 'not_ready', message: '1.1.B is not ready to start' })]);
    expect(records.tasks.find((t) => t.id === 'A')).toMatchObject({ state: 'active', actual: { start: T('10:00') } });
    const blocked = event(plan(), { blockers: [{ id: 'b', number: 'BLK-9', title: 'x', severity: 'high', state: 'open', taskIds: ['A'], raisedAt: T('10:00') }] });
    expect(act(blocked, { type: 'start', taskIds: ['A'] }, '10:00').result.conflicts[0]!.message).toBe('1.1.A is blocked by BLK-9');
  });

  it('Complete releases successors, finishes milestones by themselves and updates the forecast', () => {
    let r = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:00').records;
    r = act(r, { type: 'complete', taskIds: ['A'] }, '10:20').records;
    expect(view(r, '10:20', 'B').flags.ready).toBe(true);
    r = act(r, { type: 'start', taskIds: ['B'] }, '10:20').records;
    r = act(r, { type: 'complete', taskIds: ['B'] }, '10:45').records;
    expect(r.tasks.find((t) => t.id === 'M')).toMatchObject({ state: 'complete', actual: { end: T('10:45') } });
    expect(view(r, '10:45', 'C').flags.ready).toBe(true);
    expect(snap(r, '10:45').forecast.gapMinutes).toBe(5);
  });

  it('Complete can be back-dated, and a checkpoint cannot be completed without a result', () => {
    let r = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:00').records;
    r = act(r, { type: 'complete', taskIds: ['A'], at: T('10:18') }, '10:25').records;
    expect(r.tasks.find((t) => t.id === 'A')).toMatchObject({ actual: { end: T('10:18') }, completedAt: T('10:25') });
    let k = event([task('K', '10:00', 10, [], { kind: 'checkpoint' })]);
    k = act(k, { type: 'start', taskIds: ['K'] }, '10:00').records;
    expect(act(k, { type: 'complete', taskIds: ['K'] }, '10:05').result.conflicts[0]!.message).toBe('1.1.K needs a result');
  });

  it('Undo works for the 60-second linger, and is refused after it', () => {
    let r = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:00').records;
    r = act(r, { type: 'complete', taskIds: ['A'] }, '10:20').records;
    expect(view(r, '10:20', 'A').lingerUntil).toBe(T('10:21'));
    const undone = applyCommand(r, { type: 'undo_complete', taskIds: ['A'] }, new Date(Date.parse(T('10:20')) + 45_000), 'me');
    expect(undone.records.tasks.find((t) => t.id === 'A')).toMatchObject({ state: 'active', actual: { start: T('10:00') } });
    expect(act(r, { type: 'undo_complete', taskIds: ['A'] }, '10:22').result.conflicts[0]!.reason).toBe('linger_expired');
    expect(view(r, '10:22', 'A').lingerUntil).toBeUndefined();
  });

  it('Skip needs a reason', () => {
    expect(act(event(plan()), { type: 'skip', taskIds: ['A'], reason: ' ' }, '10:00').result.conflicts[0]!.reason).toBe('missing_reason');
  });

  it('a Pass result completes a checkpoint', () => {
    let r = event([task('K', '10:00', 10, [], { kind: 'checkpoint' })]);
    r = act(r, { type: 'start', taskIds: ['K'] }, '10:00').records;
    r = act(r, { type: 'record_result', taskIds: ['K'], result: 'pass_with_comment', comment: 'OK' }, '10:05').records;
    expect(r.tasks[0]).toMatchObject({ state: 'complete', result: { value: 'pass_with_comment', comment: 'OK' } });
  });

  it('bulk commands apply what they can and report the rest; a second person sees who acted first', () => {
    let r = act(event(plan()), { type: 'start', taskIds: ['A'] }, '10:00').records;
    r = act(r, { type: 'complete', taskIds: ['A'] }, '10:20', 'lc').records;
    r = act(r, { type: 'start', taskIds: ['B', 'D'] }, '10:20').records;
    const { result } = act(r, { type: 'complete', taskIds: ['A', 'B', 'D'] }, '10:30');
    expect(result.applied).toEqual(['B', 'D']);
    expect(result.conflicts).toEqual([expect.objectContaining({ taskId: 'A', message: '1.1.A was already completed by L. Chen at 10:20' })]);
  });

  it('writes every applied command to the event log, and leaves the input unchanged', () => {
    const before = event(plan());
    const { records } = act(before, { type: 'start', taskIds: ['A'] }, '10:00');
    expect(records.log).toEqual([{ at: T('10:00'), byId: 'me', source: 'command_centre', action: 'start', taskIds: ['A'] }]);
    expect(before.tasks[0]!.state).toBe('not_started');
    expect(before.log).toEqual([]);
  });
});

describe('settleMilestones', () => {
  it('leaves a milestone alone until its predecessors finish', () => {
    expect(settleMilestones(plan(), Date.parse(T('10:00'))).find((t) => t.id === 'M')!.state).toBe('not_started');
  });
});

describe('the fixtures', () => {
  it('weekend-payroll-cutover is the Command board: +12 Amber, three alerts, Go / No-Go at 05:45 forecast 05:57', () => {
    const f = weekendPayrollCutover();
    const s = computeSnapshot(f, new Date(f.startsAt), f.currentUserId);
    expect(s.forecast).toMatchObject({ forecastEnd: '2026-05-25T06:12:00Z', gapMinutes: 12, rag: 'amber' });
    expect(s.runbooks.map((r) => [r.forecast.forecastEnd.slice(11, 16), r.forecast.rag])).toEqual([['06:12', 'amber'], ['05:27', 'red'], ['05:40', 'green']]);
    expect(s.alerts.map((a) => a.kind)).toEqual(['blockers', 'failed_check', 'forecast']);
    expect(s.alerts.map((a) => a.severity)).toEqual(['red', 'red', 'amber']);
    expect(s.nextCheckpoint!.at).toBe('2026-05-25T05:45:00Z');
    expect(s.nextCheckpoint!.forecast.forecastEnd).toBe('2026-05-25T05:57:00Z');
    expect(s.progress).toMatchObject({ active: 3, blocked: 2, total: 124 });
    expect(s.tasks.find((t) => t.title === 'Application failover')!.forecast.end).toBe('2026-05-25T04:42:00Z');
  });

  it('healthy-event has no alerts', () => {
    const f = healthyEvent();
    const s = computeSnapshot(f, new Date(f.startsAt), f.currentUserId);
    expect([s.forecast.rag, s.alerts.length]).toEqual(['green', 0]);
  });

  it('badly-late-event is Red, with blockers and a failed check', () => {
    const f = badlyLateEvent();
    const s = computeSnapshot(f, new Date(f.startsAt), f.currentUserId);
    expect(s.forecast.rag).toBe('red');
    expect(s.alerts.every((a) => a.severity === 'red')).toBe(true);
    expect(s.alerts.map((a) => a.kind)).toEqual(['blockers', 'failed_check', 'forecast']);
  });
});
