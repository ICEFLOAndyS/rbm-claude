/**
 * Adapters: one CommandCentreSnapshot in, each component's props out. The components keep their
 * own props; only this file knows how the data model maps onto them.
 */
import type { CommandCentreSnapshot, EventState, Severity, StageView, TaskView } from './types';
import type { RbmState } from '../theme/tokens';
import type { RbmAlert } from '../components/RbmAlertCounter/RbmAlertCounter';
import type { RbmEventVitalsData } from '../components/RbmEventVitals/RbmEventVitals';
import type { RbmRibbonRunbook } from '../components/RbmEventRibbon/RbmEventRibbon';
import type { RbmTimelineRunbook } from '../components/RbmTaskTimeline/RbmTaskTimeline';
import type { RbmTimelineTask } from '../components/RbmTaskTimeline/focusRule';
import type { RbmTagKind } from '../components/RbmTag/RbmTag';
import type { RbmTaskActionKind } from '../components/RbmTaskRow/RbmTaskAction';
import type { RbmBlocker, RbmMilestoneItem, RbmNextCheckpointData, RbmWatcher } from '../components/RbmHotTopicsStrip/cards';
import type { RbmCommandCentreEvent } from '../components/RbmCommandCentre/RbmCommandCentre';
import type { RbmRunbookProgressItem } from '../components/RbmRunbookProgress/RbmRunbookProgress';
import type { RbmWorkstreamProgressItem } from '../components/RbmWorkstreamProgress/RbmWorkstreamProgress';
import type { RbmExecProgressItem } from '../components/RbmExecProgress/RbmExecProgress';
import type { RbmSuiteState } from '../icons/states';
import { initialsOf } from '../components/RbmAvatar/RbmAvatar';

const d = (t: string) => new Date(t);
const MIN = 60_000;

const eventState: Record<EventState, RbmState> = { not_started: 'pending', active: 'active', paused: 'paused', complete: 'complete' };

export function toEvent(s: CommandCentreSnapshot): RbmCommandCentreEvent {
  return { number: s.event.number, name: s.event.name, state: eventState[s.event.state], owner: s.event.owner, window: { start: d(s.event.window.start), end: d(s.event.window.end) } };
}

const alertAction: Record<string, string> = { blockers: 'View blockers', failed_check: 'Open result', forecast: 'View critical path' };

export function toAlerts(s: CommandCentreSnapshot, onSelect?: (alertId: string) => void): RbmAlert[] {
  return s.alerts.map((a) => ({
    id: a.id,
    severity: a.severity,
    title: a.title,
    ...(a.detail ? { detail: a.detail } : {}),
    ...(onSelect ? { action: { label: alertAction[a.kind]!, onSelect: () => onSelect(a.id) } } : {}),
  }));
}

const openBySeverity = (s: CommandCentreSnapshot, sev: Severity) => s.issues.filter((i) => i.state === 'open' && i.severity === sev).length;

export function toVitals(s: CommandCentreSnapshot): RbmEventVitalsData {
  const start = d(s.event.window.start);
  return {
    progress: s.progress,
    issues: { high: openBySeverity(s, 'high'), medium: openBySeverity(s, 'medium'), low: openBySeverity(s, 'low') },
    start: {
      at: start,
      elapsedMinutes: Math.max(0, Math.round((d(s.now).getTime() - start.getTime()) / MIN)),
      plannedMinutes: Math.round((d(s.event.window.end).getTime() - start.getTime()) / MIN),
    },
    forecast: { end: d(s.forecast.forecastEnd), plannedEnd: d(s.forecast.plannedEnd), rag: s.forecast.rag, gapMinutes: s.forecast.gapMinutes },
  };
}

const stageState = (st: StageView): RbmState => (st.state === 'not_started' ? 'pending' : st.state);

