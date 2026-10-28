# List of records page: data contract

Status: **proposed, for review** (22 Oct 2026). Nothing is built on it yet. Brief: [list-page-brief.md](briefs/list-page-brief.md), section 8.

**The list is the Page templates board's "1 · List of records", with Runbooks replaced by Events** (Andy Smith, 22 Oct 2026). Keep it simple and faithful to the drawing. The only changes:
- An **Event ID** column (REVnnnnnn, for example REV000001) is added.
- **Progress** is removed.
- **Phase** is called **State**.

Nothing else is added to the drawn list. The record panel's fields are as agreed earlier.

**Context** (as in the Command Centre data model): an Event holds one or more Runbooks, a Runbook one or more Stages, and a Stage one or more Tasks (WBS 1.3.5). The Command Centre shows one Event. The list of events shows no runbook or stage information (Andy Smith, 22 Oct 2026); a task in Needs attention is named by its WBS only.

The types are in `src/data/list/types.ts`, the record spec in `src/data/list/recordSpec.ts`, the interfaces in `src/data/list/interfaces.ts`, and the Events list (columns, views, record spec) in `src/data/list/events.ts`. No file in `src/data/list` imports React, MUI or MUI X. The grid maps this contract onto MUI X inside `RbmDataGrid`.

Times are ISO 8601 strings in UTC, as in the Command Centre data model ([data-model.md](data-model.md)).

## 1. Event row (one grid row)

| Field | Type | Column | Notes |
| --- | --- | --- | --- |
| `id` | string | | Record key (sys_id later) |
| `number` | `REV000001` | **Event ID** | Added to the drawing |
| `name` | string | **Event** | The board's Runbook column |
| `status` | `active`, `atRisk`, `blocked`, `paused`, `pending`, `complete` | **Status** | Dot and label, labelled as drawn: In progress, At risk, Blocked, Paused, Pending, Complete |
| `owner` | `{ id, name }` | **Owner** | Shown as "A. Smith" |
| `state` | `not_started`, `active`, `paused`, `complete` | **State** | The board's Phase column, showing the Command Centre's event state (`EventState`), labelled Not started, Active, Paused, Complete. It follows the status: Pending is Not started; In progress, At risk and Blocked are Active |
| `windowStart`, `windowEnd` | ISO | **Window** | Shows the start date ("24 Oct") |
| `environment` | `production`, `preProduction`, `test`, `development` | none | For the drawn Environment filter. Production, Pre-production, Test, Development (agreed) |

## 2. Query, page, columns, views

```ts
interface EventFilters { search: string; status: EventStatus[]; owner: string[]; environment: Environment[] }  // the drawn toolbar; empty = any
interface ListQuery<Filters, F> { filters: Filters; sort: { field: F; direction: 'asc' | 'desc' }[]; page: number /* 0-based */; pageSize: 25 | 50 | 100 }
interface ListPage<Row> { rows: Row[]; total: number; page: number; pageSize: PageSize }   // the server may clamp `page`
interface ColumnDef<F> { field: F; header: string; kind: ColumnKind; sortable; hideable; width?; labels? }
interface ColumnState<F> { visible: F[] /* in order */; widths?: Partial<Record<F, number>> }
interface SavedView<Filters, F> { id; name; kind: 'system' | 'user'; filters; columns: ColumnState<F>; sort }
```

- **Columns, in order:** Event ID, Event, Status, Owner, State, Window. The column chooser (a drawn slot) can hide any of them except Event.
- **Column kinds:** `title`, `recordNumber`, `status`, `person`, `enum`, `date`. The grid has one cell per kind.
- **Search** ("Search events"): name, Event ID and owner. A row matches when every word appears, in any order, ignoring case.
- **Sort:** none by default, so rows come in the server's order (the board's order in the fixture). A column header sorts on the server.
- **Page size:** 25, as drawn. The other choices, 50 and 100, are MUI's defaults.
- **Views:** Active, as drawn ("View: Active"), is the default and hides Complete events. All events is the only other system view (Not drawn). A user's own views follow them.

## 3. Record spec (`RbmRecord`)

