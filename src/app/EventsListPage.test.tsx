import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { useState } from 'react';
import { EventsListPage, countLine, withScenarioColumn, type EventsListAddress, type EventsListPageProps } from './EventsListPage';
import { rbmTheme } from '../theme/theme';
import { createMockEventServer, type MockServerOptions } from '../data/list/mockServer';
import { createLocalListPreferenceStore } from '../data/list/preferenceStore';
import { EVENT_COLUMNS, eventSystemViews } from '../data/list/events';
import { EMPTY_EVENT_FILTERS, type EventColumnField } from '../data/list/types';
import { eventsBoard, eventsEmpty, PEOPLE } from '../fixtures/events/build';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

function Harness({ fixture = eventsBoard(), server: options = {}, over = {}, start = {} }: { fixture?: ReturnType<typeof eventsBoard>; server?: MockServerOptions; over?: Partial<EventsListPageProps>; start?: EventsListAddress }) {
  const [data] = useState(() => createMockEventServer(fixture, { latencyMs: 0, ...options }));
  const [preferences] = useState(() => createLocalListPreferenceStore<EventColumnField>('test', EVENT_COLUMNS.map((c) => c.field), memoryStorage()));
  const [address, setAddress] = useState<EventsListAddress>(start);
  return (
    <ThemeProvider theme={rbmTheme}>
      <EventsListPage data={data} preferences={preferences} people={PEOPLE} address={address} onAddressChange={setAddress} onNew={() => {}} disableVirtualization {...over} />
      <output data-testid="address">{JSON.stringify(address)}</output>
    </ThemeProvider>
  );
}

const active = eventSystemViews().find((v) => v.id === 'active')!.filters;
const dataRows = () => screen.getAllByRole('row').filter((r) => r.getAttribute('data-id'));

describe('countLine', () => {
  it('reads as drawn: the total, then what the user added to the view', () => {
    expect(countLine(128, active, active, PEOPLE)).toBe('128 events');
    expect(countLine(12, { ...active, environment: ['production'] }, active, PEOPLE)).toBe('12 events · filtered to Production');
    expect(countLine(1, { ...EMPTY_EVENT_FILTERS, search: ' payroll ' }, EMPTY_EVENT_FILTERS, PEOPLE)).toBe('1 event · matching “payroll”');
    expect(countLine(15000, EMPTY_EVENT_FILTERS, EMPTY_EVENT_FILTERS, PEOPLE)).toBe('15,000 events');
  });
});

