# Command & Control Centre: data model

Status: **agreed** (21 Oct 2026, reviewed by Andy Smith). Decisions are in section 8.

The types are in `src/data/types.ts` and the interfaces in `src/data/interfaces.ts`. This page explains them and sets out the fake engine's rules.

## 1. Two layers

| Layer | What it is | Prototype | Later |
| --- | --- | --- | --- |
| **Stored records** (`EventRecords`) | What ServiceNow holds: event, people, runbooks, stages, tasks, blockers, issues, calls, watchers, event log | JSON fixtures | ServiceNow tables, read by an adapter |
| **Engine output** (in `CommandCentreSnapshot`) | What the RBM planning engine works out: forecasts, RAG, task flags, alerts, next checkpoint, progress | The fake engine (`src/engine`) | The RBM planning engine |

The page never works out a forecast, a RAG status or a late flag. It shows what the snapshot says. This keeps the rule from the brief: "the page displays it and never works it out".

Timestamps are ISO 8601 strings in UTC (`"2026-05-25T03:40:00Z"`) so that fixtures are plain JSON. Adapters turn them into `Date`s for the components and show them in the event's time zone.

## 2. Stored records

| Type | Key fields | Notes |
| --- | --- | --- |
| `CutoverEvent` | `number` (REV000001), `name`, `state`, `owner`, `window` | The event's planned end is `window.end`. |
| `Person` | `name`, `initials?` | Assignees, call participants, who did what. |
| `Runbook` | `number` (RBK0000001), `wbs` (1), `name`, `plannedEnd` | Its forecast end comes from the engine. |
| `Stage` | `runbookId`, `wbs` (1.3), `name` | Its times and progress come from its tasks. |
| `Task` | `wbs` (1.3.5), `kind`, `state`, `planned`, `durationMinutes`, `actual?`, `dependencies`, `constraints?`, `assigneeId?`, `atRisk?`, `paused?`, `workedMinutes?`, `resumedAt?`, `skipped?`, `result?`, `completedAt?` | See below. |
| `Blocker` | `number` (BLK-102), `title`, `severity`, `state`, `taskIds` | Open blockers block the tasks they hold. |
| `Issue` | `number` (INC-102), `title`, `severity`, `state`, `taskIds` | Open issues give a task "Has an issue". |
| `Call` | `checkpointTaskId?`, `opensAt?`, `open`, `participantIds` | A call with a checkpoint id is that checkpoint's Join call; one without is the Collaboration call. |
| `Watcher` | `title`, `since` | The Watchers card. |
| `EventLogEntry` | `at`, `byId`, `source`, `action`, `taskIds`, `detail?` | Every action is written here. |

**Task lifecycle** (`TaskLifecycle`): `not_started`, `active`, `paused`, `complete`, `skipped`. Blocked, ready, late and at risk are **not** lifecycle states. A task that has not started can also be blocked, so these are flags the engine sets. The one exception is **At risk**. The board says "a person or the engine has flagged it", so a person's flag is stored (`atRisk.reason`).

**Dependencies** are finish-to-start only in the prototype. **Constraints** are "not before" only.

**Added during the engine build (21 Oct 2026):** `completedAt` (when the user pressed Complete; the 60-second linger and Undo run from it, because the actual end can be back-dated) and `resumedAt` (when a paused task was resumed; with `workedMinutes` it lets the forecast keep the pause).

A **fixture** (`EventFixture`) is `EventRecords` plus `startsAt` (where the clock starts) and `currentUserId` (for "Mine" and the log).

## 3. Engine output

| Type | What it holds |
| --- | --- |
| `Forecast` | `plannedEnd`, `forecastEnd`, `rag`, `gapMinutes` (positive behind, negative ahead), for the event and for each runbook |
| `TaskView` | the task plus `forecast` start and end, `flags` (`ready`, `upNextAfter?`, `blocked`, `hasIssue`, `lateToStart`, `lateToFinish`, `failedCheck`, `critical`), `deltaMinutes`, and `lingerUntil?` while a completed task lingers |
| `StageView` | the stage plus forecast start and end, a derived state, `complete` of `total`, `critical` (any of its tasks is on the critical path), and `plannedEnd` (latest planned end of its tasks) with `gapMinutes` and `rag`, as for a runbook (added 22 Oct 2026) |
| `Alert` | `kind` (blockers, failed check, forecast), `severity` (red or amber), `title`, `detail?`, `target` (what its link opens) |
| `NextCheckpoint` | the next checkpoint not yet passed, its planned time (for the countdown), its forecast and its call, if any |
| `CommandCentreSnapshot` | all of the above at one moment, with `now`, `progress` and the log |