/** A task's state as the marks show it: blocked and paused first, then a person's at-risk flag. */
export function displayState(t: TaskView): RbmState {
  if (t.state === 'complete' || t.state === 'skipped') return t.state === 'complete' ? 'complete' : 'skipped';
  if (t.flags.blocked) return 'blocked';
  if (t.state === 'paused') return 'paused';
  if (t.atRisk && t.state === 'not_started') return 'atRisk';
  return t.state === 'active' ? 'active' : 'pending';
}

export function toRibbon(s: CommandCentreSnapshot): RbmRibbonRunbook[] {
  return s.runbooks.map((r) => ({
    id: r.id,
    wbs: r.wbs,
    name: r.name,
    plannedEnd: d(r.forecast.plannedEnd),
    forecastEnd: d(r.forecast.forecastEnd),
    rag: r.forecast.rag,
    gapMinutes: r.forecast.gapMinutes,
    stages: s.stages.filter((st) => st.runbookId === r.id).map((st) => ({ id: st.id, wbs: st.wbs, name: st.name, start: d(st.forecast.start), end: d(st.forecast.end), state: stageState(st), critical: st.critical })),
    markers: s.tasks
      .filter((t) => t.runbookId === r.id && (t.kind === 'milestone' || t.kind === 'checkpoint'))
      .map((t) => ({ id: t.id, kind: t.kind as 'milestone' | 'checkpoint', wbs: t.wbs, name: t.title, at: d(t.kind === 'milestone' ? t.forecast.end : t.forecast.start), state: displayState(t), critical: t.flags.critical })),
  }));
}

/** Lookups built once per snapshot, so a large event is not searched once per task. */
export interface Lookups {
  blockerByTask: Map<string, CommandCentreSnapshot['blockers'][number]>;
  issueByTask: Map<string, CommandCentreSnapshot['issues'][number]>;
  personById: Map<string, CommandCentreSnapshot['people'][number]>;
  wbsById: Map<string, string>;
}

export function lookups(s: CommandCentreSnapshot): Lookups {
  const blockerByTask = new Map<string, CommandCentreSnapshot['blockers'][number]>();
  for (const b of s.blockers) if (b.state === 'open') for (const id of b.taskIds) if (!blockerByTask.has(id)) blockerByTask.set(id, b);
  const issueByTask = new Map<string, CommandCentreSnapshot['issues'][number]>();
  for (const i of s.issues) if (i.state === 'open') for (const id of i.taskIds) if (!issueByTask.has(id)) issueByTask.set(id, i);
  return { blockerByTask, issueByTask, personById: new Map(s.people.map((p) => [p.id, p])), wbsById: new Map(s.tasks.map((x) => [x.id, x.wbs])) };
}

/** The one tag a row shows: why the task is in focus, most pressing first. */
export function tagFor(t: TaskView, s: CommandCentreSnapshot, l: Lookups = lookups(s)): RbmTimelineTask['tag'] {
  const wbsOf = (id: string) => l.wbsById.get(id) ?? id;
  const blocker = l.blockerByTask.get(t.id);
  const issue = l.issueByTask.get(t.id);
  const tag = (kind: RbmTagKind, label?: string) => ({ kind, ...(label ? { label } : {}) });
  if (t.state === 'complete' || t.state === 'skipped') return undefined;
  if (blocker) return tag('blocked', `Blocked by ${blocker.number}`);
  if (t.flags.failedCheck) return tag('failedCheck');
  if (issue) return tag('issue', `Issue ${issue.number}`);
  // A person's reason says more than a late flag (the board's at-risk row is also late).
  if (t.state === 'paused') return tag('paused', `Paused by ${l.personById.get(t.paused?.byId ?? '')?.name ?? 'someone'}`);
  if (t.atRisk) return tag('atRisk', t.atRisk.reason);
  if (t.flags.lateToFinish) return tag('lateToFinish');
  if (t.flags.lateToStart) return tag('lateToStart');
  if (t.kind === 'checkpoint' && t.state === 'active' && !t.result) return tag('needsResult');
  if (t.flags.ready) return tag('readyToStart');
  if (t.flags.upNextAfter) return tag('upNext', `Up next · after ${wbsOf(t.flags.upNextAfter)}`);
  return undefined;
}