```ts
interface RecordSpec<R, S extends string> {
  noun: string;                                   // "event"
  number(r): string; title(r): string; status(r): { state: RbmState; label? };
  summary: AtMost4<{ label; value(r): string }>;  // compile error past four
  groups: AtMost4<GroupSpec<R, S>>;               // compile error past four, or none
  primaryAction?(r): { id; label } | null;        // the footer's action
}
interface GroupSpec<R, S> { id; label /* ≤ 14 chars, checked by test */; count?(r): number; alert?(r): string | null; sections: AtMost5<SectionSpec<R, S>> }
interface SectionSpec<R, S> {
  id: S; label;
  fields?: { key: keyof R; label; kind: FieldKind; required?; readOnly?; format?(r); options?; help? }[];
  table?: { key: keyof R; columns; empty: string };   // read-only
  history?: boolean;                                  // draws the audit trail
  editable?: boolean;                                 // its own Edit; leave out for derived sections
  validate?(draft: R): { [field]: message };          // what is wrong and why
  note?(r): string | null;                            // "1 blocked", "3 people"
  subsections?: AtMost5<SubsectionSpec>;              // a subsection cannot hold subsections
}
```

- **Compile errors** (proved by `@ts-expect-error` tests): five groups, six sections, five summary facts, no groups, a second level of nesting, or a field key the record does not have.
- **Test checks** (`checkRecordSpec`): tab labels over 14 characters, repeated ids, an editable section with nothing to edit.
- **`validateSection`** runs the required fields and the section's rules. The panel runs it as the user types (Save stays disabled until it passes), and the server runs it again on save.
- The alert text is the alert dot's accessible name, so the dot is never colour alone.

## 4. Event record (agreed as proposed; Not drawn)

The List to record boards only draw a task. This follows the task example's shape and the record drawn on the **Single record** template (tabs Overview, Tasks 124, Dependencies 9, History; Schedule with Freeze and Rollback by; Details; People and roles; Linked changes).

**Header:** number, name, status. **Summary strip (4):** Owner "A. Smith" · Window "24 Oct 22:00 – 25 Oct 06:00" · Progress "68% · 84 of 124 tasks" (as on the Single record board; the list has no Progress) · Attention "2 blocked · 1 at risk" (or "None").

