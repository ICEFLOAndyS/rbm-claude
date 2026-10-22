import { createRef, useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RbmDataGrid, type RbmDataGridHandle, type RbmDataGridProps } from './RbmDataGrid';
import { rbmTheme } from '../../theme/theme';
import { DEFAULT_EVENT_COLUMNS, EVENT_COLUMNS } from '../../data/list/events';
import type { EventColumnField, EventRow } from '../../data/list/types';
import { eventsBoard } from '../../fixtures/events/build';

const rows = eventsBoard().rows;
type Props = RbmDataGridProps<EventRow, EventColumnField>;

function renderGrid(over: Partial<Props> = {}) {
  const props: Props = {
    label: 'Events',
    columns: EVENT_COLUMNS,
    rows,
    sort: [],
    onSortChange: vi.fn(),
    columnState: DEFAULT_EVENT_COLUMNS,
    onColumnStateChange: vi.fn(),
    disableVirtualization: true,
    ...over,
  };
  const view = render(
    <ThemeProvider theme={rbmTheme}>
      <RbmDataGrid {...props} />
    </ThemeProvider>,
  );
  return { ...view, props };
}

const silenceLicence = () => vi.spyOn(console, 'error').mockImplementation(() => {});
beforeEach(() => {
  silenceLicence();
});
afterEach(() => vi.restoreAllMocks());

const rowOf = (text: string) => screen.getByText(text).closest('[role="row"]') as HTMLElement;

describe('RbmDataGrid', () => {
  it('is a grid named for its list, with the drawn columns', () => {
    renderGrid();
    const grid = screen.getByRole('grid', { name: 'Events' });
    expect(within(grid).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Event ID', 'Event', 'Status', 'Owner', 'State', 'Window']);
  });

  it('draws a row as on the board: ID, name, status as a dot and a label, owner, state, window date', () => {
    renderGrid();
    const cells = within(rowOf('Q4 Data Centre Cutover')).getAllByRole('gridcell').map((c) => c.textContent);
    expect(cells).toEqual(['REV000001', 'Q4 Data Centre Cutover', 'In progress', 'A. Smith', 'Active', '24 Oct']);
  });

  it('never shows status by colour alone: every status has its label, and the dot is hidden from screen readers', () => {
    renderGrid();
    for (const label of ['In progress', 'At risk', 'Blocked', 'Complete', 'Pending', 'Paused']) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    for (const dot of screen.getAllByTestId('rbm-grid-status-dot')) expect(dot).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows rows in the order given: the server sorts', async () => {
    const onSortChange = vi.fn();
    renderGrid({ onSortChange });
    await userEvent.click(screen.getByRole('columnheader', { name: 'Event' }));
    expect(onSortChange).toHaveBeenCalledWith([{ field: 'name', direction: 'asc' }]);
    expect(screen.getAllByRole('row').slice(1, 3).map((r) => within(r).getAllByRole('gridcell')[0]!.textContent)).toEqual(['REV000001', 'REV000002']);
  });

  it('opens a row on click, and on Enter from the keyboard', async () => {
    const onOpenRow = vi.fn();
    renderGrid({ onOpenRow });
    await userEvent.click(screen.getByText('Core Network Refresh'));
    expect(onOpenRow).toHaveBeenLastCalledWith(expect.objectContaining({ number: 'REV000003' }));
    const cell = within(rowOf('Payments DB Failover')).getAllByRole('gridcell')[1]!;
    act(() => cell.focus());
    await userEvent.keyboard('{Enter}');
    expect(onOpenRow).toHaveBeenLastCalledWith(expect.objectContaining({ number: 'REV000002' }));
  });

  it('keeps the approved highlight on the row open in the panel', () => {
    renderGrid({ openRowId: 'ev-00002' });
    expect(rowOf('Payments DB Failover')).toHaveClass('rbm-open');
    expect(rowOf('Q4 Data Centre Cutover')).not.toHaveClass('rbm-open');
  });

  it('selects rows with checkboxes, without opening them, and keeps selections from other pages', async () => {
    const onOpenRow = vi.fn();
    const onSelectedIdsChange = vi.fn();
    renderGrid({ selectable: true, selectedIds: ['ev-99999'], onSelectedIdsChange, onOpenRow });
    await userEvent.click(within(rowOf('Q4 Data Centre Cutover')).getByRole('checkbox'));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['ev-99999', 'ev-00001']);
    expect(onOpenRow).not.toHaveBeenCalled();
  });

  it('selects the whole page from the header checkbox', async () => {
    function Harness() {
      const [ids, setIds] = useState<string[]>([]);
      return (
        <ThemeProvider theme={rbmTheme}>
          <RbmDataGrid label="Events" columns={EVENT_COLUMNS} rows={rows} sort={[]} onSortChange={() => {}} columnState={DEFAULT_EVENT_COLUMNS} onColumnStateChange={() => {}} selectable selectedIds={ids} onSelectedIdsChange={setIds} disableVirtualization />
          <output>{ids.length} selected</output>
        </ThemeProvider>
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('checkbox', { name: /select all rows/i }));
    expect(screen.getByText('8 selected')).toBeInTheDocument();
  });

  it('shows only the columns in the column state, in its order', () => {
    renderGrid({ columnState: { visible: ['name', 'status', 'number'] } });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Event', 'Status', 'Event ID']);
  });

  it('opens the column chooser, and hiding a column reports the new column state', async () => {
    const onColumnStateChange = vi.fn();
    const ref = createRef<RbmDataGridHandle>();
    renderGrid({ onColumnStateChange, ref });
    act(() => ref.current!.openColumnChooser());
    const owner = await screen.findByRole('checkbox', { name: 'Owner' });
    await userEvent.click(owner);
    expect(onColumnStateChange).toHaveBeenLastCalledWith({ visible: ['number', 'name', 'status', 'state', 'windowStart'] });
  });

  it('will not let the Event column be hidden', async () => {
    const ref = createRef<RbmDataGridHandle>();
    renderGrid({ ref });
    act(() => ref.current!.openColumnChooser());
    expect(await screen.findByRole('checkbox', { name: 'Event' })).toBeDisabled();
  });

  it('offers row actions behind the drawn "more" button', async () => {
    const onSelect = vi.fn();
    renderGrid({ rowActions: (row) => [{ id: 'open', label: `Open ${row.number}`, onSelect }] });
    await userEvent.click(within(rowOf('Q4 Data Centre Cutover')).getByRole('button', { name: 'More actions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Open REV000001' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('columnheader').at(-1)).toHaveTextContent('Actions');
  });

  it('says why the grid is empty', () => {
    renderGrid({ rows: [], noRowsLabel: 'No events match.' });
    expect(screen.getByText('No events match.')).toBeInTheDocument();
  });

  it('is the only component that imports MUI X (decision D4)', () => {
    const root = join(__dirname, '..', '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name)) files.push(path);
      }
    };
    walk(root);
    const importers = files.filter((f) => /from '@mui\/x-/.test(readFileSync(f, 'utf8'))).map((f) => f.slice(root.length + 1).replaceAll('\\', '/'));
    expect(importers.every((f) => f.startsWith('components/RbmDataGrid/'))).toBe(true);
  });
});
