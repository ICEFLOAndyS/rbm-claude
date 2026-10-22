import { EVENT_COLUMNS, STATE_LABELS, STATUS_LABELS, eventSystemViews } from './events';

describe('the Events list, as drawn on the Page templates board (Runbooks replaced by Events)', () => {
  it('has the board’s columns with Event ID added, Progress removed and Phase called State', () => {
    expect(EVENT_COLUMNS.map((c) => c.header)).toEqual(['Event ID', 'Event', 'Status', 'Owner', 'State', 'Window']);
  });

  it('labels status as the board does, and state as the Command Centre does', () => {
    expect(Object.values(STATUS_LABELS)).toEqual(['In progress', 'At risk', 'Blocked', 'Paused', 'Pending', 'Complete']);
    expect(Object.values(STATE_LABELS)).toEqual(['Not started', 'Active', 'Paused', 'Complete']);
  });

  it('opens on the drawn "View: Active", which hides Complete events', () => {
    const [active] = eventSystemViews();
    expect(active).toMatchObject({ id: 'active', name: 'Active' });
    expect(active!.filters.status).not.toContain('complete');
  });
});
