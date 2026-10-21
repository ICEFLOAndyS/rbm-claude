import { actionFor, displayState, tagFor, toHotTopics, toRibbon, toTimeline, toVitals } from './adapters';
import { computeSnapshot } from '../engine/engine';
import { weekendPayrollCutover, healthyEvent } from '../fixtures/build';

const f = weekendPayrollCutover();
const s = computeSnapshot(f, new Date(f.startsAt), f.currentUserId);
const task = (wbs: string) => s.tasks.find((t) => t.wbs === wbs)!;

describe('adapters', () => {
  it('turns the forecast and start into the Event vitals', () => {
    const v = toVitals(s);
    expect(v.forecast).toMatchObject({ rag: 'amber', gapMinutes: 12 });
    expect(v.forecast.end.toISOString()).toBe('2026-05-25T06:12:00.000Z');
    expect(v.start).toMatchObject({ elapsedMinutes: 340, plannedMinutes: 480 });
    expect(v.issues).toEqual({ high: 1, medium: 3, low: 1 });
  });

  it('gives each row one tag, most pressing first', () => {
    expect(tagFor(task('1.4.2'), s)).toEqual({ kind: 'blocked', label: 'Blocked by BLK-102' });
    expect(tagFor(task('1.3.17'), s)).toEqual({ kind: 'failedCheck' });
    expect(tagFor(task('1.3.16'), s)).toEqual({ kind: 'issue', label: 'Issue INC-104' });
    expect(tagFor(task('1.3.19'), s)).toEqual({ kind: 'atRisk', label: 'Test data refresh slow' });
    expect(tagFor(task('1.3.18'), s)).toEqual({ kind: 'lateToStart' });
    expect(tagFor(task('1.1.1'), s)).toBeUndefined(); // complete
  });

  it('offers the one next step the engine allows', () => {
    expect(actionFor(task('1.3.18'), s)).toBe('start');
    expect(actionFor(task('1.3.16'), s)).toBe('complete');
    expect(actionFor(task('1.3.17'), s)).toBe('result');
    expect(actionFor(task('1.4.2'), s)).toBe('view');
    expect(actionFor(task('1.4.5'), s)).toBeUndefined();
  });

  it('shows blocked and at-risk tasks with their own marks', () => {
    expect(displayState(task('1.4.2'))).toBe('blocked');
    expect(displayState(task('1.3.19'))).toBe('atRisk');
    expect(displayState(task('1.3.16'))).toBe('active');
  });

  it('counts the hidden work honestly for each runbook band', () => {
    const { runbooks, tasks } = toTimeline(s);
    expect(tasks).toHaveLength(124);
    const rb1 = runbooks.find((r) => r.recordId === 'RBK0000001')!;
    expect(rb1.hidden.complete).toBe(s.tasks.filter((t) => t.runbookId === rb1.id && t.state === 'complete').length);
    expect(rb1.forecastEnd.toISOString()).toBe('2026-05-25T06:12:00.000Z');
  });

  it('gives the ribbon one lane per runbook, with milestones and checkpoints as markers', () => {
    const lanes = toRibbon(s);
    expect(lanes.map((l) => l.name)).toEqual(['Payroll cutover', 'Interfaces', 'Reporting']);
    expect(lanes[0]!.markers!.find((m) => m.name === 'Application failover')!.at.toISOString()).toBe('2026-05-25T04:42:00.000Z');
  });

  it('fills the Hot-topics strip, and follows the runbook filter', () => {
    const all = toHotTopics(s);
    expect(all.blockers.map((b) => b.recordId)).toEqual(['BLK-102', 'BLK-202']);
    expect(all.nextCheckpoint).toMatchObject({ title: 'Go / No-Go', gapMinutes: 12, call: { open: true, joined: 4 } });
    expect(all.collaboration).toMatchObject({ live: true });
    expect(all.collaboration.people).toHaveLength(7);
    expect(all.milestones[0]).toMatchObject({ title: 'Data extracted', state: 'complete' });
    const interfaces = toHotTopics(s, ['rb-2']);
    expect(interfaces.blockers.map((b) => b.recordId)).toEqual(['BLK-202']);
    expect(interfaces.nextCheckpoint).toBeUndefined();
  });

  it('a healthy event has no blockers and a closed checkpoint call that says when it opens', () => {
    const h = healthyEvent();
    const hs = computeSnapshot(h, new Date(h.startsAt), h.currentUserId);
    const hot = toHotTopics(hs);
    expect(hot.blockers).toEqual([]);
    expect(hot.nextCheckpoint!.call).toMatchObject({ open: false });
    expect(hot.nextCheckpoint!.call!.opensAt!.toISOString()).toBe('2026-05-25T05:30:00.000Z');
  });
});