/** The row's one next step. The prototype lets the user do anything the engine allows. */
export function actionFor(t: TaskView, s: CommandCentreSnapshot): RbmTaskActionKind | undefined {
  if (t.lingerUntil && t.completedById === s.currentUserId) return 'undo';
  if (t.flags.blocked && t.state !== 'complete' && t.state !== 'skipped') return 'view';
  if (t.state === 'paused') return 'resume';
  if (t.state === 'active') return t.kind === 'checkpoint' ? 'result' : t.kind === 'milestone' ? undefined : 'complete';
  if (t.state === 'not_started' && t.flags.ready && t.kind !== 'milestone') return 'start';
  return undefined;
}

export function toTimelineTask(t: TaskView, s: CommandCentreSnapshot, l: Lookups = lookups(s)): RbmTimelineTask {
  const started = !!t.actual?.start;
  const person = l.personById.get(t.assigneeId ?? '');
  const tag = tagFor(t, s, l);
  const action = actionFor(t, s);
  const finished = t.state === 'complete' || t.state === 'skipped';
  return {
    id: t.id,
    wbs: t.wbs,
    title: t.title,
    kind: t.kind,
    state: displayState(t),
    start: d(started ? t.actual!.start! : t.forecast.start),
    startIsActual: started,
    plannedMinutes: t.durationMinutes,
    ...(t.deltaMinutes !== 0 && (finished || t.deltaMinutes > 0) ? { deltaMinutes: t.deltaMinutes, deltaIsForecast: !finished } : {}),
    ...(tag ? { tag } : {}),
    ...(person ? { assignee: { name: person.name, ...(person.initials ? { initials: person.initials } : {}) } } : {}),
    ...(action ? { action } : {}),
    runbookId: t.runbookId,
    stageId: t.stageId,
    flags: {
      ready: t.flags.ready,
      ...(t.flags.upNextAfter ? { upNextAfter: l.wbsById.get(t.flags.upNextAfter) ?? t.flags.upNextAfter } : {}),
      blocked: t.flags.blocked,
      hasIssue: t.flags.hasIssue,
      lateToStart: t.flags.lateToStart,
      lateToFinish: t.flags.lateToFinish,
      failedCheck: t.flags.failedCheck,
    },
    ...(t.completedAt ? { completedAt: d(t.completedAt) } : {}),
    assignedToMe: t.assigneeId === s.currentUserId,
  };
}

export function toTimeline(s: CommandCentreSnapshot): { runbooks: RbmTimelineRunbook[]; tasks: RbmTimelineTask[] } {
  const l = lookups(s);
  const tasks = s.tasks.map((t) => toTimelineTask(t, s, l));
  const byRunbook = new Map<string, TaskView[]>();
  for (const t of s.tasks) (byRunbook.get(t.runbookId) ?? byRunbook.set(t.runbookId, []).get(t.runbookId)!).push(t);
  const runbooks: RbmTimelineRunbook[] = s.runbooks.map((r) => {
    const own = byRunbook.get(r.id) ?? [];
    return {
      id: r.id,
      wbs: r.wbs,
      name: r.name,
      recordId: r.number,
      forecastEnd: d(r.forecast.forecastEnd),
      rag: r.forecast.rag,
      gapMinutes: r.forecast.gapMinutes,
      stages: s.stages.filter((st) => st.runbookId === r.id).map((st) => ({ id: st.id, wbs: st.wbs, name: st.name, start: d(st.forecast.start), end: d(st.forecast.end), state: stageState(st), complete: st.complete, total: st.total, plannedEnd: d(st.plannedEnd), gapMinutes: st.gapMinutes, rag: st.rag })),
      hidden: {
        complete: own.filter((t) => t.state === 'complete' && !t.lingerUntil).length,
        notAvailable: own.filter((t) => t.state === 'not_started' && !t.flags.ready && !t.flags.upNextAfter && !t.flags.blocked && !t.flags.hasIssue && !t.flags.lateToStart && !t.atRisk).length,
      },
    };
  });
  return { runbooks, tasks };
}

