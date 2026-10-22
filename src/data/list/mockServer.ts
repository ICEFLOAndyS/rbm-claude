/**
 * The prototype's Events server: implements `ListData` over a fixture, in memory, with no network.
 * It behaves like the real one: search, filter, sort and paging run here, not in the page; saves are
 * checked, versioned and written to History; a stale save is a conflict; and every call can be slowed
 * (`latencyMs`) or made to fail, for the loading, error and no-access states.
 *
 * A ServiceNow source implementing `ListData` replaces it later. Delete this file then.
 */
import type { DeleteResult, ListData, RequestOptions } from './interfaces';
import { editableKeys, validateSection } from './recordSpec';
import { ENVIRONMENT_LABELS, EVENT_COLUMNS, STATE_LABELS, STATUS_LABELS, formatWhen, eventRecordSpec, eventSystemViews } from './events';
import {
  EMPTY_EVENT_FILTERS,
  ListDataError,
  type FieldChange,
  type ListFailureKind,
  type PersonRef,
  type EventColumnField,
  type EventEditable,
  type EventFilters,
  type EventListFixture,
  type EventQuery,
  type EventRecord,
  type EventRow,
  type EventView,
  type SaveResult,
  type SortItem,
} from './types';
import { buildEventRecord } from '../../fixtures/events/build';

export type EventListData = ListData<EventRow, EventFilters, EventColumnField, EventRecord, EventEditable>;
export type MockOperation = 'query' | 'readRecord' | 'saveSection' | 'listViews' | 'saveView' | 'deleteView' | 'exportCsv' | 'deleteRows';

export interface MockServerOptions {
  /** Pretend server time for every call, in ms. The demo sets it from ?latency=. */
  latencyMs?: number;
  /** Operations that always fail, for the error and no-access states. */
  fail?: Partial<Record<MockOperation, ListFailureKind>>;
  /** The server clock, for History. Defaults to the real time. */
  now?: () => Date;
}

/** The test and demo handles a real server does not have. */
export interface MockServerControls {
  setLatency(ms: number): void;
  /** The next call to `operation` fails once with `kind`. */
  failNext(operation: MockOperation, kind: ListFailureKind): void;
  /** Someone else saves a change, as if from another browser: bumps the version and writes History. */
  externalEdit(id: string, values: Partial<EventEditable>, by: PersonRef): EventRecord;
}

const MESSAGES: Record<ListFailureKind, string> = {
  failed: 'Could not load events.',
  noAccess: 'You do not have access to events.',
  notFound: 'This event no longer exists.',
};
const CONTACT = 'Ask your RBM administrator for the Event reader role.';

const words = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean);

function sortValue(row: EventRow, field: EventColumnField): string | number {
  switch (field) {
    case 'owner':
      return row.owner.name.toLowerCase();
    case 'name':
      return row.name.toLowerCase();
    default:
      return row[field];
  }
}

