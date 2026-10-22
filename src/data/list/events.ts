/**
 * The Events list: its columns, system views, default sort and record spec.
 *
 * The list follows the Page templates board ("1 · List of records") with Runbooks replaced by
 * Events (Andy Smith, 22 Oct 2026): an Event ID column (REV000001) is added, Progress is removed and
 * Phase is called State and shows the Command Centre's event state. Nothing else is added. The record spec is **Not drawn**: the List to record boards only
 * show a task. It takes the shape of the task example and the record drawn on the Single record
 * template (Overview, Tasks, Dependencies, History; Schedule with Freeze and Rollback by; Details;
 * People and roles; Linked changes). Its fields were agreed as proposed.
 */
import { status as statusTokens } from '../../theme/tokens';
import { defineRecordSpec, type RecordSpec } from './recordSpec';
import { formatWindow, shortName } from './format';
import type {
  ColumnDef,
  ColumnState,
  Environment,
  EventColumnField,
  EventFilters,
  EventState,
  EventRecord,
  EventSectionId,
  EventStatus,
  EventView,
} from './types';
import { EMPTY_EVENT_FILTERS, EVENT_STATUSES } from './types';

/** The Command Centre's labels for the event state (its page header pill). */
export const STATE_LABELS: Record<EventState, string> = { not_started: 'Not started', active: 'Active', paused: 'Paused', complete: 'Complete' };
export const ENVIRONMENT_LABELS: Record<Environment, string> = { production: 'Production', preProduction: 'Pre-production', test: 'Test', development: 'Development' };
/**
 * The grid's status labels, as drawn on the board. "In progress" and "Pending" differ from the
 * library's defaults ("Active", "Not started"); the other labels are the library's.
 */
export const STATUS_LABELS: Record<EventStatus, string> = { ...(Object.fromEntries(EVENT_STATUSES.map((s) => [s, statusTokens[s].label])) as Record<EventStatus, string>), active: 'In progress', pending: 'Pending' };

export { shortName, formatWhen, formatWindow } from './format';

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

/** The board's columns, in the board's order, with Event ID first. */
export const EVENT_COLUMNS: readonly ColumnDef<EventColumnField>[] = [
  { field: 'number', header: 'Event ID', kind: 'recordNumber', sortable: true, hideable: true, width: 120 },
  { field: 'name', header: 'Event', kind: 'title', sortable: true, hideable: false, width: 280 },
  { field: 'status', header: 'Status', kind: 'status', sortable: true, hideable: true, width: 140, labels: STATUS_LABELS },
  { field: 'owner', header: 'Owner', kind: 'person', sortable: true, hideable: true, width: 140 },
  { field: 'state', header: 'State', kind: 'enum', sortable: true, hideable: true, width: 120, labels: STATE_LABELS },
  { field: 'windowStart', header: 'Window', kind: 'date', sortable: true, hideable: true, width: 110 },
];

export const DEFAULT_EVENT_COLUMNS: ColumnState<EventColumnField> = { visible: EVENT_COLUMNS.map((c) => c.field) };

/**
 * System views. "Active" is drawn ("View: Active") and is the default. "All events" is the one more
 * a user needs to see everything (Not drawn). Active means every status except Complete.
 */
export function eventSystemViews(): EventView[] {
  const base = { kind: 'system' as const, columns: DEFAULT_EVENT_COLUMNS, sort: [] };
  const filters = (f: Partial<EventFilters>): EventFilters => ({ ...EMPTY_EVENT_FILTERS, ...f });
  return [
    { ...base, id: 'active', name: 'Active', filters: filters({ status: EVENT_STATUSES.filter((s) => s !== 'complete') }) },
    { ...base, id: 'all', name: 'All events', filters: filters({}) },
  ];
}
export const DEFAULT_EVENT_VIEW_ID = 'active';

// ---------------------------------------------------------------------------
// Record spec (Proposed, Not drawn)
// ---------------------------------------------------------------------------

const options = <T extends string>(labels: Record<T, string>) => Object.entries(labels).map(([value, label]) => ({ value, label: label as string }));
const RUNNING: EventStatus[] = ['active', 'atRisk', 'blocked', 'paused'];
export const isRunning = (s: EventStatus) => RUNNING.includes(s);

function attention(r: EventRecord): string {
  const p = r.progress;
  const parts = [p.blocked && `${p.blocked} blocked`, p.atRisk && `${p.atRisk} at risk`, p.late && `${p.late} late`].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'None';
}