| Tab | Count | Alert dot | Sections | Edit |
| --- | --- | --- | --- | --- |
| **Overview** | none | none | **Details:** Name\*, Description, Environment\*, State\*, plus Event ID and Created (read-only) | Yes |
| | | | **Schedule:** Start\*, End\*, Freeze, Rollback by | Yes; locked while running |
| | | | **People and roles:** Owner\*, then a Role, Assignee, Response table | Owner only |
| | | | **Linked changes:** Change, Title, State | No |
| **Tasks** | total tasks | "2 tasks are blocked" | **Needs attention:** WBS, Task, Why, Detail | No (tasks are changed in the Task Timeline or the task's own record) |
| **Dependencies** | upstream + downstream | "Waits for a blocked event" | **Waits for**, **Needed by:** Event, Relationship, Status | No |
| **History** | entries | none | **Changes:** the audit trail (who, when, what changed) | No |

**Validation messages:**
- Name is required.
- Name must be 80 characters or fewer, so it fits in lists.
- End must be after the start, or the event has no time to run.
- Freeze must be at or before the start, so changes stop before the run begins.
- Rollback by must fall inside the window, so there is time to roll back.

**Footer action (from the server):**
- Not started: **Start run**.
- Active, At risk, Blocked or Paused: **Open Command Centre**.
- Complete: none.

**Locks (from the server, shown with the reason):**
- Running events lock Schedule: "The window cannot change while the event is running. Ask the Event Manager."
- Complete events lock Details, Schedule and People: "Complete events are read-only. Ask an Event Manager to reopen it."

## 5. Record envelope, saving and errors

Every record carries `id`, `number`, `version`, `permissions.locked` (section to `{ reason }`), `history` (newest first: `{ id, at, by, sectionId, changes: { field, label, from, to }[] }`), `updatedAt` and `updatedBy`.

```ts
type SaveResult<R> =
  | { kind: 'saved'; record: R }
  | { kind: 'conflict'; current: R; changes: FieldChange[]; by: PersonRef; at: IsoTime }  // nothing written
  | { kind: 'invalid'; errors: Record<string, string> };
class ListDataError extends Error { kind: 'failed' | 'noAccess' | 'notFound'; reference: string; contact?: string }
interface RecordLocation { recordId; groupId?; sectionId? }   // what the address holds (deep link)
```

A locked section's save is refused with `noAccess` and the lock's reason. Field values in History are display text ("24 Oct 22:00", "Readiness").

## 6. Interfaces

```ts
interface ListData<Row, Filters, F, R, Editable> {
  query(query, { signal? }): Promise<ListPage<Row>>;
  readRecord(id, { signal? }): Promise<R>;
  saveSection(id, sectionId, values: Partial<Editable>, baseVersion, { signal? }): Promise<SaveResult<R>>;
  listViews({ signal? }): Promise<SavedView[]>;
  saveView(view, { signal? }): Promise<SavedView>;   // new, or replaces a user view
  deleteView(id, { signal? }): Promise<void>;
  exportCsv({ filters, sort, columns }, { signal? }): Promise<{ filename; csv }>;   // every matching row, built by the server (22 Oct 2026)
}
interface ListPreferenceStore<F> { get(); set(p); reset() }   // async, as LayoutPreferenceStore
interface ListPreference<F> { panel: 'slideIn' | 'wide'; columns: ColumnState<F> | null; lastViewId: string | null; pageSize }
```

Every request takes an `AbortSignal`, so the `RbmBusy` Cancel stops the wait. The preference store keeps one key per list in localStorage, and drops anything unknown or broken part by part.

## 7. Mock server and fixtures

`createMockEventServer(fixture, { latencyMs, fail, now })` implements `ListData` in memory:
- **Query:** search, filter, sort and paging, clamped to the last page.
- **Saves:** checks and version, History entry, and updates the grid row.
- **Conflicts:** a stale `baseVersion`.
- **Failures:** `failed`, `noAccess` and `notFound`, each with a reference such as `REF-20261025-0001`.
- **Test and demo handles:** `setLatency`, `failNext(op, kind)`, and `externalEdit(id, values, by)` (someone else saves, for the conflict alert).

The 15,000-row query takes about 170 ms in jsdom.

| Fixture | Rows | Records | Committed |
| --- | --- | --- | --- |
| `events-board` | the board's 8, as drawn, in the board's order | 8 | yes |
| `events-128` | the board's 8 (REV000001–8), the Command Centre's 4 (REV000009–12), then 116 seeded; one user view "Production at risk" | built on demand | yes |
| `events-large` | the board's 8, the Command Centre's 4, then 14,988 seeded | built on demand | no (`npm run fixtures`) |
| `events-empty` | 0 | 0 | yes |
| error, no access | any fixture with `fail: { query: 'failed' \| 'noAccess' }` | | |

Records are built from their row by `buildEventRecord`, the same way every time, so a record is the same whether it came from a file or was built on demand. With records, the 128 file was 600 KB. Every fixture is checked against a Zod schema that matches the types both ways, then the links: records agree with rows, owners are people, windows run forwards, and no History is in the future.

**The Command Centre's events** are rows in the Events list with the same Event ID, name and window. One definition (`src/fixtures/commandCentreEvents.ts`) feeds both fixture sets, and a test checks them against each other:

| Event ID | Event | Command Centre fixture | List status |
| --- | --- | --- | --- |
| REV000009 | Weekend Payroll Cutover | `weekend-payroll-cutover` | At risk (+12 min, Amber) |
| REV000010 | Weekend Payroll Cutover (healthy) | `healthy-event` | In progress |
| REV000011 | Weekend Payroll Cutover (late) | `badly-late-event` | At risk (+45 min, Red) |
| REV000012 | Data Centre Migration (large) | `large-event` | In progress |

The board fixture keeps only the eight drawn events.

## 8. Questions for review

Answered (Andy Smith, 22 Oct 2026):
- The record is an RBM Event, numbered REVnnnnnn.
- The list follows the board, with Runbooks replaced by Events, Event ID added, Progress removed and Phase called State.
- Status labels follow the board (In progress, Pending).
- State is the Command Centre's event state (Not started, Active, Paused, Complete). It is read-only in the record: the Command Centre changes it (Start run, Pause event).
- Environments: Production, Pre-production, Test, Development.
- No runbook or stage information is shown.
- The Command Centre's event numbers move to REVnnnnnn and match the Events list: Weekend Payroll Cutover is REV000009 in both (see section 7).
- The row flags and extra columns are removed.

Still open:
1. **The count:** the board reads "128 runbooks · filtered to Production". The 128 fixture spans every environment, so the Production filter shows fewer.
2. **Live conflicts** are found when the user saves. A push while editing waits for the ServiceNow real-time spike.
3. **Not in the contract:** create (New event), Import, bulk actions and export. They come with their own templates or drawings.