function display(key: keyof EventEditable, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'None';
  if (key === 'owner') return (value as PersonRef).name;
  if (key === 'environment') return ENVIRONMENT_LABELS[value as keyof typeof ENVIRONMENT_LABELS];
  if (key === 'windowStart' || key === 'windowEnd' || key === 'freezeAt' || key === 'rollbackBy') return formatWhen(value as string);
  return String(value);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A cell's text in the export: what the grid shows, with the owner's full name and the date and time. */
function exportValue(row: EventRow, field: EventColumnField): string {
  switch (field) {
    case 'status':
      return STATUS_LABELS[row.status];
    case 'state':
      return STATE_LABELS[row.state];
    case 'owner':
      return row.owner.name;
    case 'windowStart':
      return formatWhen(row.windowStart);
    default:
      return String(row[field]);
  }
}

/** RFC 4180: quote a cell holding a comma, quote or line break, doubling its quotes. */
const csvCell = (text: string) => (/[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

export function createMockEventServer(fixture: EventListFixture, options: MockServerOptions = {}): EventListData & MockServerControls {
  const spec = eventRecordSpec();
  const people = new Map(fixture.people.map((p) => [p.id, p]));
  const rows = fixture.rows.map((r) => structuredClone(r));
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const records = new Map(fixture.records.map((r) => [r.id, structuredClone(r)]));
  const systemViews = eventSystemViews();
  let userViews: EventView[] = fixture.views.map((v) => structuredClone(v));
  let latency = options.latencyMs ?? 0;
  const failing = { ...options.fail };
  const failOnce = new Map<MockOperation, ListFailureKind>();
  const now = options.now ?? (() => new Date());
  let refCount = 0;
  let viewCount = userViews.length;
  let historyCount = 0;

  /** Waits like a server, then fails if this operation is set to. Rejects at once on abort. */
  async function serve(operation: MockOperation, opts?: RequestOptions) {
    const { signal } = opts ?? {};
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    if (latency > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }, latency);
        const onAbort = () => {
          clearTimeout(timer);
          reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    }
    const kind = failOnce.get(operation) ?? failing[operation];
    failOnce.delete(operation);
    if (kind) throw failure(kind);
  }

  function failure(kind: ListFailureKind, message = MESSAGES[kind]) {
    refCount += 1;
    const reference = `REF-${now().toISOString().slice(0, 10).replaceAll('-', '')}-${String(refCount).padStart(4, '0')}`;
    return new ListDataError(kind, message, reference, kind === 'noAccess' ? CONTACT : undefined);
  }

  function record(id: string): EventRecord {
    let r = records.get(id);
    if (!r) {
      const row = rowById.get(id);
      if (!row) throw failure('notFound');
      r = buildEventRecord(row, rows);
      records.set(id, r);
    }
    return r;
  }

  function matches(row: EventRow, f: EventFilters, terms: string[]): boolean {
    if (f.status.length && !f.status.includes(row.status)) return false;
    if (f.owner.length && !f.owner.includes(row.owner.id)) return false;
    if (f.environment.length && !f.environment.includes(row.environment)) return false;
    if (!terms.length) return true;
    // Every word appears, in any order, ignoring case (the Task Timeline's search rule).
    const haystack = `${row.name} ${row.number} ${row.owner.name}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  }

  /** Writes values to a record as `by`, with a History entry. Returns the changes made. */
  function apply(r: EventRecord, sectionId: string, values: Partial<EventEditable>, by: PersonRef): FieldChange[] {
    const section = spec.groups.flatMap((g) => g.sections).find((s) => s.id === sectionId);
    const labels = new Map((section?.fields ?? []).map((f) => [f.key as string, f.label]));
    const changes: FieldChange[] = [];
    for (const [k, v] of Object.entries(values) as [keyof EventEditable, unknown][]) {
      if (same(r[k], v)) continue;
      changes.push({ field: k, label: labels.get(k) ?? k, from: display(k, r[k]), to: display(k, v) });
      (r as unknown as Record<string, unknown>)[k] = structuredClone(v);
    }
    if (!changes.length) return changes;
    const at = now().toISOString().replace(/\.\d{3}Z$/, 'Z');
    historyCount += 1;
    r.history.unshift({ id: `${r.id}-s${historyCount}`, at, by, sectionId, changes });
    r.version += 1;
    r.updatedAt = at;
    r.updatedBy = by;
    // Keep the grid row in step with the record.
    const row = rowById.get(r.id);
    if (row) Object.assign(row, { name: r.name, owner: r.owner, environment: r.environment, windowStart: r.windowStart, windowEnd: r.windowEnd });
    return changes;
  }

  /** The rows matching the filters, sorted. Shared by a page and an export, so they always agree. */
  function matching(filters: EventFilters, sort: SortItem<EventColumnField>[]): EventRow[] {
    const terms = words(filters.search);
    const found = rows.filter((r) => matches(r, filters, terms));
    // With no sort, rows keep the server's own order (the fixture's, so the board's rows come as drawn).
    // Ties keep it too, as Array.prototype.sort is stable.
    found.sort((a, b) => {
      for (const s of sort) {
        const x = sortValue(a, s.field);
        const y = sortValue(b, s.field);
        if (x !== y) return (x < y ? -1 : 1) * (s.direction === 'asc' ? 1 : -1);
      }
      return 0;
    });
    return found;
  }

  return {
    async exportCsv({ filters, sort, columns, ids }, opts) {
      await serve('exportCsv', opts);
      const defs = columns.map((f) => EVENT_COLUMNS.find((c) => c.field === f)).filter((c): c is (typeof EVENT_COLUMNS)[number] => !!c);
      // The selection is exported whatever the filters: rows stay selected across pages and filter changes.
      const chosen = ids ? new Set(ids) : null;
      const found = chosen ? matching(EMPTY_EVENT_FILTERS, sort).filter((r) => chosen.has(r.id)) : matching(filters, sort);
      const lines = [defs.map((c) => csvCell(c.header)), ...found.map((r) => defs.map((c) => csvCell(exportValue(r, c.field))))];
      return { filename: `events-${now().toISOString().slice(0, 10)}.csv`, csv: lines.map((l) => l.join(',')).join('\r\n') + '\r\n' };
    },

    async query(q: EventQuery, opts) {
      await serve('query', opts);
      const found = matching(q.filters, q.sort);
      const lastPage = Math.max(0, Math.ceil(found.length / q.pageSize) - 1);
      const page = Math.min(Math.max(0, Math.floor(q.page)), lastPage);
      return { rows: structuredClone(found.slice(page * q.pageSize, (page + 1) * q.pageSize)), total: found.length, page, pageSize: q.pageSize };
    },

    async readRecord(id, opts) {
      await serve('readRecord', opts);
      return structuredClone(record(id));
    },

    async saveSection(id, sectionId, values, baseVersion, opts): Promise<SaveResult<EventRecord>> {
      await serve('saveSection', opts);
      const r = record(id);
      const lock = r.permissions.locked[sectionId as keyof typeof r.permissions.locked];
      if (lock) throw failure('noAccess', lock.reason);
      if (r.version !== baseVersion) {
        const newer = r.history.filter((_, i) => i < r.version - baseVersion);
        return { kind: 'conflict', current: structuredClone(r), changes: newer.flatMap((h) => h.changes), by: r.updatedBy, at: r.updatedAt };
      }
      const allowed = new Set<string>(editableKeys(spec, sectionId));
      const errors: Record<string, string> = {};
      for (const k of Object.keys(values)) if (!allowed.has(k)) errors[k] = 'This field cannot be changed in this section.';
      if (values.owner && !people.has(values.owner.id)) errors.owner = 'Choose an owner from the list of people.';
      Object.assign(errors, validateSection(spec, sectionId, { ...r, ...values }));
      if (Object.keys(errors).length) return { kind: 'invalid', errors };
      apply(r, sectionId, values, people.get(fixture.currentUserId)!);
      return { kind: 'saved', record: structuredClone(r) };
    },

    async listViews(opts) {
      await serve('listViews', opts);
      return structuredClone([...systemViews, ...userViews]);
    },

    async saveView(view, opts) {
      await serve('saveView', opts);
      if (systemViews.some((v) => v.id === view.id)) throw failure('noAccess', 'System views cannot be changed. Save it as a new view.');
      const name = view.name.trim();
      if (!name) throw failure('failed', 'A view needs a name.');
      const existing = userViews.find((v) => v.id === view.id);
      const saved: EventView = { ...structuredClone(view), name, kind: 'user', id: existing ? view.id : `view-${++viewCount}` };
      userViews = existing ? userViews.map((v) => (v.id === saved.id ? saved : v)) : [...userViews, saved];
      return structuredClone(saved);
    },

    async deleteRows(ids, opts) {
      await serve('deleteRows', opts);
      // Confirmed by Andy Smith (22 Oct 2026): only events that have not started may be deleted; the rest are the audit trail.
      const result: DeleteResult = { deleted: [], refused: [] };
      for (const id of ids) {
        const row = rowById.get(id);
        if (!row) result.refused.push({ id, number: id, reason: 'This event no longer exists.' });
        else if (row.state !== 'not_started') result.refused.push({ id, number: row.number, reason: 'It has started, so it is part of the audit trail.' });
        else {
          rows.splice(rows.indexOf(row), 1);
          rowById.delete(id);
          records.delete(id);
          result.deleted.push(id);
        }
      }
      return result;
    },

    async deleteView(id, opts) {
      await serve('deleteView', opts);
      if (systemViews.some((v) => v.id === id)) throw failure('noAccess', 'System views cannot be deleted.');
      if (!userViews.some((v) => v.id === id)) throw failure('notFound', 'This view no longer exists.');
      userViews = userViews.filter((v) => v.id !== id);
    },

    setLatency(ms) {
      latency = ms;
    },
    failNext(operation, kind) {
      failOnce.set(operation, kind);
    },
    externalEdit(id, values, by) {
      const r = record(id);
      apply(r, Object.keys(values).some((k) => k.startsWith('window') || k === 'freezeAt' || k === 'rollbackBy') ? 'schedule' : 'details', values, by);
      return structuredClone(r);
    },
  };
}
