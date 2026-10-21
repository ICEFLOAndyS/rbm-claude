import { byStart, capUpNext, focusReasons, formatLinger, isInFocus, lingerLeft, type RbmTimelineTask } from './focusRule';

const now = new Date('2026-05-25T03:41:00Z');
const base: RbmTimelineTask = {
  id: 't', wbs: '1.3.9', title: 'Task', kind: 'task', state: 'pending',
  start: new Date('2026-05-25T04:00:00Z'), startIsActual: false, plannedMinutes: 10,
  runbookId: 'rb1', stageId: '1.3',
};
const t = (over: Partial<RbmTimelineTask>): RbmTimelineTask => ({ ...base, ...over });

describe('the focus rule', () => {
  it.each([
    ['1 · Active', t({ state: 'active' }), 'active'],
    ['2 · Ready to start', t({ flags: { ready: true } }), 'readyToStart'],
    ['3 · Up next', t({ flags: { upNextAfter: '1.3.5' } }), 'upNext'],
    ['4 · Blocked', t({ state: 'blocked' }), 'blocked'],
    ['5 · Has an issue', t({ flags: { hasIssue: true } }), 'hasIssue'],
    ['6 · Late to start', t({ flags: { ready: true, lateToStart: true } }), 'lateToStart'],
    ['7 · Late to finish', t({ state: 'active', flags: { lateToFinish: true } }), 'lateToFinish'],
    ['8 · At risk', t({ state: 'atRisk' }), 'atRiskOrPaused'],
    ['8 · Paused', t({ state: 'paused' }), 'atRiskOrPaused'],
    ['9 · Failed check', t({ kind: 'checkpoint', state: 'active', flags: { failedCheck: true } }), 'failedCheck'],
  ] as const)('shows %s', (_, task, reason) => {
    expect(focusReasons(task, now, 60)).toContain(reason);
  });

  it('hides a task that is not started and not ready, until a rule matches', () => {
    expect(isInFocus(t({}), now, 60)).toBe(false);
    expect(isInFocus(t({ flags: { hasIssue: true } }), now, 60)).toBe(true);
  });

  it('keeps a complete task for the linger, then hides it', () => {
    expect(isInFocus(t({ state: 'complete', completedAt: new Date(now.getTime() - 18_000) }), now, 60)).toBe(true);
    expect(isInFocus(t({ state: 'complete', completedAt: new Date(now.getTime() - 61_000) }), now, 60)).toBe(false);
    expect(isInFocus(t({ state: 'complete' }), now, 60)).toBe(false);
  });

  it('uses the linger time it is given (an Event Setting later)', () => {
    const done = t({ state: 'complete', completedAt: new Date(now.getTime() - 90_000) });
    expect(isInFocus(done, now, 60)).toBe(false);
    expect(isInFocus(done, now, 120)).toBe(true);
  });

  it('never shows a skipped task', () => {
    expect(isInFocus(t({ state: 'skipped', flags: { hasIssue: true } }), now, 60)).toBe(false);
  });

  it('lists every reason when a task matches several', () => {
    expect(focusReasons(t({ state: 'active', flags: { hasIssue: true, lateToFinish: true } }), now, 60)).toEqual(['active', 'hasIssue', 'lateToFinish']);
  });
});

describe('linger', () => {
  it('counts down the seconds left as "leaves in 0:42"', () => {
    const done = t({ state: 'complete', completedAt: new Date(now.getTime() - 18_000) });
    expect(lingerLeft(done, now, 60)).toBe(42);
    expect(formatLinger(42)).toBe('0:42');
    expect(formatLinger(75)).toBe('1:15');
  });
});

describe('sorting', () => {
  it('sorts by start time, never by severity, with WBS breaking ties', () => {
    const a = t({ id: 'a', wbs: '1.3.10', start: new Date('2026-05-25T04:00:00Z') });
    const b = t({ id: 'b', wbs: '1.3.9', start: new Date('2026-05-25T04:00:00Z'), state: 'blocked' });
    const c = t({ id: 'c', wbs: '1.3.2', start: new Date('2026-05-25T03:00:00Z') });
    expect([a, b, c].sort(byStart).map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('capUpNext', () => {
  const released = Array.from({ length: 8 }, (_, i) => t({ id: `u${i}`, wbs: `1.4.${i}`, flags: { upNextAfter: '1.3.5' } }));

  it('shows five tasks released by one completion, and counts the rest', () => {
    const { shown, more } = capUpNext(released, new Set());
    expect(shown).toHaveLength(5);
    expect(more.get('1.3.5')).toBe(3);
  });

  it('shows them all once expanded', () => {
    expect(capUpNext(released, new Set(['1.3.5'])).shown).toHaveLength(8);
  });

  it('never caps a task that is in focus for another reason', () => {
    const late = [...released, t({ id: 'late', wbs: '1.4.9', flags: { upNextAfter: '1.3.5', lateToStart: true } })];
    expect(capUpNext(late, new Set()).shown.map((x) => x.id)).toContain('late');
  });
});
