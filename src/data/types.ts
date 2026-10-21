/**
 * The Command & Control Centre data model.
 *
 * Two layers, kept apart on purpose:
 * - Stored records: what ServiceNow holds (and what the JSON fixtures contain). Plain JSON:
 *   timestamps are ISO 8601 strings in UTC, ids are strings.
 * - Engine output: what the RBM planning engine works out from the records (forecasts, flags,
 *   alerts). In the prototype a fake engine produces it; later the real engine does.
 *
 * Components never see either layer directly. They receive a `CommandCentreSnapshot` through
 * `CommandCentreData`, and adapters turn it into each component's props.
 * See docs/data-model.md.
 */

/** ISO 8601 timestamp in UTC, for example "2026-05-25T03:40:00Z". */
export type IsoTime = string;

// ---------------------------------------------------------------------------
// Stored records
// ---------------------------------------------------------------------------

export type EventState = 'not_started' | 'active' | 'paused' | 'complete';

export interface CutoverEvent {
  id: string;
  /** The event number, for example "E12345". */
  number: string;
  name: string;
  state: EventState;
  /** Owning team or person, shown as "Owner …" in the page header. */
  owner: string;
  /** The planned window. The event's planned end is `window.end`. */
  window: { start: IsoTime; end: IsoTime };
  programme?: string;
}

export interface Person {
  id: string;
  name: string;
  /** Overrides initials taken from the name. */
  initials?: string;
}

export interface Runbook {
  id: string;
  /** The record number, for example "RBK0000001". */
  number: string;
  /** Runbook WBS, for example "1". */
  wbs: string;
  name: string;
  /** Planned end of the runbook. Its forecast end comes from the engine. */
  plannedEnd: IsoTime;
}

export interface Stage {
  id: string;
  runbookId: string;
  /** Stage WBS, for example "1.3". */
  wbs: string;
  name: string;
}

export type TaskKind = 'task' | 'milestone' | 'checkpoint';

/**
 * The task's lifecycle, as stored. Blocked, late, ready and at risk are not lifecycle states:
 * they are engine flags (see `TaskFlags`), so a task that is not started can also be blocked.
 */
export type TaskLifecycle = 'not_started' | 'active' | 'paused' | 'complete' | 'skipped';

export type CheckpointResult = 'pass' | 'fail' | 'pass_with_comment';

/** Finish-to-start only in the prototype: the task can start once the predecessor completes (or is skipped). */
export interface Dependency {
  predecessorId: string;
  type: 'finish_to_start';
}

/** Constraints the engine respects. Only "not before" in the prototype. */
export interface Constraints {
  /** The task cannot start before this time. */
  notBefore?: IsoTime;
}

export interface Task {
  id: string;
  runbookId: string;
  stageId: string;
  /** Task WBS, for example "1.3.5". It is the task's identity on screen and never changes. */
  wbs: string;
  title: string;
  kind: TaskKind;
  state: TaskLifecycle;
  /** The baseline. Late flags and deltas are measured against it. */
  planned: { start: IsoTime; end: IsoTime };
  /** Planned duration in minutes. Milestones are 0. */
  durationMinutes: number;
  /** Set when the task starts and when it finishes (complete or skipped). */
  actual?: { start?: IsoTime; end?: IsoTime };
  dependencies: Dependency[];
  constraints?: Constraints;
  assigneeId?: string;
  /** A person flagged the task as at risk, with the reason shown in its tag. */
  atRisk?: { reason: string };
  /** Who paused it and when, shown as "Paused by A. Smith". */
  paused?: { byId: string; at: IsoTime; reason?: string };
  /** Minutes already worked before a pause, so the clock keeps the pause. */
  workedMinutes?: number;
  skipped?: { byId: string; at: IsoTime; reason: string };
  /** Checkpoints only. */
  result?: { value: CheckpointResult; byId: string; at: IsoTime; comment?: string };
  completedById?: string;
}

export type Severity = 'high' | 'medium' | 'low';

export interface Blocker {
  id: string;
  /** For example "BLK-102". */
  number: string;
  title: string;
  severity: Severity;
  state: 'open' | 'resolved';
  /** The tasks it holds directly. */
  taskIds: string[];
  raisedAt: IsoTime;
}

export interface Issue {
  id: string;
  /** For example "INC-102". */
  number: string;
  title: string;
  severity: Severity;
  state: 'open' | 'closed';
  taskIds: string[];
  raisedAt: IsoTime;
}

/** A call: the event's Collaboration call, or one linked to a checkpoint. */
export interface Call {
  id: string;
  /** Set when the call belongs to a checkpoint (the Next checkpoint card's Join call). */
  checkpointTaskId?: string;
  url?: string;
  opensAt?: IsoTime;
  open: boolean;
  participantIds: string[];
}

