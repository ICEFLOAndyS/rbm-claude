import type { RbmTask } from '../components/RbmTaskRow/RbmTaskRow';
import { at } from './eventRibbon';

/** "Now" in the Command board's "Acting on tasks" rows. */
export const tasksNow = at('03:41');

/** One row for each state, as drawn on the Command board ("Acting on tasks"). */
export function mockTaskStates(): RbmTask[] {
  return [
    {
      id: '1.3.5', wbs: '1.3.5', title: 'Startup application UI', kind: 'task', state: 'active',
      start: at('03:35'), startIsActual: true, plannedMinutes: 25,
      assignee: { name: 'Tom Baker' }, action: 'complete',
    },
    {
      id: '1.3.9', wbs: '1.3.9', title: 'Refresh test data', kind: 'task', state: 'pending',
      start: at('03:55'), startIsActual: false, plannedMinutes: 20,
      tag: { kind: 'readyToStart' }, assignee: { name: 'Karen Wells' }, action: 'start',
    },
    {
      id: '1.3.6', wbs: '1.3.6', title: 'Confirm UI is available', kind: 'checkpoint', state: 'active',
      start: at('04:00'), startIsActual: true, plannedMinutes: 5,
      tag: { kind: 'needsResult' }, assignee: { name: 'Raj Patel' }, action: 'result',
    },
    {
      id: '1.4.3', wbs: '1.4.3', title: 'Refresh reports', kind: 'task', state: 'paused',
      start: at('05:15'), startIsActual: false, plannedMinutes: 30,
      tag: { kind: 'paused', label: 'Paused by A. Smith' }, assignee: { name: 'Jo Nash' }, action: 'resume',
    },
    {
      id: '1.4.2', wbs: '1.4.2', title: 'Account reconciliation', kind: 'task', state: 'blocked',
      start: at('04:35'), startIsActual: false, plannedMinutes: 40,
      tag: { kind: 'blocked', label: 'Blocked by BLK-102' }, assignee: { name: 'Sam Dee' }, action: 'view',
    },
    {
      id: '1.3.10', wbs: '1.3.10', title: 'Notify service desk', kind: 'task', state: 'pending',
      start: at('04:00'), startIsActual: false, plannedMinutes: 5,
      tag: { kind: 'upNext', label: 'Up next · after 1.3.5' }, assignee: { name: 'Sam Dee' },
    },
    {
      id: '1.3.2', wbs: '1.3.2', title: 'Stop legacy jobs', kind: 'task', state: 'complete',
      start: at('03:20'), startIsActual: true, plannedMinutes: 15, deltaMinutes: 4,
      tag: { kind: 'complete', label: 'Complete · leaves in 0:42' }, assignee: { name: 'Mary O’Neill' }, action: 'undo',
    },
  ];
}

/** The three rows drawn in the Command board's "Task row" section, at 03:40. */
export function mockTaskRowExamples(): RbmTask[] {
  return [
    {
      id: '1.3.4', wbs: '1.3.4', title: 'Startup application services', kind: 'task', state: 'complete',
      start: at('03:05'), startIsActual: true, plannedMinutes: 30, deltaMinutes: 5, assignee: { name: 'Mary O’Neill' },
    },
    {
      id: '1.3.5', wbs: '1.3.5', title: 'Startup application UI', kind: 'task', state: 'active',
      start: at('03:35'), startIsActual: true, plannedMinutes: 25, assignee: { name: 'Tom Baker' },
    },
    {
      id: '1.3.7', wbs: '1.3.7', title: 'Run smoke tests', kind: 'task', state: 'pending',
      start: at('04:05'), startIsActual: true, plannedMinutes: 20, deltaMinutes: 8,
      tag: { kind: 'atRisk', label: 'Test data refresh slow' }, assignee: { name: 'Karen Wells' },
    },
  ];
}