/** Hot-topics content, filtered by the runbook filter like the Task Timeline. */
export function toHotTopics(s: CommandCentreSnapshot, runbookIds: string[] = []) {
  const inFilter = (runbookId: string) => runbookIds.length === 0 || runbookIds.includes(runbookId);
  const byId = new Map(s.tasks.map((t) => [t.id, t]));
  const successors = (id: string) => s.tasks.filter((t) => t.dependencies.some((x) => x.predecessorId === id)).length;
  const blockers: RbmBlocker[] = s.blockers
    .filter((b) => b.state === 'open' && b.taskIds.some((id) => inFilter(byId.get(id)?.runbookId ?? '')))
    .map((b) => ({ id: b.id, recordId: b.number, title: b.title, severity: b.severity, holds: { wbs: byId.get(b.taskIds[0]!)?.wbs ?? '', tasks: b.taskIds.length + b.taskIds.reduce((n, id) => n + successors(id), 0) } }));

  const nc = s.nextCheckpoint && byId.get(s.nextCheckpoint.taskId);
  const nextCheckpoint: RbmNextCheckpointData | undefined =
    s.nextCheckpoint && nc && inFilter(nc.runbookId)
      ? {
          wbs: nc.wbs,
          title: nc.title,
          state: displayState(nc),
          at: d(s.nextCheckpoint.at),
          forecast: d(s.nextCheckpoint.forecast.forecastEnd),
          gapMinutes: s.nextCheckpoint.forecast.gapMinutes,
          ...(s.nextCheckpoint.call ? { call: { open: s.nextCheckpoint.call.open, joined: s.nextCheckpoint.call.participantIds.length, ...(s.nextCheckpoint.call.opensAt ? { opensAt: d(s.nextCheckpoint.call.opensAt) } : {}) } } : {}),
        }
      : undefined;

  // Milestones: the last one reached, then the ones still to come, in time order.
  const ms = s.tasks.filter((t) => t.kind === 'milestone' && inFilter(t.runbookId)).sort((a, b) => Date.parse(a.forecast.end) - Date.parse(b.forecast.end));
  const lastDone = ms.map((t) => t.state === 'complete').lastIndexOf(true);
  const milestones: RbmMilestoneItem[] = ms.slice(Math.max(0, lastDone)).map((t) => ({
    id: t.id, wbs: t.wbs, title: t.title, state: displayState(t), at: d(t.state === 'complete' ? t.actual!.end! : t.forecast.end), late: Date.parse(t.forecast.end) > Date.parse(t.planned.end),
  }));

  const collab = s.calls.find((c) => !c.checkpointTaskId);
  const people = (collab?.participantIds ?? []).map((id) => s.people.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ name: p.name, ...(p.initials ? { initials: p.initials } : {}) }));
  const watchers: RbmWatcher[] = s.watchers.map((w) => ({ id: w.id, title: w.title, since: d(w.since) }));
  return { blockers, nextCheckpoint, milestones, collaboration: { live: !!collab?.open, people }, watchers };
}


/**
 * Every open issue counts once, against its first task's runbook and workstream, so the issues on Runbook progress
 * and on Workstream progress each add up to the Event vitals' open issues.
 */
export function issueHome(s: CommandCentreSnapshot): Map<string, TaskView> {
  const byId = new Map(s.tasks.map((t) => [t.id, t]));
  const home = new Map<string, TaskView>();
  for (const i of s.issues) {
    const t = i.taskIds.map((id) => byId.get(id)).find((x) => !!x);
    if (i.state === 'open' && t) home.set(i.id, t);
  }
  return home;
}

