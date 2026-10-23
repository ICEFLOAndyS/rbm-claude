import { createRef, useMemo, useState } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { RbmRecord, type RbmRecordContainer, type RbmRecordHandle, type RbmRecordLocation, type RbmRecordProps } from './RbmRecord';
import { createMockEventServer } from '../../data/list/mockServer';
import { eventRecordSpec } from '../../data/list/events';
import type { EventRecord, EventSectionId } from '../../data/list/types';
import { eventsBoard, PEOPLE } from '../../fixtures/events/build';
import { rbmTheme } from '../../theme/theme';
import { RbmDensity } from '../../theme/RbmDensity';

const spec = eventRecordSpec();
type Props = RbmRecordProps<EventRecord, EventSectionId>;

/** The panel with a mock server behind it, as a list page will wire it. */
function Harness({ id = 'ev-00005', over = {}, server: given }: { id?: string; over?: Partial<Props>; server?: ReturnType<typeof createMockEventServer> }) {
  const server = useMemo(() => given ?? createMockEventServer(eventsBoard(), { now: () => new Date('2026-10-25T02:30:00Z') }), [given]);
  const fixture = useMemo(() => eventsBoard(), []);
  const [record, setRecord] = useState<EventRecord>(() => structuredClone(fixture.records.find((r) => r.id === id)!));
  const [container, setContainer] = useState<RbmRecordContainer>('slideIn');
  const [location, setLocation] = useState<RbmRecordLocation>({});
  return (
    <ThemeProvider theme={rbmTheme}>
      <RbmDensity level="compact">
        <RbmRecord
          spec={spec}
          record={record}
          container={container}
          onContainerChange={setContainer}
          location={location}
          onLocationChange={setLocation}
          onClose={() => {}}
          onSave={async (sectionId, values, base) => {
            const result = await server.saveSection(record.id, sectionId, values, base);
            if (result.kind === 'saved') setRecord(result.record);
            return result;
          }}
          onReload={() => void server.readRecord(record.id).then(setRecord)}
          people={PEOPLE}
          listName="Events"
          {...over}
        />
        <output aria-label="location">{JSON.stringify(location)}</output>
      </RbmDensity>
    </ThemeProvider>
  );
}

const section = (name: string) => screen.getByRole('region', { name }) as HTMLElement;