export function eventRecordSpec(timeZone = 'UTC'): RecordSpec<EventRecord, EventSectionId> {
  return defineRecordSpec<EventRecord, EventSectionId>({
    noun: 'event',
    number: (r) => r.number,
    title: (r) => r.name,
    status: (r) => ({ state: r.status }),
    summary: [
      { label: 'Owner', value: (r) => shortName(r.owner) },
      { label: 'Window', value: (r) => formatWindow(r.windowStart, r.windowEnd, timeZone) },
      { label: 'Progress', value: (r) => `${r.progress.percent}% · ${r.progress.complete} of ${r.progress.total} tasks` },
      { label: 'Attention', value: attention },
    ],
    groups: [
      {
        id: 'overview',
        label: 'Overview',
        sections: [
          {
            id: 'details',
            label: 'Details',
            editable: true,
            fields: [
              { key: 'name', label: 'Name', kind: 'text', required: true },
              { key: 'description', label: 'Description', kind: 'longText' },
              { key: 'environment', label: 'Environment', kind: 'enum', required: true, options: options(ENVIRONMENT_LABELS) },
              { key: 'state', label: 'State', kind: 'enum', readOnly: true, format: (r) => STATE_LABELS[r.state], help: 'Changed by running the event in the Command Centre.' },
              { key: 'number', label: 'Event ID', kind: 'recordNumber', readOnly: true },
              { key: 'createdAt', label: 'Created', kind: 'dateTime', readOnly: true },
            ],
            validate: (d) => ({ name: d.name.trim().length > 80 ? 'Name must be 80 characters or fewer, so it fits in lists.' : undefined }),
          },
          {
            id: 'schedule',
            label: 'Schedule',
            editable: true,
            fields: [
              { key: 'windowStart', label: 'Start', kind: 'dateTime', required: true },
              { key: 'windowEnd', label: 'End', kind: 'dateTime', required: true },
              { key: 'freezeAt', label: 'Freeze', kind: 'dateTime', help: 'Changes stop at this time.' },
              { key: 'rollbackBy', label: 'Rollback by', kind: 'dateTime', help: 'The last time a rollback can start.' },
            ],
            validate: (d) => {
              const start = Date.parse(d.windowStart);
              const end = Date.parse(d.windowEnd);
              return {
                windowEnd: end <= start ? 'End must be after the start, or the event has no time to run.' : undefined,
                freezeAt: d.freezeAt && Date.parse(d.freezeAt) > start ? 'Freeze must be at or before the start, so changes stop before the run begins.' : undefined,
                rollbackBy: d.rollbackBy && (Date.parse(d.rollbackBy) < start || Date.parse(d.rollbackBy) > end) ? 'Rollback by must fall inside the window, so there is time to roll back.' : undefined,
              };
            },
          },
          {
            id: 'people',
            label: 'People and roles',
            editable: true,
            fields: [{ key: 'owner', label: 'Owner', kind: 'person', required: true }],
            table: {
              key: 'roles',
              columns: [
                { key: 'role', label: 'Role', kind: 'text' },
                { key: 'person', label: 'Assignee', kind: 'person' },
                { key: 'response', label: 'Response', kind: 'enum' },
              ],
              empty: 'No other roles assigned.',
            },
            note: (r) => `${r.roles.length + 1} people`,
          },
          {
            id: 'linkedChanges',
            label: 'Linked changes',
            table: {
              key: 'linkedChanges',
              columns: [
                { key: 'number', label: 'Change', kind: 'recordNumber' },
                { key: 'title', label: 'Title', kind: 'text' },
                { key: 'state', label: 'State', kind: 'text' },
              ],
              empty: 'No linked changes.',
            },
          },
        ],
      },
      {
        id: 'tasks',
        label: 'Tasks',
        count: (r) => r.progress.total,
        alert: (r) => (r.progress.blocked ? `${r.progress.blocked} ${r.progress.blocked === 1 ? 'task is' : 'tasks are'} blocked` : null),
        sections: [
          {
            id: 'attention',
            label: 'Needs attention',
            note: (r) => (r.attention.length ? `${r.attention.length} tasks` : null),
            table: {
              key: 'attention',
              columns: [
                { key: 'wbs', label: 'WBS', kind: 'text' },
                { key: 'title', label: 'Task', kind: 'text' },
                { key: 'reason', label: 'Why', kind: 'status' },
                { key: 'detail', label: 'Detail', kind: 'text' },
              ],
              empty: 'Nothing needs attention.',
            },
          },
        ],
      },
      {
        id: 'dependencies',
        label: 'Dependencies',
        count: (r) => r.upstream.length + r.downstream.length,
        alert: (r) => (r.upstream.some((d) => d.status === 'blocked') ? 'Waits for a blocked event' : null),
        sections: [
          {
            id: 'upstream',
            label: 'Waits for',
            note: (r) => {
              const n = r.upstream.filter((d) => d.status === 'blocked').length;
              return n ? `${n} blocked` : null;
            },
            table: {
              key: 'upstream',
              columns: [
                { key: 'event', label: 'Event', kind: 'text' },
                { key: 'relationship', label: 'Relationship', kind: 'enum' },
                { key: 'status', label: 'Status', kind: 'status' },
              ],
              empty: 'This event waits for no other event.',
            },
          },
          {
            id: 'downstream',
            label: 'Needed by',
            table: {
              key: 'downstream',
              columns: [
                { key: 'event', label: 'Event', kind: 'text' },
                { key: 'relationship', label: 'Relationship', kind: 'enum' },
                { key: 'status', label: 'Status', kind: 'status' },
              ],
              empty: 'No other event waits for this one.',
            },
          },
        ],
      },
      {
        id: 'history',
        label: 'History',
        count: (r) => r.history.length,
        sections: [{ id: 'changes', label: 'Changes', history: true }],
      },
    ],
    primaryAction: (r) => (r.actions.includes('startRun') ? { id: 'startRun', label: 'Start run' } : r.actions.includes('openCommandCentre') ? { id: 'openCommandCentre', label: 'Open Command Centre' } : null),
  });
}
