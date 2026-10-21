/** Layout maths for the Event ribbon: one time scale, stage packing and lane heights. */

export interface Interval {
  id: string;
  start: Date;
  end: Date;
}

/** Lane geometry at D1. A lane with one sub-row is 54 px, as drawn; each extra sub-row adds 28 px. */
export const lane = {
  base: 54,
  subRow: 28,
  /** Milestones and checkpoints sit on a thin line at this height, above the stage rows. */
  markerLine: 11,
  /** Top of the first sub-row. Each sub-row is a WBS label (12 px) over a 14 px bar. */
  firstRow: 21,
  labelHeight: 13,
  barHeight: 14,
  /** Sub-rows shown before "+n more stages overlapping". */
  maxRows: 3,
} as const;

export function laneHeight(rows: number) {
  return lane.base + lane.subRow * (Math.max(rows, 1) - 1);
}

/** Maps a time to a horizontal position. One scale function for the whole ribbon. */
export function timeScale(windowStart: Date, windowEnd: Date, x0: number, x1: number) {
  const t0 = windowStart.getTime();
  const span = windowEnd.getTime() - t0;
  return (t: Date) => x0 + ((t.getTime() - t0) / span) * (x1 - x0);
}

const HOUR = 3_600_000;

/**
 * The default window: from the hour before the earliest start to the half hour after the
 * latest end, so the forecast overrun and the now marker always fit.
 */
export function defaultWindow(times: Date[]) {
  const ms = times.map((t) => t.getTime());
  const start = Math.floor(Math.min(...ms) / HOUR) * HOUR;
  const end = Math.ceil(Math.max(...ms) / (HOUR / 2)) * (HOUR / 2);
  return { start: new Date(start), end: new Date(end === start ? start + HOUR : end) };
}

/** Hour gridlines, thinned so labels stay at least 60 px apart. */
export function hourTicks(windowStart: Date, windowEnd: Date, pxPerHour: number) {
  const step = [1, 2, 3, 4, 6, 12, 24].find((h) => h * pxPerHour >= 60) ?? 24;
  const ticks: Date[] = [];
  for (let t = Math.ceil(windowStart.getTime() / (step * HOUR)) * step * HOUR; t <= windowEnd.getTime(); t += step * HOUR) {
    ticks.push(new Date(t));
  }
  return ticks;
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/**
 * Interval packing, judged on forecast times: sort by start and put each stage in the first
 * sub-row where it does not overlap, opening a new row only when none is free (fewest rows).
 * A stage keeps the row it had before (`previous`) while that row is still free, so bars do
 * not jump as the forecast moves.
 */
export function packStages(stages: Interval[], previous?: ReadonlyMap<string, number>) {
  const sorted = [...stages].sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id));
  const rows: Interval[][] = [];
  const placed = new Map<string, number>();
  const fits = (row: number, s: Interval) => !(rows[row] ?? []).some((o) => overlaps(o, s));
  const put = (row: number, s: Interval) => {
    (rows[row] ??= []).push(s);
    placed.set(s.id, row);
  };

  // Stages that had a row keep it first, in start order, wherever it is still free.
  const rest: Interval[] = [];
  for (const s of sorted) {
    const before = previous?.get(s.id);
    if (before !== undefined && fits(before, s)) put(before, s);
    else rest.push(s);
  }
  for (const s of rest) {
    let row = 0;
    while (!fits(row, s)) row++;
    put(row, s);
  }
  return { rows: placed, count: rows.length };
}
