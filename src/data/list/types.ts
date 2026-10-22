/**
 * The List of records page: data contract (docs/list-data-model.md). Plain data, no React and no
 * MUI, so a ServiceNow source can fill it later. Times are ISO 8601 strings in UTC, as in
 * src/data/types.ts. The Events list is the worked example; the generic parts (query, page, views,
 * columns, record envelope, history, errors) are shared by every list.
 */
import type { RbmState } from '../../theme/tokens';
import type { EventState, IsoTime } from '../types';

export type { EventState, IsoTime };

/** A person as a list shows them. `name` is the full name; the grid shows "A. Smith". */
export interface PersonRef {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Event row (one grid row)
// ---------------------------------------------------------------------------

/** An event never skips, so its status is every task state but Skipped. */
export type EventStatus = Exclude<RbmState, 'skipped'>;
export const EVENT_STATUSES = ['active', 'atRisk', 'blocked', 'paused', 'pending', 'complete'] as const satisfies readonly EventStatus[];

/** The State column: the event state the Command Centre uses (src/data/types.ts), decided by Andy Smith, 22 Oct 2026. */
export const EVENT_STATES = ['not_started', 'active', 'paused', 'complete'] as const satisfies readonly EventState[];

/** The toolbar's Environment filter. Only Production is drawn; the others were agreed by Andy Smith, 22 Oct 2026. */
export type Environment = 'production' | 'preProduction' | 'test' | 'development';
export const ENVIRONMENTS = ['production', 'preProduction', 'test', 'development'] as const satisfies readonly Environment[];

export interface EventRow {
  /** Record key (sys_id later). */
  id: string;
  /** Event ID, "REV000001". */
  number: string;
  name: string;
  status: EventStatus;
  owner: PersonRef;
  state: EventState;
  /** Filtered on, not shown as a column. */
  environment: Environment;
  /** The Window column shows the start date ("24 Oct"). */
  windowStart: IsoTime;
  windowEnd: IsoTime;
}

// ---------------------------------------------------------------------------
// Query: filters, sort, paging
// ---------------------------------------------------------------------------

/** The toolbar's filters (search text, Status, Owner, Environment). Empty lists mean "any". */
export interface EventFilters {
  search: string;
  status: EventStatus[];
  /** Person ids. */
  owner: string[];
  environment: Environment[];
}

export const EMPTY_EVENT_FILTERS: EventFilters = { search: '', status: [], owner: [], environment: [] };

export type SortDirection = 'asc' | 'desc';
export interface SortItem<F extends string> {
  field: F;
  direction: SortDirection;
}

/** "Rows per page 25" is drawn; 50 and 100 are MUI's default choices (the agreed fallback). */
export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface ListQuery<Filters, F extends string> {
  filters: Filters;
  /** First item sorts first. Empty keeps the server's own order. */
  sort: SortItem<F>[];
  /** Zero-based (MUI's convention); the footer shows "1 to 25 of 128". */
  page: number;
  pageSize: PageSize;
}

/** One page of results from the server. `page` may differ from the one asked for (clamped to the last page). */
export interface ListPage<Row> {
  rows: Row[];
  /** Rows matching the filters, across every page. */
  total: number;
  page: number;
  pageSize: PageSize;
}

// ---------------------------------------------------------------------------
// Columns and saved views
// ---------------------------------------------------------------------------

/** How a column draws its value. The grid maps each kind to a cell; no list writes its own cells. */
export type ColumnKind = 'title' | 'recordNumber' | 'status' | 'person' | 'enum' | 'date';

/** The drawn columns, with Event ID added and Progress removed (Andy Smith, 22 Oct 2026). */
export type EventColumnField = 'number' | 'name' | 'status' | 'owner' | 'state' | 'windowStart';

export interface ColumnDef<F extends string> {
  field: F;
  header: string;
  kind: ColumnKind;
  sortable: boolean;
  /** False keeps the column on (for example the record's name). */
  hideable: boolean;
  width?: number;
  /** Labels for `enum` and `status` values. */
  labels?: Record<string, string>;
}

/** Column choice, order and widths: what the column chooser changes, and what a saved view keeps. */
export interface ColumnState<F extends string> {
  /** Visible columns, in order. */
  visible: F[];
  widths?: Partial<Record<F, number>>;
}

export interface SavedView<Filters, F extends string> {
  id: string;
  name: string;
  /** System views come with the list and cannot be changed or deleted; user views are the user's own. */
  kind: 'system' | 'user';
  filters: Filters;
  columns: ColumnState<F>;
  sort: SortItem<F>[];
}

export type EventQuery = ListQuery<EventFilters, EventColumnField>;
export type EventView = SavedView<EventFilters, EventColumnField>;
export type EventColumnState = ColumnState<EventColumnField>;

// ---------------------------------------------------------------------------
// Record (the panel)
// ---------------------------------------------------------------------------

/** A section the user may not edit carries the reason, shown beside the lock. */
export interface SectionLock {
  reason: string;
}

export interface RecordPermissions<SectionId extends string> {
  /** Read-only sections, with why. A section not listed may be edited if its spec allows. */
  locked: Partial<Record<SectionId, SectionLock>>;
}

export interface FieldChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

/** One save, written to History (the audit trail). */
export interface HistoryEntry {
  id: string;
  at: IsoTime;
  by: PersonRef;
  sectionId: string;
  changes: FieldChange[];
}

/** Fields every record carries, whatever its list. */
export interface RecordEnvelope<SectionId extends string> {
  id: string;
  number: string;
  /** Bumped by the server on every change; a save sends the version it started from. */
  version: number;
  permissions: RecordPermissions<SectionId>;
  history: HistoryEntry[];
  updatedAt: IsoTime;
  updatedBy: PersonRef;
}

// ---------------------------------------------------------------------------
// Event record (proposed, Not drawn: see docs/list-data-model.md)
// ---------------------------------------------------------------------------

export type EventSectionId = 'details' | 'schedule' | 'people' | 'linkedChanges' | 'attention' | 'upstream' | 'downstream' | 'changes';

export interface EventRole {
  role: string;
  person: PersonRef;
  response: 'accepted' | 'awaiting' | 'declined';
}

export interface LinkedChange {
  /** ServiceNow change request, "CHG0031207". */
  number: string;
  title: string;
  state: string;
}

export interface AttentionItem {
  /** Task WBS: runbook, stage, task ("2.3.5"). The task's identifier; the record shows no runbook or stage detail. */
  wbs: string;
  title: string;
  reason: 'blocked' | 'late' | 'atRisk' | 'hasIssue';
  detail: string;
}

export interface EventDependency {
  event: { id: string; number: string; name: string };
  status: EventStatus;
  /** Upstream: this event waits for it. Downstream: it waits for this event. */
  relationship: 'waitsFor' | 'runsWith';
}

/** What the server lets this user do from the footer. The page never decides. */
export type EventAction = 'startRun' | 'openCommandCentre';

export interface EventRecord extends RecordEnvelope<EventSectionId> {
  // Details (editable)
  name: string;
  description: string;
  environment: Environment;
  state: EventState;
  // Schedule (editable; locked while the event runs)
  windowStart: IsoTime;
  windowEnd: IsoTime;
  freezeAt: IsoTime | null;
  rollbackBy: IsoTime | null;
  // People and roles (owner editable)
  owner: PersonRef;
  roles: EventRole[];
  // Read-only facts
  status: EventStatus;
  progress: { percent: number; complete: number; total: number; blocked: number; atRisk: number; late: number };
  linkedChanges: LinkedChange[];
  attention: AttentionItem[];
  upstream: EventDependency[];
  downstream: EventDependency[];
  createdAt: IsoTime;
  actions: EventAction[];
}

/** The fields one section's Save sends. */
export type EventEditable = Pick<EventRecord, 'name' | 'description' | 'environment' | 'windowStart' | 'windowEnd' | 'freezeAt' | 'rollbackBy' | 'owner'>;

// ---------------------------------------------------------------------------
// Saving, conflicts and errors
// ---------------------------------------------------------------------------

export type SaveResult<R> =
  | { kind: 'saved'; record: R }
  /** Someone else changed the record since `baseVersion`. Nothing was written. */
  | { kind: 'conflict'; current: R; changes: FieldChange[]; by: PersonRef; at: IsoTime }
  /** The server refused the values; one message per field, saying what is wrong and why. */
  | { kind: 'invalid'; errors: Record<string, string> };

/** Where the panel is: kept in the address, so a link opens exactly where it was shared. */
export interface RecordLocation {
  recordId: string;
  groupId?: string;
  sectionId?: string;
}

export type ListFailureKind = 'failed' | 'noAccess' | 'notFound';

/**
 * A request that did not work. The page shows `message`, Retry (for `failed`), and `reference` for
 * support. For `noAccess`, `contact` says who to ask.
 */
export class ListDataError extends Error {
  constructor(
    readonly kind: ListFailureKind,
    message: string,
    readonly reference: string,
    readonly contact?: string,
  ) {
    super(message);
    this.name = 'ListDataError';
  }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

/**
 * A list fixture: JSON in src/fixtures/events/. `records` may hold fewer records than `rows` (the
 * large list holds none): the mock server builds any missing record from its row, the same way every
 * time.
 */
export interface EventListFixture {
  /** The prototype's "now". */
  now: IsoTime;
  currentUserId: string;
  people: PersonRef[];
  rows: EventRow[];
  records: EventRecord[];
  /** The user's own saved views. System views come from the list definition. */
  views: EventView[];
}
