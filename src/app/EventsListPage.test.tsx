import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { useState } from 'react';
import { EventsListPage, countLine, type EventsListAddress, type EventsListPageProps } from './EventsListPage';
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
