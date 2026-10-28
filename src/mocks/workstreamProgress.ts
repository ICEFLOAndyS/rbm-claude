import type { RbmWorkstreamProgressItem } from '../components/RbmWorkstreamProgress/RbmWorkstreamProgress';

const at = (day: number, time: string) => new Date(`2026-10-${day}T${time}:00Z`);

type Row = [string, string, string, number, string, number, string, RbmWorkstreamProgressItem['state'], number, number, [number, number, number], boolean];

// The Progress board's sample (times in UTC), plus the two rows behind "+2 more workstreams".
const rows: Row[] = [
  ['Platform engineering', 'M. Okafor', 'MO', 24, '22:00', 25, '01:00', 'complete', 24, 24, [0, 0, 0], false],
  ['Infrastructure', 'T. Brooks', 'TB', 24, '22:00', 25, '02:30', 'active', 41, 50, [0, 1, 2], false],
  ['Network', 'R. Patel', 'RP', 24, '22:30', 25, '03:00', 'active', 5, 16, [1, 2, 0], true],
  ['Security', 'K. Wong', 'KW', 24, '23:00', 25, '03:30', 'active', 27, 30, [0, 0, 1], false],
  ['Data', 'L. Moreau', 'LM', 24, '23:30', 25, '04:00', 'active', 28, 60, [2, 1, 1], true],
  ['Applications', 'J. Davies', 'JD', 25, '00:00', 25, '04:30', 'active', 32, 50, [0, 2, 3], false],
  ['Middleware', 'A. Smith', 'AS', 25, '00:30', 25, '04:30', 'active', 11, 20, [0, 1, 0], false],
  ['Monitoring', 'L. Chen', 'LC', 25, '01:00', 25, '05:00', 'active', 3, 15, [0, 1, 2], true],
  ['Backup and recovery', 'J. Novak', 'JN', 25, '01:30', 25, '05:30', 'paused', 2, 17, [0, 0, 1], false],
  ['Database', 'S. Ahmed', 'SA', 25, '02:00', 25, '06:00', 'scheduled', 0, 18, [0, 0, 0], false],
  ['Service desk', 'P. Grant', 'PG', 25, '03:00', 25, '07:00', 'scheduled', 0, 12, [0, 0, 0], false],
  ['Decommissioning', 'E. Silva', 'ES', 25, '04:00', 25, '08:00', 'scheduled', 0, 9, [0, 0, 0], false],
];

/** Twelve workstreams, as drawn on the Progress board. The card shows ten, then "+2 more workstreams". */
export function mockWorkstreamProgress(count = rows.length): RbmWorkstreamProgressItem[] {
  return rows.slice(0, count).map(([name, owner, initials, sd, st, ed, et, state, complete, total, [high, medium, low], late], i) => ({
    id: `ws-${i + 1}`,
    name,
    owner: { name: owner, initials },
    start: at(sd, st),
    end: at(ed, et),
    state,
    complete,
    total,
    issues: { high, medium, low },
    late,
  }));
}

/**
 * The same sample moved to start at `start` (the board's first workstream starts 24 Oct 22:00), for a page that
 * shows it beside a real event. The data model has no workstreams yet, so the Exec Briefing Centre uses this.
 */
export function mockWorkstreamProgressFrom(start: Date, count = rows.length): RbmWorkstreamProgressItem[] {
  const shift = start.getTime() - at(24, '22:00').getTime();
  return mockWorkstreamProgress(count).map((w) => ({ ...w, start: new Date(w.start.getTime() + shift), end: new Date(w.end.getTime() + shift) }));
}
