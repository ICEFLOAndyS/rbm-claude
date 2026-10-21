import type { Clock, CommandCentreActions, CommandCentreData } from './interfaces';
import type { CommandCentreSnapshot, EventFixture, EventRecords } from './types';
import { applyCommand, computeSnapshot, DEFAULT_SETTINGS, type EngineSettings } from '../engine/engine';

export type FixtureSource = CommandCentreData & CommandCentreActions & { dispose(): void; records(): EventRecords };

/**
 * The prototype's data source: a JSON fixture run by the fake engine on a clock. It implements the
 * same interfaces the ServiceNow source will, so the page cannot tell the difference.
 */
export function createFixtureSource(fixture: EventFixture, clock: Clock, settings: EngineSettings = DEFAULT_SETTINGS): FixtureSource {
  const { startsAt: _s, currentUserId, ...initial } = fixture;
  let records: EventRecords = initial;
  let snapshot: CommandCentreSnapshot = computeSnapshot(records, clock.now(), currentUserId, settings);
  const listeners = new Set<(s: CommandCentreSnapshot) => void>();
  const refresh = () => {
    snapshot = computeSnapshot(records, clock.now(), currentUserId, settings);
    for (const l of listeners) l(snapshot);
  };
  const stopClock = clock.subscribe(refresh);
  return {
    getSnapshot: () => snapshot,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    async dispatch(command) {
      const out = applyCommand(records, command, clock.now(), currentUserId, settings);
      records = out.records;
      refresh();
      return out.result;
    },
    records: () => records,
    dispose: stopClock,
  };
}
