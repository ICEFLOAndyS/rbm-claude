import { z } from 'zod';
import type { EventFixture } from './types';

/**
 * A runtime schema for fixtures, written to match `EventFixture` in types.ts. The two checks at
 * the bottom fail the type check if the schema and the types drift apart, and `validateFixture`
 * fails the tests if a fixture file does not match.
 */

const iso = z.iso.datetime();
const severity = z.enum(['high', 'medium', 'low']);

const task = z.object({
  id: z.string(),
  runbookId: z.string(),
  stageId: z.string(),
  wbs: z.string(),
  title: z.string(),
  kind: z.enum(['task', 'milestone', 'checkpoint']),
  state: z.enum(['not_started', 'active', 'paused', 'complete', 'skipped']),
  planned: z.object({ start: iso, end: iso }),
  durationMinutes: z.number().nonnegative(),
  actual: z.object({ start: iso.optional(), end: iso.optional() }).optional(),
  dependencies: z.array(z.object({ predecessorId: z.string(), type: z.literal('finish_to_start') })),
  constraints: z.object({ notBefore: iso.optional() }).optional(),
  assigneeId: z.string().optional(),
  workstreamId: z.string().optional(),
  atRisk: z.object({ reason: z.string() }).optional(),
  paused: z.object({ byId: z.string(), at: iso, reason: z.string().optional() }).optional(),
  workedMinutes: z.number().nonnegative().optional(),
  resumedAt: iso.optional(),
  completedAt: iso.optional(),
  skipped: z.object({ byId: z.string(), at: iso, reason: z.string() }).optional(),
  result: z.object({ value: z.enum(['pass', 'fail', 'pass_with_comment']), byId: z.string(), at: iso, comment: z.string().optional() }).optional(),
  completedById: z.string().optional(),
});

export const fixtureSchema = z.object({
  startsAt: iso,
  currentUserId: z.string(),
  event: z.object({
    id: z.string(),
    /** Event ID, REVnnnnnn (decided by Andy Smith, 22 Oct 2026). */
    number: z.string().regex(/^REV\d{6}$/),
    name: z.string(),
    state: z.enum(['not_started', 'active', 'paused', 'complete']),
    owner: z.string(),
    window: z.object({ start: iso, end: iso }),
    programme: z.string().optional(),
  }),
  people: z.array(z.object({ id: z.string(), name: z.string(), initials: z.string().optional() })),
  runbooks: z.array(z.object({ id: z.string(), number: z.string().regex(/^RBK\d{7}$/), wbs: z.string(), name: z.string(), plannedEnd: iso, ownerId: z.string().optional() })),
  workstreams: z.array(z.object({ id: z.string(), name: z.string(), ownerId: z.string() })),
  stages: z.array(z.object({ id: z.string(), runbookId: z.string(), wbs: z.string(), name: z.string() })),
  tasks: z.array(task),
  blockers: z.array(z.object({ id: z.string(), number: z.string(), title: z.string(), severity, state: z.enum(['open', 'resolved']), taskIds: z.array(z.string()), raisedAt: iso })),
  issues: z.array(z.object({ id: z.string(), number: z.string(), title: z.string(), severity, state: z.enum(['open', 'closed']), taskIds: z.array(z.string()), raisedAt: iso })),
  calls: z.array(z.object({ id: z.string(), checkpointTaskId: z.string().optional(), url: z.string().optional(), opensAt: iso.optional(), open: z.boolean(), participantIds: z.array(z.string()) })),
  watchers: z.array(z.object({ id: z.string(), title: z.string(), since: iso })),
  log: z.array(
    z.object({
      at: iso,
      byId: z.string(),
      source: z.enum(['command_centre', 'assignee', 'system']),
      action: z.enum(['start', 'complete', 'undo_complete', 'pause', 'resume', 'skip', 'record_result']),
      taskIds: z.array(z.string()),
      detail: z.string().optional(),
    }),
  ),
});

// The schema and the types must describe the same shape, both ways round.
type FromSchema = z.infer<typeof fixtureSchema>;
const _schemaMatchesTypes = (x: FromSchema): EventFixture => x;
const _typesMatchSchema = (x: EventFixture): FromSchema => x;
void _schemaMatchesTypes;
void _typesMatchSchema;

/**
 * Checks a fixture's shape against the schema, then the links between records: every id points
 * at something, WBS numbers sit under their stage and runbook, and dependencies have no loops.
 * Returns the problems found; an empty list means the fixture is sound.
 */