/**
 * One progress row (RbmExecProgress) per group of tasks: a runbook or a workstream. Every task is in one runbook and
 * one workstream, so each card's counts add up to the Event vitals':
 * - complete and total: tasks Complete, and all tasks, as the Event vitals count them;
 * - state: Complete when every task is complete or skipped, Active while any task is active, Paused while any is
 *   paused and none active, Scheduled before any task starts, and Active between tasks (Proposed);
 * - start and end: the earliest actual or forecast task start and the latest actual or forecast task end, so the card
 *   shows planned, forecast or actual times as the state makes them;
 * - issues: open issues, each counted against its first task (issueHome);
 * - owner: the group's owner, or the person assigned most of its tasks when it has none (Proposed).
 */
function progressRow(s: CommandCentreSnapshot, group: { id: string; name: string; ownerId?: string }, tasks: TaskView[], issues: CommandCentreSnapshot['issues'], late: boolean): RbmExecProgressItem {
  const done = tasks.filter((t) => t.state === 'complete' || t.state === 'skipped').length;
  const counts = new Map<string, number>();
  for (const t of tasks) if (t.assigneeId) counts.set(t.assigneeId, (counts.get(t.assigneeId) ?? 0) + 1);
  const busiest = [...counts]
    .map(([id, n]) => ({ person: s.people.find((p) => p.id === id), n }))
    .filter((o): o is { person: NonNullable<typeof o.person>; n: number } => !!o.person)
    .sort((a, b) => b.n - a.n || a.person.name.localeCompare(b.person.name))[0]?.person;
  const owner = s.people.find((p) => p.id === group.ownerId) ?? busiest;
  const state: RbmSuiteState =
    tasks.length > 0 && done === tasks.length ? 'complete'
    : tasks.some((t) => t.state === 'active') ? 'active'
    : tasks.some((t) => t.state === 'paused') ? 'paused'
    : done === 0 ? 'scheduled'
    : 'active';
  const starts = tasks.map((t) => Date.parse(t.actual?.start ?? t.forecast.start));
  const ends = tasks.map((t) => Date.parse(t.actual?.end ?? t.forecast.end));
  const count = { high: 0, medium: 0, low: 0 };
  for (const i of issues) count[i.severity] += 1;
  const now = Date.parse(s.now);
  return {
    id: group.id,
    name: group.name,
    owner: owner ? { name: owner.name, initials: owner.initials ?? initialsOf(owner.name) } : { name: 'Unassigned', initials: '–' },
    start: new Date(starts.length ? Math.min(...starts) : now),
    end: new Date(ends.length ? Math.max(...ends) : now),
    state,
    complete: tasks.filter((t) => t.state === 'complete').length,
    total: tasks.length,
    issues: count,
    late,
  };
}

/** Runbook progress (RbmRunbookProgress): one row per runbook. Late: the runbook's forecast end is behind its planned end. */
export function toRunbookProgress(s: CommandCentreSnapshot): RbmRunbookProgressItem[] {
  const home = issueHome(s);
  return s.runbooks.map((rb) =>
    progressRow(
      s,
      rb,
      s.tasks.filter((t) => t.runbookId === rb.id),
      s.issues.filter((i) => home.get(i.id)?.runbookId === rb.id),
      rb.forecast.gapMinutes > 0,
    ),
  );
}

/**
 * Workstream progress (RbmWorkstreamProgress): one row per workstream, across runbooks. Late (Proposed): its tasks'
 * latest forecast or actual end is behind their latest planned end, as for a runbook.
 */
export function toWorkstreamProgress(s: CommandCentreSnapshot): RbmWorkstreamProgressItem[] {
  const home = issueHome(s);
  return s.workstreams.map((ws) => {
    const tasks = s.tasks.filter((t) => t.workstreamId === ws.id);
    const planned = Math.max(...tasks.map((t) => Date.parse(t.planned.end)));
    const forecast = Math.max(...tasks.map((t) => Date.parse(t.actual?.end ?? t.forecast.end)));
    return progressRow(s, ws, tasks, s.issues.filter((i) => home.get(i.id)?.workstreamId === ws.id), tasks.length > 0 && forecast > planned);
  });
}
