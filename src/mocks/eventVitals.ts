import type { RbmEventVitalsData, RbmRag } from '../components/RbmEventVitals/RbmEventVitals';

/**
 * Mock planning-engine data for the Event vitals, with the values drawn on the Command board (version 136,
 * REV000009 Weekend Payroll Cutover): Work 62% (18 h 30 min done, 11 h 15 min to do), tasks 84 of 124, five open
 * issues, started 22:00, forecast 06:12 (+12 min, Amber). Times are UTC; pass timeZone="UTC" to show them as drawn.
 * Replaced by the ServiceNow adapter once the attribute names are known.
 */
export function mockEventVitals(
  forecast: { rag: RbmRag; gapMinutes: number } = { rag: 'amber', gapMinutes: 12 },
  over: Partial<Pick<RbmEventVitalsData, 'work' | 'eventComplete' | 'tasks' | 'issues'>> = {},
): RbmEventVitalsData {
  const plannedEnd = new Date('2026-05-25T06:00:00Z');
  return {
    work: { doneMinutes: 18 * 60 + 30, todoMinutes: 11 * 60 + 15 },
    eventComplete: false,
    tasks: { complete: 84, active: 3, blocked: 2, total: 124 },
    issues: { high: 1, medium: 3, low: 1 },
    start: { time: new Date('2026-05-24T22:00:00Z'), elapsedMinutes: 340, plannedMinutes: 480 },
    forecast: {
      ...forecast,
      plannedEnd,
      end: new Date(plannedEnd.getTime() + forecast.gapMinutes * 60_000),
    },
    ...over,
  };
}