## 4. Interfaces

```ts
interface CommandCentreData {          // read
  getSnapshot(): CommandCentreSnapshot;
  subscribe(listener): () => void;
}
interface CommandCentreActions {       // write
  dispatch(command: TaskCommand): Promise<CommandResult>;
}
interface Clock {                      // time, injectable and speedable
  now(): Date;
  subscribe(listener): () => void;
}
interface LayoutPreferenceStore {      // the user's own layout
  get(): Promise<LayoutPreference>;    // { order: [ribbon, timeline] in either order, collapsed: { ribbon, timeline, hotTopics }, ribbonView }
  set(preference): Promise<void>;
  reset(): Promise<LayoutPreference>;
}
```

- **Read and write are separate.** Reading is the "read data, subscribe to changes" the brief asks for. Start, Complete and the rest need somewhere to go, so they go to `CommandCentreActions`. A read-only view needs only the first.
- **Commands** (`TaskCommand`) are `start`, `complete` (with an optional back-dated time or note), `undo_complete`, `pause`, `resume`, `skip` (a reason is required) and `record_result`. Each takes a list of task ids, so bulk Start and Complete are the same commands. A `CommandResult` lists what was applied and any conflicts, such as "1.3.5 was already completed by L. Chen at 03:41".
- **`LayoutPreferenceStore` is async,** so a ServiceNow user preference can replace localStorage without changes.

## 5. How the components get their data

The components built so far each have their own props (`RbmEventVitalsData`, `RbmRibbonRunbook`, `RbmTimelineTask`, the Hot-topics card props, `RbmAlert`). They stay as they are. Small adapters (`src/data/adapters.ts`) turn one snapshot into each component's props. `RbmCommandCentre` receives the snapshot through `CommandCentreData` and passes the adapted props into its slots. Swapping fixtures for ServiceNow then touches only the data source, never a component.

## 6. The fake engine (a stand-in for the RBM planning engine)

`src/engine` will be small, pure and unit-tested, with no React. Each rule is listed here so it can be checked and deleted later. Settings default as shown and can be changed in the demo.

**Time.** The engine works from `now`, given by the injected `Clock`. The demo clock can run at ×1, ×10, ×60 or paused.

**Ready.** A `not_started` task is ready when every predecessor is `complete` or `skipped`, and `now` is at or after its `notBefore` constraint, if it has one.

**Up next.** A `not_started` task that is not ready is up next after task P when P is `active` and P is its only predecessor that is not yet complete or skipped. The cap of 5 is applied by the Task Timeline, not the engine.

**Forecast (forward pass, in dependency order).**
- Forecast start:
  - started: the actual start
  - otherwise: the latest of `now`, `notBefore` and every predecessor's forecast end
- Forecast end:
  - complete or skipped: the actual end
  - active: the later of `now` and actual start + duration, less minutes worked before a pause
  - paused: `now` + remaining minutes (the clock keeps the pause)
  - not started: forecast start + duration
- Milestones have zero duration, and **finish by themselves**: once every predecessor has finished, the milestone completes at the latest predecessor's end.
- A runbook's forecast end is its latest task forecast end; the event's is its latest runbook forecast end.

**Gap and RAG.**
- Gap = forecast end − planned end, in whole minutes.
- RAG:
  - Green: gap ≤ 0
  - Amber: 0 < gap ≤ 15 minutes
  - Red: gap > 15 minutes
- The thresholds are settings. The board's examples (+12 Amber, +27 Red) fit them.

