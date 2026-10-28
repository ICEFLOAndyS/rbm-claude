import { createRef, useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RbmDataGrid, type RbmDataGridHandle, type RbmDataGridProps } from './RbmDataGrid';
import { density, type DensityLevel } from '../../theme/tokens';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';
import { DEFAULT_EVENT_COLUMNS, EVENT_COLUMNS } from '../../data/list/events';
import type { EventColumnField, EventRow } from '../../data/list/types';
import { eventsBoard } from '../../fixtures/events/build';

const rows = eventsBoard().rows;
type Props = RbmDataGridProps<EventRow, EventColumnField>;

/** Rendered inside a D2 Compact region, as on a list page (decision D3), unless another level is given. */
function renderGrid(over: Partial<Props> = {}, level: DensityLevel = 'compact') {
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
      <RbmDensity level={level}>
        <RbmDataGrid {...props} />
      </RbmDensity>
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

  describe('a row link (an icon button that goes somewhere)', () => {
    const link = (onSelect: () => void) => (r: (typeof rows)[number]) =>
      r.number === 'REV000002' ? { label: 'Open Command Centre', name: `Open Command Centre, ${r.number}`, icon: 'centre.commandControl' as const, onSelect } : null;

    it('shows the icon on the rows that have one, named for the row, with a hidden column name', () => {
      renderGrid({ rowLink: link(vi.fn()), rowLinkHeader: 'Command Centre' });
      const button = within(rowOf('Payments DB Failover')).getByRole('button', { name: 'Open Command Centre, REV000002' });
      expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'centre.commandControl');
      expect(within(rowOf('Q4 Data Centre Cutover')).queryByRole('button', { name: /Open Command Centre/ })).toBeNull();
      expect(screen.getByText('Command Centre')).toHaveStyle({ width: '1px' });
    });

    it('a click follows the link and does not open the row', async () => {
      const onSelect = vi.fn();
      const onOpenRow = vi.fn();
      renderGrid({ rowLink: link(onSelect), onOpenRow });
      await userEvent.click(screen.getByRole('button', { name: 'Open Command Centre, REV000002' }));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onOpenRow).not.toHaveBeenCalled();
    });

    it('Enter on its cell follows the link, once, and does not open the row', async () => {
      const onSelect = vi.fn();
      const onOpenRow = vi.fn();
      renderGrid({ rowLink: link(onSelect), onOpenRow });
      const cell = screen.getByRole('button', { name: 'Open Command Centre, REV000002' }).closest<HTMLElement>('[role="gridcell"]')!;
      act(() => cell.focus());
      await userEvent.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onOpenRow).not.toHaveBeenCalled();
    });

    describe('several links in the one column', () => {
      const two = (command: () => void, exec: () => void) => (r: (typeof rows)[number]) =>
        r.number === 'REV000002'
          ? [
              { label: 'Open Command Centre', name: `Open Command Centre, ${r.number}`, icon: 'centre.commandControl' as const, onSelect: command },
              { label: 'Open Exec Centre', name: `Open Exec Centre, ${r.number}`, icon: 'centre.executiveBriefing' as const, onSelect: exec },
            ]
          : null;

      it('shows them side by side in the same cell, in order, and each follows its own link', async () => {
        const command = vi.fn();
        const exec = vi.fn();
        renderGrid({ rowLink: two(command, exec), rowLinkSlots: 2 });
        const commandButton = screen.getByRole('button', { name: 'Open Command Centre, REV000002' });
        const cell = commandButton.closest('[role="gridcell"]')!;
        expect(within(cell as HTMLElement).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Open Command Centre, REV000002', 'Open Exec Centre, REV000002']);
        await userEvent.click(screen.getByRole('button', { name: 'Open Exec Centre, REV000002' }));
        expect(exec).toHaveBeenCalledTimes(1);
        expect(command).not.toHaveBeenCalled();
      });

      it('makes room for each: the column is a target per slot plus the padding', () => {
        renderGrid({ rowLink: two(vi.fn(), vi.fn()), rowLinkSlots: 2 });
        const cell = screen.getByRole('button', { name: 'Open Exec Centre, REV000002' }).closest<HTMLElement>('[role="gridcell"]')!;
        const { target, padX } = density.compact;
        // MUI X gives each cell its column's width as the --width variable.
        expect(cell.style.getPropertyValue('--width')).toBe(`${2 * target + 2 * padX}px`);
      });

      it('Enter on the cell follows the first link', async () => {
        const command = vi.fn();
        const exec = vi.fn();
        renderGrid({ rowLink: two(command, exec), rowLinkSlots: 2 });
        const cell = screen.getByRole('button', { name: 'Open Command Centre, REV000002' }).closest<HTMLElement>('[role="gridcell"]')!;
        act(() => cell.focus());
        await userEvent.keyboard('{Enter}');
        expect(command).toHaveBeenCalledTimes(1);
        expect(exec).not.toHaveBeenCalled();
      });
    });
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

  it.each(['compact', 'comfortable', 'dense'] as const)('takes its row height, text size and dot from the region’s density tokens (%s)', (level) => {
    const d = density[level];
    const { unmount } = renderGrid({}, level);
    const row = rowOf('Q4 Data Centre Cutover');
    expect(row.getAttribute('style')).toContain(`${d.row}px`);
    expect(screen.getByRole('grid').closest('.MuiDataGrid-root')).toHaveStyle({ fontSize: `${d.body}px` });
    expect(within(row).getByTestId('rbm-grid-status-dot')).toHaveStyle({ width: `${d.dot}px` });
    unmount();
  });

  it('is the only component that imports the MUI X grid (decision D4)', () => {
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
    // The grid only: the record panel's date pickers are MUI X too, and are kept to their own file.
    const importers = files.filter((f) => /from '@mui\/x-data-grid/.test(readFileSync(f, 'utf8'))).map((f) => f.slice(root.length + 1).replaceAll('\\', '/'));
    expect(importers.every((f) => f.startsWith('components/RbmDataGrid/'))).toBe(true);
  });
});
