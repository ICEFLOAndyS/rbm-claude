import type { RbmRibbonRunbook } from '../components/RbmEventRibbon/RbmEventRibbon';

/** A time on the board's cutover night: 22:00 on 24 May to the morning of 25 May (UTC). */
export const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return new Date(Date.UTC(2026, 4, h >= 12 ? 24 : 25, h, m));
};

/** "Now" on the Command board. */
export const ribbonNow = at('03:40');

/**
 * Mock planning-engine data for the Event ribbon, as drawn on the Command board. Stage times
 * are forecast times, so the last stage of a late runbook runs to its forecast end.
 */
export function mockRibbon(): RbmRibbonRunbook[] {
  return [
    {
      id: 'rb1',
      wbs: '1',
      name: 'Payroll cutover',
      plannedEnd: at('06:00'),
      forecastEnd: at('06:12'),
      rag: 'amber',
      gapMinutes: 12,
      stages: [
        { id: '1.1', wbs: '1.1', name: 'Prepare', start: at('22:00'), end: at('23:30'), state: 'complete' },
        { id: '1.2', wbs: '1.2', name: 'Extract and stop', start: at('23:30'), end: at('02:00'), state: 'complete' },
        { id: '1.3', wbs: '1.3', name: 'Migrate and start up', start: at('02:00'), end: at('04:30'), state: 'active' },
        { id: '1.4', wbs: '1.4', name: 'Verify', start: at('04:30'), end: at('05:30'), state: 'pending' },
        { id: '1.5', wbs: '1.5', name: 'Hand over', start: at('05:30'), end: at('06:12'), state: 'pending' },
      ],
      markers: [
        { id: 'm1', kind: 'milestone', wbs: '1.2.9', name: 'Data extracted', at: at('02:00'), state: 'complete' },
        { id: 'm2', kind: 'milestone', wbs: '1.3.9', name: 'Services started', at: at('04:30'), state: 'pending' },
        { id: 'm3', kind: 'milestone', wbs: '1.4.9', name: 'Verified', at: at('05:30'), state: 'pending' },
        { id: 'c1', kind: 'checkpoint', wbs: '1.5.2', name: 'Go / No-Go', at: at('05:45'), state: 'pending' },
      ],
    },
    {
      id: 'rb2',
      wbs: '2',
      name: 'Interfaces',
      plannedEnd: at('05:00'),
      forecastEnd: at('05:27'),
      rag: 'red',
      gapMinutes: 27,
      stages: [{ id: '2.1', wbs: '2.1', name: 'Switch interfaces', start: at('03:00'), end: at('05:27'), state: 'active' }],
    },
    {
      id: 'rb3',
      wbs: '3',
      name: 'Reporting',
      plannedEnd: at('05:40'),
      forecastEnd: at('05:40'),
      rag: 'green',
      gapMinutes: 0,
      stages: [{ id: '3.1', wbs: '3.1', name: 'Rebuild reports', start: at('04:00'), end: at('05:40'), state: 'pending' }],
    },
  ];
}

/** Not drawn on the board: a runbook whose stages overlap, 2, 3 and then 5 at once. */
export function mockOverlappingRunbook(): RbmRibbonRunbook {
  return {
    id: 'rb4',
    wbs: '4',
    name: 'Data centre move',
    plannedEnd: at('05:00'),
    forecastEnd: at('05:15'),
    rag: 'amber',
    gapMinutes: 15,
    stages: [
      { id: '4.1', wbs: '4.1', name: 'Shut down rack A', start: at('22:00'), end: at('23:30'), state: 'complete' },
      { id: '4.2', wbs: '4.2', name: 'Shut down rack B', start: at('22:30'), end: at('23:45'), state: 'complete' },
      { id: '4.3', wbs: '4.3', name: 'Move storage', start: at('00:00'), end: at('01:30'), state: 'complete' },
      { id: '4.4', wbs: '4.4', name: 'Move network', start: at('00:15'), end: at('01:15'), state: 'complete' },
      { id: '4.5', wbs: '4.5', name: 'Move compute', start: at('00:30'), end: at('01:45'), state: 'complete' },
      { id: '4.6', wbs: '4.6', name: 'Cable rack A', start: at('02:00'), end: at('03:30'), state: 'complete' },
      { id: '4.7', wbs: '4.7', name: 'Cable rack B', start: at('02:00'), end: at('04:00'), state: 'active' },
      { id: '4.8', wbs: '4.8', name: 'Power on storage', start: at('02:15'), end: at('03:45'), state: 'active' },
      { id: '4.9', wbs: '4.9', name: 'Power on network', start: at('02:30'), end: at('04:15'), state: 'active' },
      { id: '4.10', wbs: '4.10', name: 'Power on compute', start: at('02:45'), end: at('05:15'), state: 'pending' },
    ],
    markers: [{ id: 'm4', kind: 'milestone', wbs: '4.5.9', name: 'Kit moved', at: at('01:45'), state: 'complete' }],
  };
}
