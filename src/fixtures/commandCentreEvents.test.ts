import { COMMAND_CENTRE_EVENTS } from './commandCentreEvents';
import { largeEvent } from './build';
import { events128, eventsLarge } from './events/build';
import { stateFor } from '../data/list/schema';
import weekend from './weekend-payroll-cutover.json';
import healthy from './healthy-event.json';
import late from './badly-late-event.json';

const commandCentre = { 'weekend-payroll-cutover': weekend.event, 'healthy-event': healthy.event, 'badly-late-event': late.event, 'large-event': largeEvent().event };

describe('the Command Centre and the Events list agree on Event IDs', () => {
  it.each(COMMAND_CENTRE_EVENTS.map((e) => [e.number, e] as const))('%s has the same number, name and window in the Command Centre fixture', (_, e) => {
    const event = commandCentre[e.fixture];
    expect(event).toMatchObject({ number: e.number, name: e.name, window: { start: e.windowStart, end: e.windowEnd } });
  });

  it.each([
    ['events-128', events128()],
    ['events-large', eventsLarge()],
  ])('%s lists each Command Centre event under the same number, name and window', (_, fixture) => {
    for (const e of COMMAND_CENTRE_EVENTS) {
      const rows = fixture.rows.filter((r) => r.number === e.number);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ name: e.name, windowStart: e.windowStart, windowEnd: e.windowEnd, status: e.status, state: stateFor(e.status) });
    }
  });

  it('the Command Centre’s event state fits the list’s status', () => {
    for (const e of COMMAND_CENTRE_EVENTS) expect(commandCentre[e.fixture].state).toBe(stateFor(e.status));
  });
});
