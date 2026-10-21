# Command & Control Centre: data model

Status: **draft for review** (21 Oct 2026). Nothing is built on it yet.

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
| `CutoverEvent` | `number` (E12345), `name`, `state`, `owner`, `window` | The event's planned end is `window.end`. |
| `Person` | `name`, `initials?` | Assignees, call participants, who did what. |
| `Runbook` | `number` (RBK0000001), `wbs` (1), `name`, `plannedEnd` | Its forecast end comes from the engine. |
| `Stage` | `runbookId`, `wbs` (1.3), `name` | Its times and progress come from its tasks. |
| `Task` | `wbs` (1.3.5), `kind`, `state`, `planned`, `durationMinutes`, `actual?`, `dependencies`, `constraints?`, `assigneeId?`, `atRisk?`, `paused?`, `skipped?`, `result?` | See below. |
| `Blocker` | `number` (BLK-102), `title`, `severity`, `state`, `taskIds` | Open blockers block the tasks they hold. |
| `Issue` | `number` (INC-102), `title`, `severity`, `state`, `taskIds` | Open issues give a task "Has an issue". |
| `Call` | `checkpointTaskId?`, `opensAt?`, `open`, `participantIds` | A call with a checkpoint id is that checkpoint's Join call; one without is the Collaboration call. |
| `Watcher` | `title`, `since` | The Watchers card. |
| `EventLogEntry` | `at`, `byId`, `source`, `action`, `taskIds`, `detail?` | Every action is written here. |

**Task lifecycle** (`TaskLifecycle`): `not_started`, `active`, `paused`, `complete`, `skipped`. Blocked, ready, late and at risk are **not** lifecycle states. A task that has not started can also be blocked, so these are flags the engine sets. The one exception is **At risk**. The board says "a person or the engine has flagged it", so a person's flag is stored (`atRisk.reason`).

**Dependencies** are finish-to-start only in the prototype. **Constraints** are "not before" only.

A **fixture** (`EventFixture`) is `EventRecords` plus `startsAt` (where the clock starts) and `currentUserId` (for "Mine" and the log).

## 3. Engine output

| Type | What it holds |
| --- | --- |
| `Forecast` | `plannedEnd`, `forecastEnd`, `rag`, `gapMinutes` (positive behind, negative ahead), for the event and for each runbook |
| `TaskView` | the task plus `forecast` start and end, `flags` (`ready`, `upNextAfter?`, `blocked`, `hasIssue`, `lateToStart`, `lateToFinish`, `failedCheck`, `critical`), `deltaMinutes`, and `lingerUntil?` while a completed task lingers |
| `StageView` | the stage plus forecast start and end, a derived state, and `complete` of `total` |
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
  get(): Promise<LayoutPreference>;    // { order, ribbonCollapsed }
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
- Milestones have zero duration.
- A runbook's forecast end is its latest task forecast end; the event's is its latest runbook forecast end.

**Gap and RAG.**
- Gap = forecast end − planned end, in whole minutes.
- RAG:
  - Green: gap ≤ 0
  - Amber: 0 < gap ≤ 15 minutes
  - Red: gap > 15 minutes
- The thresholds are settings. The board's examples (+12 Amber, +27 Red) fit them.

**Critical path.** Walk back from the task with the latest forecast end, through the predecessor whose forecast end sets its start, to the first task. Those tasks are `critical`.

**Flags.**
- **Blocked:** the task has an open blocker.
- **Has an issue:** it has an open issue.
- **Late to start:** not started, and its planned start has passed.
- **Late to finish:** active, and either `now` or its forecast end is past its planned end.
- **Failed check:** a checkpoint whose result is `fail`.

**Delta.** Actual end (or forecast end) − planned end, in minutes.

**Alerts** (most serious first is the counter's job):
- One Red alert for open blockers: "2 blockers are holding 3 tasks", plus the forecast effect.
- One Red alert per failed check: "1.4.2 Payroll totals check needs a decision".
- One forecast alert when the event's gap > 0, in the event's RAG (Amber or Red): "Forecast end is 12 minutes late", plus the first critical task.
- No alerts when the event is healthy, so the counter is hidden.

**Next checkpoint.** The earliest-planned checkpoint that has not passed.

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

**What it does not do.** Resource levelling, calendars, other dependency types, lags, partial progress, or what-if planning. The real engine owns all of that.

## 7. Fixtures (next step, after review)

- **JSON source:** each fixture is JSON in `src/fixtures/`, matching `EventFixture`.
- **Validation:** a schema written to match the TypeScript types is checked against them at compile time. Each fixture is then validated against the schema in `npm run check`, so a mismatched file fails the build.
- **Large event:** `large-event` is produced by `npm run fixtures` from a fixed seed and is not committed by hand.

## 8. For review

1. **Read and write split:** is splitting `CommandCentreActions` from `CommandCentreData` acceptable? The brief lists only read and subscribe.
2. **Ribbon preference:** `LayoutPreference` also holds `ribbonCollapsed`, so the ribbon's choice is remembered in the same place. Agreed?
3. **At risk:** stored as a person's flag only; the fake engine does not work out "at risk". Agreed?
4. **RAG thresholds:** Amber up to 15 minutes late, Red beyond. These are my proposal; the real thresholds belong to the planning engine.
5. **Dependencies:** finish-to-start only, and "not before" as the only constraint. Enough for the prototype?
6. **Existing components:** the prototype will use the real components from PRs #5–#17 (not stand-ins), on a branch built on top of them. Their props stay as they are and adapters feed them. Agreed?