export interface Watcher {
  id: string;
  title: string;
  since: IsoTime;
}

/** Every action is written to the event log, with who, when, the source and any reason. */
export interface EventLogEntry {
  at: IsoTime;
  byId: string;
  source: 'command_centre' | 'assignee' | 'system';
  action: TaskCommand['type'];
  taskIds: string[];
  detail?: string;
}

/** A fixture, and later what the ServiceNow adapter reads: stored records only, no engine output. */
export interface EventRecords {
  event: CutoverEvent;
  people: Person[];
  runbooks: Runbook[];
  stages: Stage[];
  tasks: Task[];
  blockers: Blocker[];
  issues: Issue[];
  calls: Call[];
  watchers: Watcher[];
  log: EventLogEntry[];
}

/** A JSON fixture: the records plus the time its story starts at. */
export interface EventFixture extends EventRecords {
  /** The clock starts here. */
  startsAt: IsoTime;
  /** The person using the page, for "Mine" and the event log. */
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Engine output
// ---------------------------------------------------------------------------

export type Rag = 'green' | 'amber' | 'red';

/** A forecast for the event or one runbook. Gap is positive when behind and negative when ahead. */
export interface Forecast {
  plannedEnd: IsoTime;
  forecastEnd: IsoTime;
  rag: Rag;
  gapMinutes: number;
}

export interface TaskFlags {
  /** Every predecessor is complete (or skipped) and no constraint holds it, so it can start now. */
  ready: boolean;
  /** Not ready, but released the moment this task (an id) completes. */
  upNextAfter?: string;
  blocked: boolean;
  hasIssue: boolean;
  lateToStart: boolean;
  lateToFinish: boolean;
  failedCheck: boolean;
  /** On the critical path to the event's forecast end. */
  critical: boolean;
}

/** A task with what the engine worked out about it. */
export interface TaskView extends Task {
  forecast: { start: IsoTime; end: IsoTime };
  flags: TaskFlags;
  /** Forecast or actual end against planned end, in minutes. Positive is late. */
  deltaMinutes: number;
  /** Set while a completed task lingers, for "leaves in 0:42" and Undo. */
  lingerUntil?: IsoTime;
}

export interface StageView extends Stage {
  forecast: { start: IsoTime; end: IsoTime };
  state: 'not_started' | 'active' | 'complete';
  complete: number;
  total: number;
}

export type AlertKind = 'blockers' | 'failed_check' | 'forecast';

export interface Alert {
  id: string;
  kind: AlertKind;
  /** Red: a blocker, a failed check or a Red forecast. Amber: the forecast is late and nothing is blocked. */
  severity: 'red' | 'amber';
  title: string;
  detail?: string;
  /** What the alert's link opens. */
  target: { type: 'blockers' } | { type: 'task'; taskId: string } | { type: 'critical_path' };
}

export interface NextCheckpoint {
  taskId: string;
  /** Planned time; the countdown runs to it. */
  at: IsoTime;
  forecast: Forecast;
  call?: Call;
}

/** Everything the page shows, at one moment. */
export interface CommandCentreSnapshot {
  now: IsoTime;
  currentUserId: string;
  event: CutoverEvent;
  people: Person[];
  runbooks: (Runbook & { forecast: Forecast })[];
  stages: StageView[];
  tasks: TaskView[];
  blockers: Blocker[];
  issues: Issue[];
  calls: Call[];
  watchers: Watcher[];
  forecast: Forecast;
  alerts: Alert[];
  nextCheckpoint?: NextCheckpoint;
  progress: { complete: number; active: number; blocked: number; total: number };
  log: EventLogEntry[];
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** What a user asks for. Bulk commands carry several ids. */
export type TaskCommand =
  | { type: 'start'; taskIds: string[]; at?: IsoTime }
  | { type: 'complete'; taskIds: string[]; at?: IsoTime; note?: string }
  | { type: 'undo_complete'; taskIds: string[] }
  | { type: 'pause'; taskIds: string[]; reason?: string }
  | { type: 'resume'; taskIds: string[] }
  | { type: 'skip'; taskIds: string[]; reason: string }
  | { type: 'record_result'; taskIds: [string]; result: CheckpointResult; comment?: string };

/** A refused or conflicting command, for example "1.3.5 was already completed by L. Chen at 03:41". */
export interface CommandConflict {
  taskId: string;
  reason: 'not_allowed_in_state' | 'not_ready' | 'blocked' | 'linger_expired' | 'missing_reason' | 'unknown_task';
  message: string;
}

export interface CommandResult {
  ok: boolean;
  /** Tasks the command changed. */
  applied: string[];
  conflicts: CommandConflict[];
}
