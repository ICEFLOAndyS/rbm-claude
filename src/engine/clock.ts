import type { Clock } from '../data/interfaces';

export interface SimClock extends Clock {
  /** Simulated seconds per real second: 0 stops the clock, 1 is real time, 60 runs a minute a second. */
  speed: number;
  setSpeed(speed: number): void;
  /** Jumps to a time, for example back to the fixture's start. */
  set(time: Date): void;
  /** Stops the timer. */
  dispose(): void;
}

/**
 * A simulated clock for the prototype. It ticks once a real second (or every `tickMs`), moving on
 * by `speed` seconds, and tells its listeners. Replace it with a real clock in production.
 */
export function createSimClock(start: Date, { speed = 1, tickMs = 1000 }: { speed?: number; tickMs?: number } = {}): SimClock {
  let current = start.getTime();
  let rate = speed;
  const listeners = new Set<(now: Date) => void>();
  const emit = () => {
    const now = new Date(current);
    for (const l of listeners) l(now);
  };
  const timer = setInterval(() => {
    if (rate === 0) return;
    current += rate * tickMs;
    emit();
  }, tickMs);
  return {
    now: () => new Date(current),
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get speed() {
      return rate;
    },
    setSpeed(s) {
      rate = Math.max(0, s);
    },
    set(time) {
      current = time.getTime();
      emit();
    },
    dispose: () => clearInterval(timer),
  };
}
