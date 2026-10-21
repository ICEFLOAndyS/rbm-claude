import type { RbmTask } from '../RbmTaskRow/RbmTaskRow';

/** Flags from the RBM planning engine. The page applies the focus rule to them and never works them out. */
export interface RbmTaskFlags {
  /** Every predecessor is complete, so the task can start now. */
  ready?: boolean;
  /** Not ready, but released the moment this task (WBS) completes. */
  upNextAfter?: string;
  blocked?: boolean;
  hasIssue?: boolean;
  lateToStart?: boolean;
  lateToFinish?: boolean;
  /** A checkpoint with a failed or rejected result. */
  failedCheck?: boolean;
}

export interface RbmTimelineTask extends RbmTask {
  runbookId: string;
  stageId: string;
  flags?: RbmTaskFlags;
  /** When the task completed, for the linger. */
  completedAt?: Date;
  assignedToMe?: boolean;
}

/** Why a task is in focus, as numbered on the Command board ("Task Timeline scope"). */
export type RbmFocusReason =
  | 'active'
  | 'readyToStart'
  | 'upNext'
  | 'blocked'
  | 'hasIssue'
  | 'lateToStart'
  | 'lateToFinish'
  | 'atRiskOrPaused'
  | 'failedCheck'
  | 'lingering';

/** Every reason a task is in focus; none means it is hidden. A task can match several. */
export function focusReasons(t: RbmTimelineTask, now: Date, lingerSeconds: number): RbmFocusReason[] {
  const f = t.flags ?? {};
  const reasons: RbmFocusReason[] = [];
  if (t.state === 'active') reasons.push('active');
  if (f.ready && t.state === 'pending') reasons.push('readyToStart');
  if (f.upNextAfter && !f.ready && t.state === 'pending') reasons.push('upNext');
  if (f.blocked || t.state === 'blocked') reasons.push('blocked');
  if (f.hasIssue) reasons.push('hasIssue');
  if (f.lateToStart) reasons.push('lateToStart');
  if (f.lateToFinish) reasons.push('lateToFinish');
  if (t.state === 'atRisk' || t.state === 'paused') reasons.push('atRiskOrPaused');
  if (f.failedCheck) reasons.push('failedCheck');
  // A complete task lingers for the linger time, then leaves. Skipped tasks never show.
  if (t.state === 'complete' && t.completedAt && now.getTime() - t.completedAt.getTime() < lingerSeconds * 1000) reasons.push('lingering');
  return t.state === 'skipped' ? [] : reasons;
}

export const isInFocus = (t: RbmTimelineTask, now: Date, lingerSeconds: number) => focusReasons(t, now, lingerSeconds).length > 0;

/** Seconds left in the linger, for "leaves in 0:42". */
export function lingerLeft(t: RbmTimelineTask, now: Date, lingerSeconds: number) {
  if (!t.completedAt) return 0;
  return Math.max(0, Math.ceil(lingerSeconds - (now.getTime() - t.completedAt.getTime()) / 1000));
}

export const formatLinger = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Tasks always sort by start time: actual once started, forecast until then. Severity never reorders. */
export const byStart = (a: RbmTask, b: RbmTask) => a.start.getTime() - b.start.getTime() || a.wbs.localeCompare(b.wbs, undefined, { numeric: true });

/** Up next shows at most this many tasks released by one completion, then "+n more". */
export const UP_NEXT_CAP = 5;

/**
 * Splits a stage's sorted rows so that each releasing task shows at most five Up next tasks.
 * The rest are counted, never hidden silently.
 */
export function capUpNext(tasks: RbmTimelineTask[], expanded: ReadonlySet<string>) {
  const seen = new Map<string, number>();
  const shown: RbmTimelineTask[] = [];
  const more = new Map<string, number>();
  for (const t of tasks) {
    const after = t.flags?.upNextAfter;
    const onlyUpNext = after && !t.flags?.ready && t.state === 'pending' && !t.flags?.blocked && !t.flags?.hasIssue && !t.flags?.lateToStart;
    if (!onlyUpNext || expanded.has(after)) {
      shown.push(t);
      continue;
    }
    const n = (seen.get(after) ?? 0) + 1;
    seen.set(after, n);
    if (n <= UP_NEXT_CAP) shown.push(t);
    else more.set(after, (more.get(after) ?? 0) + 1);
  }
  return { shown, more };
}