describe('RbmRecord: viewing', () => {
  it('shows the header, the four facts and the group tabs with counts', () => {
    render(<Harness id="ev-00001" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Q4 Data Centre Cutover' })).toBeInTheDocument();
    // In the header, and again as the Event ID field in Details.
    expect(screen.getAllByText('REV000001')).toHaveLength(2);
    expect(screen.getAllByText('In progress')[0]).toBeInTheDocument();
    const summary = screen.getByLabelText('Summary');
    expect(within(summary).getAllByRole('term').map((t) => t.textContent)).toEqual(['Owner', 'Window', 'Progress', 'Attention']);
    expect(within(summary).getByText('68% · 84 of 124 tasks')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Overview', 'Tasks124', 'Dependencies2', 'History3']);
  });

  it('marks a tab that needs attention with a named dot (colour is not the only signal)', () => {
    render(<Harness id="ev-00001" />);
    expect(within(screen.getByRole('tab', { name: /Dependencies/ })).getByRole('img', { name: 'Waits for a blocked event' })).toBeInTheDocument();
  });

  it('opens the first section of each tab; sections collapse and expand, also all at once', async () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Schedule' })).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(screen.getByRole('button', { name: 'Schedule' })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('changes tab and reports it for the address (deep link)', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('tab', { name: /History/ }));
    expect(screen.getByRole('list', { name: 'History' })).toBeInTheDocument();
    expect(JSON.parse(screen.getByLabelText('location').textContent!)).toEqual({ groupId: 'history' });
  });

  it('opens at the tab and section a link names', () => {
    render(<Harness over={{ location: { sectionId: 'downstream' } }} />);
    expect(screen.getByRole('tab', { name: /Dependencies/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Needed by' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows a locked section with its lock and reason, and no Edit', async () => {
    // A running event: its schedule is locked.
    render(<Harness id="ev-00001" />);
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    expect(within(section('Schedule')).getByText('The window cannot change while the event is running. Ask the Event Manager.')).toBeInTheDocument();
    expect(within(section('Schedule')).queryByRole('button', { name: 'Edit Schedule' })).not.toBeInTheDocument();
    expect(within(section('Details')).getByRole('button', { name: 'Edit Details' })).toBeInTheDocument();
  });

  it('labels table values: relationships and statuses as words, with the status dot', async () => {
    render(<Harness id="ev-00001" />);
    await userEvent.click(screen.getByRole('tab', { name: /Dependencies/ }));
    const waitsFor = section('Waits for');
    expect(within(waitsFor).getByRole('cell', { name: 'REV000003 Core Network Refresh' })).toBeInTheDocument();
    expect(within(waitsFor).getByText('Waits for', { selector: 'td' })).toBeInTheDocument();
    expect(within(waitsFor).getByText('Blocked')).toBeInTheDocument();
  });
});

describe('RbmRecord: editing', () => {
  it('edits one section at a time: border, "Editing", the others locked, and focus in the first field', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Details' }));
    const details = section('Details');
    expect(within(details).getByText('Editing')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name (required)' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'People and roles' }));
    expect(within(section('People and roles')).getByText('Locked while editing')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit People and roles' })).not.toBeInTheDocument();
    expect(screen.getByText('Editing Details')).toBeInTheDocument();
  });

  it('explains what is wrong, keeps Save disabled until the section is valid, then saves to History', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Details' }));
    const name = screen.getByRole('textbox', { name: 'Name (required)' });
    await userEvent.clear(name);
    expect(name).toHaveAccessibleDescription('Name is required.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.type(name, 'Warehouse Cutover');
    expect(screen.getByText('Unsaved changes in Details')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByText('Editing')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 2, name: 'Warehouse Cutover' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Details' })).toHaveFocus());
    await userEvent.click(screen.getByRole('tab', { name: /History/ }));
    expect(within(screen.getByRole('list', { name: 'History' })).getAllByRole('listitem')[0]).toHaveTextContent('Name: Warehouse Mgmt Cutover → Warehouse Cutover');
  });

  it('marks the tab with unsaved work, even on another tab', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Details' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Name (required)' }), ' 2');
    await userEvent.click(screen.getByRole('tab', { name: /History/ }));
    expect(within(screen.getByRole('tab', { name: /Overview/ })).getByRole('img', { name: 'Unsaved changes' })).toBeInTheDocument();
  });

  it('asks before leaving unsaved work: Keep editing stays, Discard goes on', async () => {
    const onClose = vi.fn();
    const onNext = vi.fn();
    render(<Harness over={{ onClose, onNext }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Details' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Name (required)' }), ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    const dialog = screen.getByRole('dialog', { name: 'Discard unsaved changes?' });
    expect(dialog).toHaveTextContent('Your changes to Details will be lost.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(onClose).not.toHaveBeenCalled();
    // The page is hidden from screen readers until the dialog has finished closing.
    await userEvent.click(await screen.findByRole('button', { name: 'Next event' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Discard' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('closes on Escape, asking first when there is unsaved work', async () => {
    const onClose = vi.fn();
    render(<Harness over={{ onClose }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lets the page ask before opening another record', async () => {
    const ref = createRef<RbmRecordHandle>();
    render(<Harness over={{ ref }} />);
    await expect(ref.current!.confirmLeave()).resolves.toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Details' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Name (required)' }), ' 2');
    let answer: Promise<boolean>;
    act(() => {
      answer = ref.current!.confirmLeave();
    });
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Discard' }));
    await expect(answer!).resolves.toBe(true);
  });

  it('shows a live conflict with what changed, and Reload', async () => {
    const server = createMockEventServer(eventsBoard(), { now: () => new Date('2026-10-25T02:30:00Z') });
    const onReload = vi.fn();
    render(<Harness server={server} over={{ onReload }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Details' }));
    server.externalEdit('ev-00005', { description: 'Changed by Jo' }, { id: 'p-jn', name: 'Jo Novak' });
    await userEvent.type(screen.getByRole('textbox', { name: 'Name (required)' }), ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Jo Novak changed this event');
    expect(within(alert).getByRole('list', { name: 'What changed' })).toHaveTextContent('Description:');
    await userEvent.click(within(alert).getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalled();
    expect(screen.queryByText('Editing')).not.toBeInTheDocument();
  });
});

describe('RbmRecord: the wide panel', () => {
  it('widens to vertical tabs with counts, and an index of the sections on the tab', async () => {
    render(<Harness id="ev-00001" />);
    await userEvent.click(screen.getByRole('button', { name: 'Widen panel' }));
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    expect(screen.getByText('Events / REV000001')).toBeInTheDocument();
    const index = screen.getByRole('navigation', { name: 'On this tab' });
    await userEvent.click(within(index).getByRole('button', { name: 'Linked changes' }));
    expect(screen.getByRole('button', { name: 'Linked changes', expanded: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Narrow panel' }));
    expect(screen.getByRole('tablist')).not.toHaveAttribute('aria-orientation', 'vertical');
  });

  it('offers the record’s primary action from the server', async () => {
    const onPrimaryAction = vi.fn();
    render(<Harness over={{ onPrimaryAction }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Start run' }));
    expect(onPrimaryAction).toHaveBeenCalledWith('startRun');
  });
});

describe('RbmRecord in the slide-in region (RbmListPage)', () => {
  it('is 480 px as a slide-in and 800 px wide', async () => {
    const { RbmSlideInRegion } = await import('../RbmSlideInRegion/RbmSlideInRegion');
    const { PANEL_WIDTH } = await import('./RbmRecord');
    const { rerender } = render(<ThemeProvider theme={rbmTheme}><RbmSlideInRegion open width={PANEL_WIDTH.slideIn} label="Record" onClose={() => {}}><p>Panel</p></RbmSlideInRegion></ThemeProvider>);
    expect(screen.getByRole('dialog', { name: 'Record' })).toHaveStyle({ width: '480px' });
    rerender(<ThemeProvider theme={rbmTheme}><RbmSlideInRegion open width={PANEL_WIDTH.wide} label="Record" onClose={() => {}}><p>Panel</p></RbmSlideInRegion></ThemeProvider>);
    expect(screen.getByRole('dialog', { name: 'Record' })).toHaveStyle({ width: '800px' });
  });
});
