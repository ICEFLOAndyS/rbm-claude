/**
 * FAKE ENGINE: a stand-in for the RBM planning engine, for the prototype only.
 *
 * Small, pure and deliberately simple. Each rule is written out in docs/data-model.md (section 6)
 * so it can be checked against the real engine and deleted. Nothing in the components depends on
 * this file: they read a `CommandCentreSnapshot`, wherever it came from.
 */
import type {
  Alert,
  CommandCentreSnapshot,
  CommandConflict,
  CommandResult,
  EventRecords,
  Forecast,
  IsoTime,
  NextCheckpoint,
  Rag,
  StageView,
  Task,
  TaskCommand,
  TaskFlags,
  TaskView,
} from '../data/types';

export interface EngineSettings {
  /** How long a completed task lingers, and how long Undo is open. */
  lingerSeconds: number;
  /** Late by this many minutes or fewer is Amber; more is Red. */
  amberUpToMinutes: number;
}

export const DEFAULT_SETTINGS: EngineSettings = { lingerSeconds: 60, amberUpToMinutes: 15 };

const MIN = 60_000;
const ms = (t: IsoTime) => Date.parse(t);
const iso = (n: number) => new Date(n).toISOString().replace('.000Z', 'Z');
const finished = (t: Task) => t.state === 'complete' || t.state === 'skipped';

export function ragFor(gapMinutes: number, s: EngineSettings): Rag {
  return gapMinutes <= 0 ? 'green' : gapMinutes <= s.amberUpToMinutes ? 'amber' : 'red';
}

function forecastOf(plannedEnd: number, forecastEnd: number, s: EngineSettings): Forecast {
  const gap = Math.round((forecastEnd - plannedEnd) / MIN);
  return { plannedEnd: iso(plannedEnd), forecastEnd: iso(forecastEnd), rag: ragFor(gap, s), gapMinutes: gap };
}

/** Dependency order (Kahn). Fixtures are validated to have no loops. */
function topoOrder(tasks: Task[]) {
  const indegree = new Map(tasks.map((t) => [t.id, t.dependencies.length]));
  const successors = new Map<string, string[]>();
  for (const t of tasks) for (const d of t.dependencies) (successors.get(d.predecessorId) ?? successors.set(d.predecessorId, []).get(d.predecessorId)!).push(t.id);
  const queue = tasks.filter((t) => t.dependencies.length === 0).map((t) => t.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.pop()!;
    order.push(id);
    for (const s of successors.get(id) ?? []) {
      const n = indegree.get(s)! - 1;
      indegree.set(s, n);
      if (n === 0) queue.push(s);
    }
  }
  return { order, successors };
}

/** Minutes left on an active or paused task. */
function remainingMinutes(t: Task, now: number) {
  const worked = (t.workedMinutes ?? 0) + (t.state === 'active' ? Math.max(0, now - ms(t.resumedAt ?? t.actual!.start!)) / MIN : 0);
  return Math.max(0, t.durationMinutes - worked);
}

/**
 * Work (Event vitals brief, section 3): each task's effective duration, planned before it starts, forecast once
 * started and actual once Complete. Done is the time worked (paused time is not worked); To do is what is left (the
 * planned duration, or the forecast remainder of a started task). Skipped tasks and Milestones add nothing. An overrun
 * grows Done, so the share done can fall. Whole minutes.
 */
export function workOf(tasks: Task[], now: number) {
  let done = 0;
  let todo = 0;
  for (const t of tasks) {
    if (t.kind === 'milestone' || t.state === 'skipped') continue;
    if (t.state === 'not_started') todo += t.durationMinutes;
    else if (t.state === 'complete') done += (t.workedMinutes ?? 0) + Math.max(0, ms(t.actual!.end!) - ms(t.resumedAt ?? t.actual!.start!)) / MIN;
    else {
      done += (t.workedMinutes ?? 0) + (t.state === 'active' ? Math.max(0, now - ms(t.resumedAt ?? t.actual!.start!)) / MIN : 0);
      todo += remainingMinutes(t, now);
    }
  }
  return { doneMinutes: Math.round(done), todoMinutes: Math.round(todo) };
}

