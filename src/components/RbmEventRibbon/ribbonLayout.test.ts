import { defaultWindow, hourTicks, laneHeight, packStages, timeScale, type Interval } from './ribbonLayout';

const at = (hhmm: string, day = 24) => new Date(`2026-05-${day}T${hhmm}:00Z`);
const stage = (id: string, from: string, to: string, toDay = 24): Interval => ({ id, start: at(from), end: at(to, toDay) });

describe('timeScale', () => {
  it('maps the board’s window to the board’s pixels (22:00 at 188, 06:00 at 962.9)', () => {
    const x = timeScale(at('22:00'), at('06:30', 25), 188, 1011.3);
    expect(x(at('22:00'))).toBeCloseTo(188, 1);
    expect(x(at('06:00', 25))).toBeCloseTo(962.9, 0);
    expect(x(at('03:40', 25))).toBeCloseTo(736.9, 0);
  });
});

describe('packStages', () => {
  it('keeps a lane with no overlap on one row', () => {
    const { count } = packStages([stage('a', '22:00', '23:00'), stage('b', '23:00', '23:30'), stage('c', '23:30', '23:59')]);
    expect(count).toBe(1);
  });

  it.each([
    [2, 2],
    [3, 3],
    [5, 5],
  ])('opens %i rows for %i stages running at once', (n, rows) => {
    const stages = Array.from({ length: n }, (_, i) => stage(`s${i}`, '22:00', '23:00'));
    expect(packStages(stages).count).toBe(rows);
  });

  it('uses the fewest rows: a free row is reused before a new one opens', () => {
    const { rows, count } = packStages([stage('a', '22:00', '23:00'), stage('b', '22:30', '23:30'), stage('c', '23:00', '23:45')]);
    expect(count).toBe(2);
    expect(rows.get('c')).toBe(0);
  });

  it('judges overlap on the given (forecast) times, with touching stages not overlapping', () => {
    expect(packStages([stage('a', '22:00', '23:00'), stage('b', '23:00', '23:30')]).count).toBe(1);
  });

  it('keeps a stage on its row as the forecast moves, so bars do not jump', () => {
    const first = packStages([stage('a', '22:00', '23:00'), stage('b', '22:30', '23:30'), stage('c', '23:15', '23:45')]);
    expect(first.rows.get('c')).toBe(0);
    // b slips later; without memory c would move to row 1, with it c stays where it was.
    const moved = packStages([stage('a', '22:00', '23:00'), stage('b', '23:20', '23:50'), stage('c', '23:15', '23:45')], first.rows);
    expect(moved.rows.get('c')).toBe(0);
    expect(moved.rows.get('b')).toBe(1);
  });

  it('handles a long runbook of dozens of stages in sequence on one row', () => {
    const stages = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, start: new Date(at('22:00').getTime() + i * 600_000), end: new Date(at('22:00').getTime() + (i + 1) * 600_000) }));
    expect(packStages(stages).count).toBe(1);
  });

  it('handles a runbook with no stages', () => {
    expect(packStages([]).count).toBe(0);
  });
});

describe('laneHeight', () => {
  it('is 54 px for one row and grows 28 px per extra sub-row', () => {
    expect(laneHeight(0)).toBe(54);
    expect(laneHeight(1)).toBe(54);
    expect(laneHeight(2)).toBe(82);
    expect(laneHeight(3)).toBe(110);
  });
});

describe('defaultWindow and hourTicks', () => {
  it('runs from the hour before the first start to the half hour after the last end', () => {
    const w = defaultWindow([at('22:00'), at('06:12', 25), at('03:40', 25)]);
    expect(w.start).toEqual(at('22:00'));
    expect(w.end).toEqual(at('06:30', 25));
  });

  it('labels every hour when there is room, and thins them when there is not', () => {
    expect(hourTicks(at('22:00'), at('06:30', 25), 96.9)).toHaveLength(9);
    const day = hourTicks(at('00:00'), at('00:00', 25), 30);
    expect(day.every((t) => t.getUTCHours() % 2 === 0)).toBe(true);
  });
});
