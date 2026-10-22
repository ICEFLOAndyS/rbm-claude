import { z } from 'zod';
import { ENVIRONMENTS, EVENT_STATES, EVENT_STATUSES, type EventListFixture } from './types';
import { EVENT_COLUMNS } from './events';

/**
 * A runtime schema for the Events list fixtures, written to match `EventListFixture`. As in
 * src/data/schema.ts, the checks below fail the type check if the schema and the types drift apart,
 * and `validateEventFixture` fails the tests if a file does not match.
 */

const iso = z.iso.datetime();
const person = z.object({ id: z.string(), name: z.string() });
const number = z.string().regex(/^REV\d{6}$/);
const status = z.enum(EVENT_STATUSES);
const environment = z.enum(ENVIRONMENTS);
const state = z.enum(EVENT_STATES);
const field = z.enum(EVENT_COLUMNS.map((c) => c.field) as [(typeof EVENT_COLUMNS)[number]['field'], ...(typeof EVENT_COLUMNS)[number]['field'][]]);
const sectionId = z.enum(['details', 'schedule', 'people', 'linkedChanges', 'attention', 'upstream', 'downstream', 'changes']);

const row = z.object({
  id: z.string(),
  number,
  name: z.string().min(1),
  status,
  owner: person,
  state,
  environment,
  windowStart: iso,
  windowEnd: iso,
});

const change = z.object({ field: z.string(), label: z.string(), from: z.string(), to: z.string() });
const dependency = z.object({ event: z.object({ id: z.string(), number, name: z.string() }), status, relationship: z.enum(['waitsFor', 'runsWith']) });

const record = z.object({
  id: z.string(),
  number,
  version: z.number().int().positive(),
  permissions: z.object({ locked: z.partialRecord(sectionId, z.object({ reason: z.string().min(1) })) }),
  history: z.array(z.object({ id: z.string(), at: iso, by: person, sectionId: z.string(), changes: z.array(change) })),
  updatedAt: iso,
  updatedBy: person,
  name: z.string().min(1),
  description: z.string(),
  environment,
  state,
  windowStart: iso,
  windowEnd: iso,
  freezeAt: iso.nullable(),
  rollbackBy: iso.nullable(),
  owner: person,
  roles: z.array(z.object({ role: z.string(), person, response: z.enum(['accepted', 'awaiting', 'declined']) })),
  status,
  progress: z.object({ percent: z.number().int().min(0).max(100), complete: z.number().int().nonnegative(), total: z.number().int().nonnegative(), blocked: z.number().int().nonnegative(), atRisk: z.number().int().nonnegative(), late: z.number().int().nonnegative() }),
  linkedChanges: z.array(z.object({ number: z.string(), title: z.string(), state: z.string() })),
  attention: z.array(z.object({ wbs: z.string().regex(/^\d+\.\d+\.\d+$/), title: z.string(), reason: z.enum(['blocked', 'late', 'atRisk', 'hasIssue']), detail: z.string() })),
  upstream: z.array(dependency),
  downstream: z.array(dependency),
  createdAt: iso,
  actions: z.array(z.enum(['startRun', 'openCommandCentre'])),
});

const filters = z.object({ search: z.string(), status: z.array(status), owner: z.array(z.string()), environment: z.array(environment) });
const view = z.object({
  id: z.string(),
  name: z.string().min(1),
  kind: z.enum(['system', 'user']),
  filters,
  columns: z.object({ visible: z.array(field), widths: z.partialRecord(field, z.number().positive()).optional() }),
  sort: z.array(z.object({ field, direction: z.enum(['asc', 'desc']) })),
});

export const eventFixtureSchema = z.object({
  now: iso,
  currentUserId: z.string(),
  people: z.array(person),
  rows: z.array(row),
  records: z.array(record),
  views: z.array(view),
});

// The schema and the types must describe the same shape, both ways round.
type FromSchema = z.infer<typeof eventFixtureSchema>;
const _schemaMatchesTypes = (x: FromSchema): EventListFixture => x;
const _typesMatchSchema = (x: EventListFixture): FromSchema => x;
void _schemaMatchesTypes;
void _typesMatchSchema;

/**
 * Checks a list fixture's shape, then the links: unique ids and numbers, owners are people, every
 * record has a row that agrees with it, windows end after they start, and saved views are the user's.
 */
/** The event state each status implies: an event that is In progress, At risk or Blocked is running. */
export const stateFor = (status: (typeof EVENT_STATUSES)[number]): (typeof EVENT_STATES)[number] =>
  status === 'pending' ? 'not_started' : status === 'paused' ? 'paused' : status === 'complete' ? 'complete' : 'active';

export function validateEventFixture(data: unknown): { fixture?: EventListFixture; errors: string[] } {
  const parsed = eventFixtureSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join('.')}: ${i.message}`) };
  const f = parsed.data;
  const errors: string[] = [];
  const people = new Map(f.people.map((p) => [p.id, p]));
  if (!people.has(f.currentUserId)) errors.push(`currentUserId ${f.currentUserId} is not a person`);
  const rows = new Map<string, (typeof f.rows)[number]>();
  const numbers = new Set<string>();
  for (const r of f.rows) {
    if (rows.has(r.id)) errors.push(`duplicate row id ${r.id}`);
    if (numbers.has(r.number)) errors.push(`duplicate event number ${r.number}`);
    rows.set(r.id, r);
    numbers.add(r.number);
    if (people.get(r.owner.id)?.name !== r.owner.name) errors.push(`${r.number}: owner ${r.owner.id} is not a person`);
    if (Date.parse(r.windowEnd) <= Date.parse(r.windowStart)) errors.push(`${r.number}: window ends before it starts`);
    if (r.state !== stateFor(r.status)) errors.push(`${r.number}: state ${r.state} does not fit status ${r.status}`);
  }
  for (const rec of f.records) {
    const r = rows.get(rec.id);
    if (!r) {
      errors.push(`record ${rec.id} has no row`);
      continue;
    }
    for (const k of ['number', 'name', 'status', 'state', 'environment', 'windowStart', 'windowEnd'] as const) if (rec[k] !== r[k]) errors.push(`${r.number}: record ${k} differs from its row`);
    if (rec.owner.id !== r.owner.id) errors.push(`${r.number}: record owner differs from its row`);
    if (rec.progress.complete > rec.progress.total) errors.push(`${r.number}: more tasks complete than there are`);
    for (const d of [...rec.upstream, ...rec.downstream]) if (!rows.has(d.event.id)) errors.push(`${r.number}: depends on unknown event ${d.event.id}`);
    for (const h of rec.history) if (Date.parse(h.at) > Date.parse(f.now)) errors.push(`${r.number}: history entry ${h.id} is in the future`);
  }
  for (const v of f.views) if (v.kind !== 'user') errors.push(`view ${v.id}: fixtures hold only the user's own views`);
  return errors.length ? { errors } : { fixture: f, errors };
}
