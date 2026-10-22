/**
 * The events the Command Centre prototype can open. The Command Centre fixtures (build.ts) take their
 * number and name from here, and the Events list fixtures (events/build.ts) list them as rows, so
 * "Open Command Centre" on a row and the Command Centre agree on the Event ID.
 *
 * REV000001 to REV000008 are the eight events drawn on the Page templates board; these follow them.
 * The windows are the ones the Command Centre fixtures plan; fixtures.test.ts checks they still match.
 */
import type { EventStatus } from '../data/list/types';

export interface CommandCentreEventRef {
  /** The fixture the Command Centre loads (src/fixtures/<fixture>.json). */
  fixture: 'weekend-payroll-cutover' | 'healthy-event' | 'badly-late-event' | 'large-event';
  number: string;
  name: string;
  windowStart: string;
  windowEnd: string;
  /** The status the Events list shows (from the scenario's forecast: +12 Amber, on time, +45 Red). */
  status: EventStatus;
}

export const COMMAND_CENTRE_EVENTS = [
  { fixture: 'weekend-payroll-cutover', number: 'REV000009', name: 'Weekend Payroll Cutover', windowStart: '2026-05-24T22:00:00Z', windowEnd: '2026-05-25T06:00:00Z', status: 'atRisk' },
  { fixture: 'healthy-event', number: 'REV000010', name: 'Weekend Payroll Cutover (healthy)', windowStart: '2026-05-24T22:00:00Z', windowEnd: '2026-05-25T06:00:00Z', status: 'active' },
  { fixture: 'badly-late-event', number: 'REV000011', name: 'Weekend Payroll Cutover (late)', windowStart: '2026-05-24T22:00:00Z', windowEnd: '2026-05-25T06:00:00Z', status: 'atRisk' },
  { fixture: 'large-event', number: 'REV000012', name: 'Data Centre Migration (large)', windowStart: '2026-05-24T22:00:00Z', windowEnd: '2026-05-26T01:21:00Z', status: 'active' },
] as const satisfies readonly CommandCentreEventRef[];

export const commandCentreEvent = (fixture: CommandCentreEventRef['fixture']) => COMMAND_CENTRE_EVENTS.find((e) => e.fixture === fixture)!;