**Critical path.** Walk back from the task with the latest forecast end, through the predecessor whose forecast end sets its start, to the first task. Those tasks are `critical`. When predecessors tie for the latest end, none has float, so the walk follows every one of them (changed 22 Oct 2026; it used to follow only the first). Dependencies can cross runbooks, so the path can run through several runbooks. **A stage is `critical` when any of its tasks is** (added 22 Oct 2026, for the Event ribbon's Critical path filter). The path is event-wide: the planning engine computes one critical path for the event, and there is no runbook critical path. Stages in runbooks that do not set the event's forecast end are not critical.

**Flags.**
- **Blocked:** the task has an open blocker.
- **Has an issue:** it has an open issue.
- **Late to start:** not started, and its planned start has passed.
- **Late to finish:** active, and either `now` or its forecast end is past its planned end.
- **Failed check:** a checkpoint whose result is `fail`.

**Delta.** Actual end (or forecast end) − planned end, in minutes.

**Alerts** (most serious first is the counter's job):
- One Red alert for open blockers: "2 blockers are holding 4 tasks", where the tasks held are the blocked tasks and their direct successors, plus the forecast effect.
- One Red alert per failed check: "1.4.2 Payroll totals check needs a decision".
- One forecast alert when the event's gap > 0, in the event's RAG (Amber or Red): "Forecast end is 12 minutes late", plus the first critical task.
- No alerts when the event is healthy, so the counter is hidden.

**Next checkpoint.** The earliest-planned checkpoint that has not finished and has no result yet. A failed check is not the next checkpoint; it is an alert. Its forecast compares forecast start with planned start (Go / No-Go planned 05:45, forecast 05:57).

**Commands.**
- **Start:** a ready, `not_started` task (or a paused one, via Resume) becomes `active`, with the actual start now, or back-dated with `at`. A blocked or not-ready task is refused. There is no "Start early".
- **Complete:** an `active` task becomes `complete` with the actual end now (or `at`). Successors become ready; the forecast, RAG, flags and alerts are recomputed. The task lingers for 60 seconds (a setting).
- **Undo complete:** within the linger, the task goes back to `active` and its actual end is cleared. After the linger it is refused; Reopen belongs to the slide-in.
- **Pause:** `active` becomes `paused`; the minutes worked so far are kept.
- **Resume:** `paused` becomes `active`.
- **Skip:** `not_started`, `active` or `paused` becomes `skipped`, with a required reason. It counts as finished for its successors.
- **Record result:**
  - `pass` or `pass_with_comment` completes the checkpoint.
  - `fail` keeps it active, with `failedCheck`.
- **Bulk:** each task is tried in turn. Those that can are applied; the rest come back as conflicts. Nothing is half-applied to a single task.
- **Event log:** every applied command adds an entry.

**Speed.** The large event (15,000 tasks) takes about 100 ms per snapshot, and a snapshot is worked out each clock tick (once a real second) and after each command.

**What it does not do.** Resource levelling, calendars, other dependency types, lags, partial progress, or what-if planning. The real engine owns all of that.

## 7. Fixtures (next step, after review)

- **JSON source:** each fixture is JSON in `src/fixtures/`, matching `EventFixture`.
- **Validation:** a schema written to match the TypeScript types is checked against them at compile time. Each fixture is then validated against the schema in `npm run check`, so a mismatched file fails the build.
- **Large event:** `large-event` is produced by `npm run fixtures` from a fixed seed and is not committed by hand.

## 8. Decisions (Andy Smith, 21 Oct 2026)

1. **Read and write are separate:** `CommandCentreActions` for commands, `CommandCentreData` for reading. Agreed.
2. **The ribbon's collapsed choice** is kept in `LayoutPreference` with the region order. Agreed.
3. **At risk is not a real status.** It is stored as a person's flag, and the fake engine does not work it out. Agreed.
4. **RAG thresholds:** Amber up to 15 minutes late, Red beyond. Agreed as the prototype's proposal; the real thresholds belong to the planning engine.
5. **Dependencies and constraints:** finish-to-start only, and "not before" only. Agreed for the prototype.
6. **The real components** from PRs #5–#17 are used (not stand-ins), on a branch built on them, fed by adapters. Agreed.
7. **The ribbon's Critical path filter** is kept in `LayoutPreference` as `ribbonCriticalOnly` (off by default), so it is saved per user. A preference saved before the field existed reads as off. (22 Oct 2026)
8. **The critical path is event-wide only.** There is no runbook critical path. (22 Oct 2026)
9. **Every movable region can collapse.** `LayoutPreference.collapsed` holds one flag per region and replaces `ribbonCollapsed` (decision 2), which is carried over from older saved preferences. (22 Oct 2026)
10. **The ribbon's Critical runbooks filter** is kept in `LayoutPreference` as `ribbonCriticalRunbooksOnly` (off by default). A runbook is on the critical path when any of its stages is. Open for Dave: whether the planning engine writes runbook (and stage) critical status, or clients derive it; the ribbon accepts either. (22 Oct 2026)
11. **The ribbon's two filters become one view,** `LayoutPreference.ribbonView`: `'all'` (default), `'criticalRunbooks'` or `'criticalPath'`. It replaces `ribbonCriticalOnly` and `ribbonCriticalRunbooksOnly` (decisions 7 and 10), which map onto it from older saved preferences. (22 Oct 2026)
