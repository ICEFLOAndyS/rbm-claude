import type { RbmTimelineRunbook } from '../components/RbmTaskTimeline/RbmTaskTimeline';
import type { RbmTimelineTask } from '../components/RbmTaskTimeline/focusRule';
import { mockTaskStates, tasksNow } from './tasks';
import { at } from './eventRibbon';

/**
 * Mock focus set for the Task Timeline, after the Command board's page (E12345 Weekend Payroll
 * Cutover). It also holds tasks the focus rule hides, to show that it does.
 */
export function mockTimelineRunbooks(): RbmTimelineRunbook[] {
  return [
    {
      id: 'rb1', wbs: '1', name: 'Payroll cutover', recordId: 'RBK0000001', forecastEnd: at('06:12'), rag: 'amber', gapMinutes: 12,
      hidden: { complete: 83, notAvailable: 20 },
      stages: [
        { id: '1.3', wbs: '1.3', name: 'Application failover', start: at('02:00'), end: at('04:30'), state: 'active', complete: 4, total: 8 },
        { id: '1.4', wbs: '1.4', name: 'Verify', start: at('04:30'), end: at('05:30'), state: 'pending', complete: 0, total: 6 },
      ],
    },
    {
      id: 'rb2', wbs: '2', name: 'Interfaces', recordId: 'RBK0000002', forecastEnd: at('05:27'), rag: 'red', gapMinutes: 27,
      hidden: { complete: 0, notAvailable: 4 },
      stages: [{ id: '2.1', wbs: '2.1', name: 'Switch interfaces', start: at('03:00'), end: at('05:00'), state: 'active', complete: 2, total: 8 }],
    },
    {
      id: 'rb3', wbs: '3', name: 'Reporting', recordId: 'RBK0000003', forecastEnd: at('05:40'), rag: 'green', gapMinutes: 0,
      hidden: { complete: 0, notAvailable: 5 },
      stages: [{ id: '3.1', wbs: '3.1', name: 'Rebuild reports', start: at('04:00'), end: at('05:40'), state: 'pending', complete: 0, total: 5 }],
    },
  ];
}

export function mockTimelineTasks(): RbmTimelineTask[] {
  const s = Object.fromEntries(mockTaskStates().map((t) => [t.id, t]));
  return [
    { ...s['1.3.5']!, runbookId: 'rb1', stageId: '1.3', assignedToMe: true },
    { ...s['1.3.9']!, runbookId: 'rb1', stageId: '1.3', flags: { ready: true } },
    { ...s['1.3.6']!, runbookId: 'rb1', stageId: '1.3' },
    { ...s['1.3.10']!, runbookId: 'rb1', stageId: '1.3', flags: { upNextAfter: '1.3.5' } },
    { ...s['1.3.2']!, runbookId: 'rb1', stageId: '1.3', completedAt: new Date(tasksNow.getTime() - 18_000), tag: undefined },
    {
      id: '1.3.8', wbs: '1.3.8', title: 'Apply configuration patch', kind: 'task', state: 'pending', start: at('03:50'), startIsActual: false,
      plannedMinutes: 15, deltaMinutes: 20, tag: { kind: 'lateToStart' }, assignee: { name: 'Raj Patel' }, action: 'start',
      runbookId: 'rb1', stageId: '1.3', flags: { ready: true, lateToStart: true }, assignedToMe: true,
    },
    { ...s['1.4.3']!, runbookId: 'rb1', stageId: '1.4' },
    { ...s['1.4.2']!, runbookId: 'rb1', stageId: '1.4', flags: { blocked: true } },
    {
      id: '2.1.3', wbs: '2.1.3', title: 'Switch payroll interface', kind: 'task', state: 'active', start: at('03:00'), startIsActual: true,
      plannedMinutes: 60, deltaMinutes: 27, deltaIsForecast: true, tag: { kind: 'lateToFinish' }, assignee: { name: 'Lin Chen' }, action: 'complete',
      runbookId: 'rb2', stageId: '2.1', flags: { lateToFinish: true },
    },
    {
      id: '2.1.4', wbs: '2.1.4', title: 'Test payroll interface', kind: 'checkpoint', state: 'pending', start: at('04:27'), startIsActual: false,
      plannedMinutes: 20, tag: { kind: 'upNext', label: 'Up next · after 2.1.3' }, assignee: { name: 'Lin Chen' },
      runbookId: 'rb2', stageId: '2.1', flags: { upNextAfter: '2.1.3' },
    },
    // Hidden by the focus rule: complete long ago, and not started and not ready.
    { id: '1.3.1', wbs: '1.3.1', title: 'Freeze payroll', kind: 'task', state: 'complete', start: at('02:00'), startIsActual: true, plannedMinutes: 10, runbookId: 'rb1', stageId: '1.3', completedAt: at('02:10') },
    { id: '1.4.5', wbs: '1.4.5', title: 'Sign off', kind: 'milestone', state: 'pending', start: at('05:30'), startIsActual: false, plannedMinutes: 0, runbookId: 'rb1', stageId: '1.4' },
    { id: '3.1.1', wbs: '3.1.1', title: 'Rebuild reports', kind: 'task', state: 'pending', start: at('04:00'), startIsActual: false, plannedMinutes: 40, runbookId: 'rb3', stageId: '3.1' },
  ];
}

/** Seven tasks released by one completion: five show, then "+2 more". */
export function mockManyUpNext(): RbmTimelineTask[] {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `1.4.${10 + i}`, wbs: `1.4.${10 + i}`, title: `Verify interface ${i + 1}`, kind: 'task' as const, state: 'pending' as const,
    start: new Date(at('04:05').getTime() + i * 60_000), startIsActual: false, plannedMinutes: 10,
    tag: { kind: 'upNext' as const, label: 'Up next · after 1.3.6' }, runbookId: 'rb1', stageId: '1.4', flags: { upNextAfter: '1.3.6' },
  }));
}