/** Works out everything the page shows from the records, at `now`. */
export function computeSnapshot(records: EventRecords, now: Date, currentUserId: string, s: EngineSettings = DEFAULT_SETTINGS): CommandCentreSnapshot {
  const t0 = now.getTime();
  const byId = new Map(records.tasks.map((t) => [t.id, t]));
  const { order, successors } = topoOrder(records.tasks);
  const blockedBy = new Map<string, string[]>();
  for (const b of records.blockers) if (b.state === 'open') for (const id of b.taskIds) (blockedBy.get(id) ?? blockedBy.set(id, []).get(id)!).push(b.number);
  const withIssue = new Set(records.issues.filter((i) => i.state === 'open').flatMap((i) => i.taskIds));

  // Forward pass: forecast start and end, and which predecessor drives each start.
  const fStart = new Map<string, number>();
  const fEnd = new Map<string, number>();
  const drivers = new Map<string, string[]>();
  for (const id of order) {
    const t = byId.get(id)!;
    // The driving predecessors are the ones that finish last. Ties all drive (none has float),
    // so the critical path follows every one of them back, across runbooks too.
    let latestPred = -Infinity;
    let driving: string[] = [];
    for (const d of t.dependencies) {
      const e = fEnd.get(d.predecessorId)!;
      if (e > latestPred) {
        latestPred = e;
        driving = [d.predecessorId];
      } else if (e === latestPred) driving.push(d.predecessorId);
    }
    if (driving.length) drivers.set(id, driving);
    const start = t.actual?.start ? ms(t.actual.start) : Math.max(t0, t.constraints?.notBefore ? ms(t.constraints.notBefore) : -Infinity, latestPred);
    let end: number;
    if (finished(t)) end = ms(t.actual!.end!);
    else if (t.state === 'active') end = Math.max(t0, ms(t.resumedAt ?? t.actual!.start!) + ((t.durationMinutes - (t.workedMinutes ?? 0)) * MIN));
    else if (t.state === 'paused') end = t0 + remainingMinutes(t, t0) * MIN;
    else end = start + t.durationMinutes * MIN;
    fStart.set(id, start);
    fEnd.set(id, end);
  }

  // Event forecast and the critical path back from the latest finish.
  const eventEnd = [...fEnd.values()].reduce((a, b) => (b > a ? b : a), -Infinity);
  const forecast = forecastOf(ms(records.event.window.end), eventEnd, s);
  const critical = new Set<string>();
  const walk = records.tasks.filter((t) => fEnd.get(t.id) === eventEnd).map((t) => t.id);
  while (walk.length) {
    const id = walk.pop()!;
    if (critical.has(id)) continue;
    critical.add(id);
    walk.push(...(drivers.get(id) ?? []));
  }

  const stateOf = (id: string) => byId.get(id)!.state;
  const tasks: TaskView[] = records.tasks.map((t) => {
    const preds = t.dependencies.map((d) => d.predecessorId);
    const outstanding = preds.filter((p) => !finished(byId.get(p)!));
    const notBeforeOk = !t.constraints?.notBefore || ms(t.constraints.notBefore) <= t0;
    const ready = t.state === 'not_started' && outstanding.length === 0 && notBeforeOk;
    const only = outstanding.length === 1 ? outstanding[0]! : undefined;
    const end = fEnd.get(t.id)!;
    const flags: TaskFlags = {
      ready,
      ...(t.state === 'not_started' && !ready && only && (stateOf(only) === 'active' || stateOf(only) === 'paused') ? { upNextAfter: only } : {}),
      blocked: blockedBy.has(t.id) && !finished(t),
      hasIssue: withIssue.has(t.id) && !finished(t),
      lateToStart: t.state === 'not_started' && ms(t.planned.start) < t0,
      lateToFinish: (t.state === 'active' || t.state === 'paused') && (t0 > ms(t.planned.end) || end > ms(t.planned.end)),
      failedCheck: t.kind === 'checkpoint' && t.result?.value === 'fail',
      critical: critical.has(t.id),
    };
    const lingerUntil = t.state === 'complete' && t.completedAt ? ms(t.completedAt) + s.lingerSeconds * 1000 : 0;
    return {
      ...t,
      forecast: { start: iso(fStart.get(t.id)!), end: iso(end) },
      flags,
      deltaMinutes: Math.round((end - ms(t.planned.end)) / MIN),
      ...(lingerUntil > t0 ? { lingerUntil: iso(lingerUntil) } : {}),
    };
  });

  // Group once, so stage and runbook figures do not scan every task each time.
  const byRunbook = new Map<string, Task[]>();
  const byStage = new Map<string, Task[]>();
  for (const t of records.tasks) {
    (byRunbook.get(t.runbookId) ?? byRunbook.set(t.runbookId, []).get(t.runbookId)!).push(t);
    (byStage.get(t.stageId) ?? byStage.set(t.stageId, []).get(t.stageId)!).push(t);
  }
  const maxOf = (xs: number[]) => xs.reduce((a, b) => (b > a ? b : a), -Infinity);
  const minOf = (xs: number[]) => xs.reduce((a, b) => (b < a ? b : a), Infinity);

  const runbooks = records.runbooks.map((r) => {
    const own = byRunbook.get(r.id) ?? [];
    const end = own.length ? maxOf(own.map((t) => fEnd.get(t.id)!)) : ms(r.plannedEnd);
    return { ...r, forecast: forecastOf(ms(r.plannedEnd), end, s) };
  });

  const stages: StageView[] = records.stages.map((st) => {
    const own = byStage.get(st.id) ?? [];
    const done = own.filter(finished).length;
    const end = maxOf(own.map((t) => fEnd.get(t.id)!));
    const planned = forecastOf(maxOf(own.map((t) => ms(t.planned.end))), end, s);
    return {
      ...st,
      forecast: { start: iso(minOf(own.map((t) => fStart.get(t.id)!))), end: iso(end) },
      plannedEnd: planned.plannedEnd,
      gapMinutes: planned.gapMinutes,
      rag: planned.rag,
      state: done === own.length ? 'complete' : own.some((t) => t.state !== 'not_started') ? 'active' : 'not_started',
      complete: own.filter((t) => t.state === 'complete').length,
      total: own.length,
      // A stage is on the critical path when any of its tasks is.
      critical: own.some((t) => critical.has(t.id)),
    };
  });

  // Alerts: blockers, failed checks, and a late forecast.
  const alerts: Alert[] = [];
  const open = records.blockers.filter((b) => b.state === 'open');
  if (open.length) {
    const held = new Set(open.flatMap((b) => b.taskIds.flatMap((id) => [id, ...(successors.get(id) ?? [])])));
    alerts.push({
      id: 'alert-blockers',
      kind: 'blockers',
      severity: 'red',
      title: `${open.length} ${open.length === 1 ? 'blocker is' : 'blockers are'} holding ${held.size} ${held.size === 1 ? 'task' : 'tasks'}`,
      ...(forecast.gapMinutes > 0 ? { detail: `The forecast end has moved ${forecast.gapMinutes} minutes late.` } : {}),
      target: { type: 'blockers' },
    });
  }
  const failed = tasks.filter((t) => t.flags.failedCheck && !finished(t));
  if (failed.length) {
    alerts.push({
      id: 'alert-failed-check',
      kind: 'failed_check',
      severity: 'red',
      title: `${failed.length} ${failed.length === 1 ? 'task failed its check' : 'tasks failed their checks'}`,
      detail: `${failed[0]!.wbs} ${failed[0]!.title} needs a decision.`,
      target: { type: 'task', taskId: failed[0]!.id },
    });
  }
  if (forecast.gapMinutes > 0) {
    const through = tasks.find((t) => t.flags.critical && !finished(t) && t.kind !== 'milestone');
    alerts.push({
      id: 'alert-forecast',
      kind: 'forecast',
      severity: forecast.rag === 'red' ? 'red' : 'amber',
      title: `Forecast end is ${forecast.gapMinutes} ${forecast.gapMinutes === 1 ? 'minute' : 'minutes'} late`,
      ...(through ? { detail: `The critical path runs through ${through.wbs} ${through.title}.` } : {}),
      target: { type: 'critical_path' },
    });
  }

  // The next checkpoint: the earliest planned one without a result yet.
  const upcoming = tasks
    .filter((t) => t.kind === 'checkpoint' && !finished(t) && !t.result)
    .sort((a, b) => ms(a.planned.start) - ms(b.planned.start))[0];
  const nextCheckpoint: NextCheckpoint | undefined = upcoming && {
    taskId: upcoming.id,
    at: upcoming.planned.start,
    forecast: forecastOf(ms(upcoming.planned.start), ms(upcoming.forecast.start), s),
    ...(records.calls.find((c) => c.checkpointTaskId === upcoming.id) ? { call: records.calls.find((c) => c.checkpointTaskId === upcoming.id)! } : {}),
  };

  return {
    now: iso(t0),
    currentUserId,
    event: records.event,
    people: records.people,
    workstreams: records.workstreams,
    runbooks,
    stages,
    tasks,
    blockers: records.blockers,
    issues: records.issues,
    calls: records.calls,
    watchers: records.watchers,
    forecast,
    alerts,
    ...(nextCheckpoint ? { nextCheckpoint } : {}),
    progress: {
      complete: tasks.filter((t) => t.state === 'complete').length,
      active: tasks.filter((t) => t.state === 'active').length,
      blocked: tasks.filter((t) => t.flags.blocked).length,
      total: tasks.length,
    },
    work: workOf(tasks, t0),
    log: records.log,
  };
}

