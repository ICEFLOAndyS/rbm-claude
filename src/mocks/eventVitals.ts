import type { RbmEventVitalsData, RbmRag } from '../components/RbmEventVitals/RbmEventVitals';

/**
 * Mock planning-engine data for the Event vitals, with the values drawn on the Command
 * board (REV000009 Weekend Payroll Cutover). Times are UTC; pass timeZone="UTC" to show them as drawn.
 * Replaced by the ServiceNow adapter once the attribute names are known.
 */
export function mockEventVitals(forecast: { rag: RbmRag; gapMinutes: number } = { rag: 'amber', gapMinutes: 12 }): RbmEventVitalsData {
  const plannedEnd = new Date('2026-05-25T06:00:00Z');
  return {
    progress: { complete: 84, active: 3, blocked: 2, total: 124 },
    issues: { high: 1, medium: 3, low: 1 },
    start: { at: new Date('2026-05-24T22:00:00Z'), elapsedMinutes: 340, plannedMinutes: 480 },
    forecast: {
      ...forecast,
      plannedEnd,
      end: new Date(plannedEnd.getTime() + forecast.gapMinutes * 60_000),
    },
  };
}