describe('EventsListPage', () => {
  it('opens on the Active view: the header, the count and a page of events', async () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument();
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    const shown = dataRows().length;
    expect(screen.getByText(`${shown} ${shown === 1 ? 'event' : 'events'}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New event' })).toBeInTheDocument();
  });

  it('says what the user filtered to', async () => {
    render(<Harness />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: 'Environment' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Filter by environment' })).getByRole('checkbox', { name: 'Production' }));
    await waitFor(() => expect(screen.getByText(/filtered to Production/)).toBeInTheDocument());
  });

  it('opens a row in the slide-in, keeps it in the address, and returns focus to the row on close', async () => {
    render(<Harness />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    const row = dataRows()[0]!;
    const id = row.getAttribute('data-id')!;
    await userEvent.click(within(row).getAllByRole('gridcell')[2]!);
    await waitFor(() => expect(screen.getByTestId('address')).toHaveTextContent(`"record":"${id}"`));
    await userEvent.click(await screen.findByRole('button', { name: 'Close panel' }));
    expect(screen.getByTestId('address')).toHaveTextContent('{}');
    await waitFor(() => expect(document.activeElement?.closest('.MuiDataGrid-row')?.getAttribute('data-id')).toBe(id));
  });

  it('puts the Command Centre icon on running events only, and it opens that event, not the record', async () => {
    const onOpenCommandCentre = vi.fn();
    render(<Harness over={{ onOpenCommandCentre }} />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    const rows = eventsBoard().rows;
    const running = rows.find((r) => r.state === 'active')!;
    const notRunning = rows.find((r) => r.state !== 'active' && r.state !== 'paused');
    const button = await screen.findByRole('button', { name: `Open Command Centre, ${running.number}` });
    if (notRunning) expect(screen.queryByRole('button', { name: `Open Command Centre, ${notRunning.number}` })).toBeNull();
    await userEvent.click(button);
    expect(onOpenCommandCentre).toHaveBeenCalledWith(expect.objectContaining({ id: running.id, number: running.number }));
    // The icon goes to the Command Centre; it does not also open the record.
    expect(screen.getByTestId('address')).toHaveTextContent('{}');
  });

  it('puts the Exec Centre icon beside the Command Centre one, on the same running events, and it opens that event', async () => {
    const onOpenCommandCentre = vi.fn();
    const onOpenExecCentre = vi.fn();
    render(<Harness over={{ onOpenCommandCentre, onOpenExecCentre }} />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    const rows = eventsBoard().rows;
    const running = rows.find((r) => r.state === 'active')!;
    const notRunning = rows.find((r) => r.state !== 'active' && r.state !== 'paused');
    const exec = await screen.findByRole('button', { name: `Open Exec Centre, ${running.number}` });
    expect(exec.querySelector('svg')).toHaveAttribute('data-icon', 'centre.executiveBriefing');
    const cell = exec.closest<HTMLElement>('[role="gridcell"]')!;
    expect(within(cell).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([`Open Command Centre, ${running.number}`, `Open Exec Centre, ${running.number}`]);
    if (notRunning) expect(screen.queryByRole('button', { name: `Open Exec Centre, ${notRunning.number}` })).toBeNull();
    expect(screen.getByText('Centres')).toBeInTheDocument();
    await userEvent.click(exec);
    expect(onOpenExecCentre).toHaveBeenCalledWith(expect.objectContaining({ id: running.id, number: running.number }));
    expect(onOpenCommandCentre).not.toHaveBeenCalled();
    expect(screen.getByTestId('address')).toHaveTextContent('{}');
  });

  it('has no Exec Centre icon without its handler', async () => {
    render(<Harness over={{ onOpenCommandCentre: vi.fn() }} />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /Open Exec Centre/ })).toBeNull();
  });

  it('has no Command Centre icon without a handler', async () => {
    render(<Harness />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /Open Command Centre/ })).toBeNull();
  });

  it('opens the Command Centre from the record panel too', async () => {
    const onOpenCommandCentre = vi.fn();
    const running = eventsBoard().records.find((r) => r.actions.includes('openCommandCentre'))!;
    render(<Harness over={{ onOpenCommandCentre }} start={{ record: running.id }} />);
    const dialog = await screen.findByRole('dialog', { name: `${running.number} ${running.name}` });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Open Command Centre' }));
    expect(onOpenCommandCentre).toHaveBeenCalledWith(expect.objectContaining({ id: running.id, number: running.number }));
  });

  it('opens the record in the address straight away (deep link)', async () => {
    const id = eventsBoard().rows[0]!.id;
    render(<Harness start={{ record: id }} />);
    expect(await screen.findByRole('button', { name: 'Close panel' })).toBeInTheDocument();
  });

  it('swaps the toolbar for the bulk bar while rows are selected', async () => {
    render(<Harness />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    await userEvent.click(within(dataRows()[0]!).getByRole('checkbox'));
    expect(screen.getByRole('toolbar', { name: 'Actions for 1 event selected' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Find events' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByRole('group', { name: 'Find events' })).toBeInTheDocument();
  });

  it('with no events at all, says so and offers New event', async () => {
    const onNew = vi.fn();
    render(<Harness fixture={eventsEmpty()} over={{ onNew }} />);
    // The Active view filters the status, so the page first shows the filtered empty state.
    await userEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'New event' }).at(-1)!);
    expect(onNew).toHaveBeenCalled();
  });

  it('fails with a reference, then Retry recovers', async () => {
    function Failing() {
      const [data] = useState(() => {
        const s = createMockEventServer(eventsBoard(), { latencyMs: 0 });
        s.failNext('query', 'failed');
        return s;
      });
      const [preferences] = useState(() => createLocalListPreferenceStore<EventColumnField>('t', EVENT_COLUMNS.map((c) => c.field), memoryStorage()));
      return (
        <ThemeProvider theme={rbmTheme}>
          <EventsListPage data={data} preferences={preferences} people={PEOPLE} disableVirtualization />
        </ThemeProvider>
      );
    }
    render(<Failing />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load events.');
    expect(alert).toHaveTextContent(/Reference: REF-/);
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
  });

  it('says who to ask when the user has no access, and never shows a blank page', async () => {
    render(<Harness server={{ fail: { query: 'noAccess' } }} />);
    expect(await screen.findByRole('heading', { name: 'You do not have access to events.' })).toBeInTheDocument();
    expect(screen.getByText(/Ask your RBM administrator/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument();
  });
});

describe('EventsListPage: the scenario filter (app shell brief 4b)', () => {
  function Scoped({ start }: { start: ('planned-change' | 'disaster-recovery')[] }) {
    const [shown, setShown] = useState(start);
    return <Harness over={{ scenarios: { available: ['planned-change', 'disaster-recovery'], profile: ['planned-change'], value: shown, onChange: (s) => setShown(s as typeof start) } }} />;
  }

  it('has no header control (Andy Smith, 26 Oct 2026): the pill shows the scenarios, and the list holds those events', async () => {
    render(<Scoped start={['planned-change']} />);
    expect(screen.queryByRole('button', { name: /^Scenario: / })).toBeNull();
    expect(screen.getByRole('button', { name: /^Scenario · 1/ })).toBeInTheDocument();
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
  });

  it('says nothing matches in the scenarios shown, and Show all brings the events back', async () => {
    // The board's eight events are all Planned Change.
    render(<Scoped start={['disaster-recovery']} />);
    await waitFor(() => expect(screen.getByText('No Events in the scenarios you are showing')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: /^Scenario · 2/ })).toBeInTheDocument();
  });
});

describe('the Scenario column: only for users with more than one scenario in their profile', () => {
  const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent?.trim()).filter(Boolean);
  const scoped = (profile: ('planned-change' | 'disaster-recovery')[]) => ({ scenarios: { available: ['planned-change', 'disaster-recovery'] as ('planned-change' | 'disaster-recovery')[], profile, value: profile, onChange: () => {} } });

  it('is not shown with one scenario in the profile', async () => {
    render(<Harness over={scoped(['planned-change'])} />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    expect(headers()).not.toContain('Scenario');
  });

  it('is shown after State with two, and names each event’s scenario in words', async () => {
    render(<Harness over={scoped(['planned-change', 'disaster-recovery'])} />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    const h = headers();
    expect(h.indexOf('Scenario')).toBe(h.indexOf('State') + 1);
    expect(within(dataRows()[0]!).getByText('Planned Change')).toBeInTheDocument();
  });

  it('withScenarioColumn adds it after State, or at the end, and takes it out', () => {
    expect(withScenarioColumn({ visible: ['name', 'state', 'windowStart'] }, true).visible).toEqual(['name', 'state', 'scenario', 'windowStart']);
    expect(withScenarioColumn({ visible: ['name', 'windowStart'] }, true).visible).toEqual(['name', 'windowStart', 'scenario']);
    expect(withScenarioColumn({ visible: ['name', 'scenario', 'state'] }, false).visible).toEqual(['name', 'state']);
  });
});

describe('the Scenario pill in the filter bar', () => {
  function Scoped() {
    const [shown, setShown] = useState<('planned-change' | 'disaster-recovery')[]>(['planned-change']);
    return <Harness over={{ scenarios: { available: ['planned-change', 'disaster-recovery'], profile: ['planned-change'], value: shown, onChange: (s) => setShown(s as typeof shown) } }} />;
  }

  it('comes first, starts from the profile, and counts the scenarios ticked', async () => {
    render(<Scoped />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    const pill = screen.getByRole('button', { name: /^Scenario · 1/ });
    await userEvent.click(pill);
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Filter by scenario' })).getByRole('checkbox', { name: 'Disaster Recovery' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Scenario · 2/, hidden: true })).toBeInTheDocument());
  });

  it('Clear puts it back to the profile, its default', async () => {
    render(<Scoped />);
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: /^Scenario · 1/ }));
    const menu = screen.getByRole('dialog', { name: 'Filter by scenario' });
    await userEvent.click(within(menu).getByRole('checkbox', { name: 'Disaster Recovery' }));
    await userEvent.click(within(menu).getByRole('button', { name: 'Clear: scenario' }));
    expect(within(menu).getByRole('checkbox', { name: 'Planned Change' })).toBeChecked();
    expect(within(menu).getByRole('checkbox', { name: 'Disaster Recovery' })).not.toBeChecked();
  });
});