/**
 * Milestones finish themselves: a milestone completes once every predecessor has finished, at
 * the latest predecessor's end. Repeats until nothing changes.
 */
export function settleMilestones(tasks: Task[], now: number): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, t] of byId) {
      if (t.kind !== 'milestone' || t.state !== 'not_started') continue;
      const preds = t.dependencies.map((d) => byId.get(d.predecessorId)!);
      if (!preds.every(finished)) continue;
      if (t.constraints?.notBefore && ms(t.constraints.notBefore) > now) continue;
      const at = iso(Math.max(...preds.map((p) => ms(p.actual!.end!)), t.constraints?.notBefore ? ms(t.constraints.notBefore) : -Infinity));
      byId.set(id, { ...t, state: 'complete', actual: { start: at, end: at } });
      changed = true;
    }
  }
  return tasks.map((t) => byId.get(t.id)!);
}

const hhmm = (t: IsoTime) => t.slice(11, 16);

/**
 * Applies a command to the records at `now`, by `byId`. Returns new records (the input is not
 * changed) and what happened. Bulk commands try each task; those that cannot change come back as conflicts.
 */
export function applyCommand(records: EventRecords, cmd: TaskCommand, now: Date, byId: string, s: EngineSettings = DEFAULT_SETTINGS): { records: EventRecords; result: CommandResult } {
  const t0 = now.getTime();
  const at = iso(t0);
  const index = new Map(records.tasks.map((t) => [t.id, t]));
  const name = (id?: string) => records.people.find((p) => p.id === id)?.name ?? 'someone';
  const blockers = new Map<string, string>();
  for (const b of records.blockers) if (b.state === 'open') for (const id of b.taskIds) blockers.set(id, b.number);
  const conflicts: CommandConflict[] = [];
  const applied: string[] = [];
  const refuse = (t: Task | undefined, id: string, reason: CommandConflict['reason'], message: string) => conflicts.push({ taskId: t?.id ?? id, reason, message });
  const wrongState = (t: Task) =>
    refuse(t, t.id, 'not_allowed_in_state', t.state === 'complete' ? `${t.wbs} was already completed by ${name(t.completedById)} at ${hhmm(t.actual?.end ?? at)}` : `${t.wbs} is ${t.state.replace('_', ' ')}`);

  for (const id of cmd.taskIds) {
    const t = index.get(id);
    if (!t) {
      refuse(undefined, id, 'unknown_task', `No task ${id}`);
      continue;
    }
    let next: Task | undefined;
    switch (cmd.type) {
      case 'start': {
        if (t.state !== 'not_started') wrongState(t);
        else if (blockers.has(t.id)) refuse(t, id, 'blocked', `${t.wbs} is blocked by ${blockers.get(t.id)}`);
        else if (!t.dependencies.every((d) => finished(index.get(d.predecessorId)!)) || (t.constraints?.notBefore && ms(t.constraints.notBefore) > t0))
          refuse(t, id, 'not_ready', `${t.wbs} is not ready to start`);
        else next = { ...t, state: 'active', actual: { start: cmd.at ?? at } };
        break;
      }
      case 'complete': {
        if (t.state !== 'active') wrongState(t);
        else if (t.kind === 'checkpoint') refuse(t, id, 'not_allowed_in_state', `${t.wbs} needs a result`);
        else next = { ...t, state: 'complete', actual: { ...t.actual, end: cmd.at ?? at }, completedAt: at, completedById: byId };
        break;
      }
      case 'undo_complete': {
        if (t.state !== 'complete' || !t.completedAt) wrongState(t);
        else if (ms(t.completedAt) + s.lingerSeconds * 1000 <= t0) refuse(t, id, 'linger_expired', `Undo for ${t.wbs} has closed; reopen it from the task`);
        else {
          const { completedAt: _c, completedById: _b, ...rest } = t;
          next = { ...rest, state: 'active', actual: { start: t.actual!.start } };
        }
        break;
      }
      case 'pause': {
        if (t.state !== 'active') wrongState(t);
        else {
          const worked = (t.workedMinutes ?? 0) + Math.round((t0 - ms(t.resumedAt ?? t.actual!.start!)) / MIN);
          const { resumedAt: _r, ...rest } = t;
          next = { ...rest, state: 'paused', paused: { byId, at, ...(cmd.reason ? { reason: cmd.reason } : {}) }, workedMinutes: worked };
        }
        break;
      }
      case 'resume': {
        if (t.state !== 'paused') wrongState(t);
        else {
          const { paused: _p, ...rest } = t;
          next = { ...rest, state: 'active', resumedAt: at };
        }
        break;
      }
      case 'skip': {
        if (!cmd.reason?.trim()) refuse(t, id, 'missing_reason', `Skipping ${t.wbs} needs a reason`);
        else if (finished(t)) wrongState(t);
        else next = { ...t, state: 'skipped', actual: { start: t.actual?.start ?? at, end: at }, skipped: { byId, at, reason: cmd.reason } };
        break;
      }
      case 'record_result': {
        if (t.kind !== 'checkpoint' || t.state !== 'active') wrongState(t);
        else {
          const result = { value: cmd.result, byId, at, ...(cmd.comment ? { comment: cmd.comment } : {}) };
          next = cmd.result === 'fail' ? { ...t, result } : { ...t, result, state: 'complete', actual: { ...t.actual, end: at }, completedAt: at, completedById: byId };
        }
        break;
      }
    }
    if (next) {
      index.set(id, next);
      applied.push(id);
    }
  }

  const tasks = settleMilestones(records.tasks.map((t) => index.get(t.id)!), t0);
  const log = applied.length ? [...records.log, { at, byId, source: 'command_centre' as const, action: cmd.type, taskIds: applied, ...('reason' in cmd && cmd.reason ? { detail: cmd.reason } : 'note' in cmd && cmd.note ? { detail: cmd.note } : {}) }] : records.log;
  return { records: { ...records, tasks, log }, result: { ok: conflicts.length === 0, applied, conflicts } };
}