export function validateFixture(data: unknown): { fixture?: EventFixture; errors: string[] } {
  const parsed = fixtureSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join('.')}: ${i.message}`) };
  const f = parsed.data;
  const errors: string[] = [];
  const ids = (xs: { id: string }[], what: string) => {
    const set = new Set<string>();
    for (const x of xs) {
      if (set.has(x.id)) errors.push(`duplicate ${what} id ${x.id}`);
      set.add(x.id);
    }
    return set;
  };
  const people = ids(f.people, 'person');
  const runbooks = new Map(f.runbooks.map((r) => [r.id, r]));
  ids(f.runbooks, 'runbook');
  const workstreams = ids(f.workstreams, 'workstream');
  const stages = new Map(f.stages.map((s) => [s.id, s]));
  ids(f.stages, 'stage');
  const tasks = new Map(f.tasks.map((t) => [t.id, t]));
  ids(f.tasks, 'task');

  if (!people.has(f.currentUserId)) errors.push(`currentUserId ${f.currentUserId} is not a person`);
  for (const r of f.runbooks) if (r.ownerId && !people.has(r.ownerId)) errors.push(`runbook ${r.wbs}: unknown owner ${r.ownerId}`);
  for (const w of f.workstreams) if (!people.has(w.ownerId)) errors.push(`workstream ${w.id}: unknown owner ${w.ownerId}`);
  for (const s of f.stages) {
    const r = runbooks.get(s.runbookId);
    if (!r) errors.push(`stage ${s.wbs}: unknown runbook ${s.runbookId}`);
    else if (!s.wbs.startsWith(`${r.wbs}.`)) errors.push(`stage ${s.wbs} is not under runbook ${r.wbs}`);
  }
  for (const t of f.tasks) {
    const s = stages.get(t.stageId);
    if (!s) errors.push(`task ${t.wbs}: unknown stage ${t.stageId}`);
    else {
      if (s.runbookId !== t.runbookId) errors.push(`task ${t.wbs}: stage and runbook disagree`);
      if (!t.wbs.startsWith(`${s.wbs}.`)) errors.push(`task ${t.wbs} is not under stage ${s.wbs}`);
    }
    if (t.assigneeId && !people.has(t.assigneeId)) errors.push(`task ${t.wbs}: unknown assignee ${t.assigneeId}`);
    if (t.workstreamId && !workstreams.has(t.workstreamId)) errors.push(`task ${t.wbs}: unknown workstream ${t.workstreamId}`);
    for (const d of t.dependencies) if (!tasks.has(d.predecessorId)) errors.push(`task ${t.wbs}: unknown predecessor ${d.predecessorId}`);
    if ((t.state === 'active' || t.state === 'paused' || t.state === 'complete') && !t.actual?.start) errors.push(`task ${t.wbs}: ${t.state} without an actual start`);
    if ((t.state === 'complete' || t.state === 'skipped') && !t.actual?.end) errors.push(`task ${t.wbs}: ${t.state} without an actual end`);
    if (t.state === 'skipped' && !t.skipped) errors.push(`task ${t.wbs}: skipped without a reason`);
  }
  for (const b of [...f.blockers, ...f.issues]) for (const id of b.taskIds) if (!tasks.has(id)) errors.push(`${b.number}: unknown task ${id}`);
  for (const c of f.calls) {
    if (c.checkpointTaskId && tasks.get(c.checkpointTaskId)?.kind !== 'checkpoint') errors.push(`call ${c.id}: ${c.checkpointTaskId} is not a checkpoint`);
    for (const p of c.participantIds) if (!people.has(p)) errors.push(`call ${c.id}: unknown person ${p}`);
  }

  // Dependency loops (iterative depth-first search, so 15,000 tasks do not overflow the stack).
  const state = new Map<string, 1 | 2>();
  for (const start of f.tasks) {
    if (state.has(start.id)) continue;
    const stack: [string, number][] = [[start.id, 0]];
    state.set(start.id, 1);
    while (stack.length) {
      const top = stack[stack.length - 1]!;
      const deps = tasks.get(top[0])?.dependencies ?? [];
      if (top[1] < deps.length) {
        const next = deps[top[1]++]!.predecessorId;
        if (state.get(next) === 1) {
          errors.push(`dependency loop through ${tasks.get(next)?.wbs ?? next}`);
          stack.length = 0;
          break;
        }
        if (!state.has(next) && tasks.has(next)) {
          state.set(next, 1);
          stack.push([next, 0]);
        }
      } else {
        state.set(top[0], 2);
        stack.pop();
      }
    }
  }
  return errors.length ? { errors } : { fixture: f, errors };
}
