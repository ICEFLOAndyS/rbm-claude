import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { RbmListToolbar, type RbmListToolbarProps, type RbmToolbarView } from './RbmListToolbar';
import { rbmTheme } from '../../theme/theme';
import { RbmDensity } from '../../theme/RbmDensity';
import { density } from '../../theme/tokens';
import { ENVIRONMENT_LABELS, STATUS_LABELS } from '../../data/list/events';
import { PEOPLE } from '../../fixtures/events/build';

const views: RbmToolbarView[] = [
  { id: 'active', name: 'Active', kind: 'system' },
  { id: 'all', name: 'All events', kind: 'system' },
  { id: 'view-1', name: 'Production at risk', kind: 'user' },
];

/** The toolbar with its own filter state, in a D2 region as on a list page. */
function Harness(over: Partial<RbmListToolbarProps>) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [owner, setOwner] = useState<string[]>([]);
  const [env, setEnv] = useState<string[]>([]);
  const props: RbmListToolbarProps = {
    noun: 'events',
    search,
    onSearchChange: setSearch,
    filters: [
      { id: 'status', label: 'Status', options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })), selected: status, onChange: setStatus },
      { id: 'owner', label: 'Owner', options: PEOPLE.map((p) => ({ value: p.id, label: p.name })), selected: owner, onChange: setOwner },
      { id: 'environment', label: 'Environment', options: Object.entries(ENVIRONMENT_LABELS).map(([value, label]) => ({ value, label })), selected: env, onChange: setEnv },
    ],
    views,
    currentViewId: 'active',
    onSelectView: vi.fn(),
    onOpenColumns: vi.fn(),
    onExport: vi.fn(),
    ...over,
  };
  return (
    <ThemeProvider theme={rbmTheme}>
      <RbmDensity level="compact">
        <RbmListToolbar {...props} />
        <output aria-label="state">{JSON.stringify({ search, status, owner, env })}</output>
      </RbmDensity>
    </ThemeProvider>
  );
}

const state = () => JSON.parse(screen.getByLabelText('state').textContent!);

describe('RbmListToolbar', () => {
  it('has the drawn parts in one row: search, Status, Owner, Environment, the view, Columns and Export', () => {
    render(<Harness />);
    const toolbar = screen.getByRole('group', { name: 'Find events' });
    expect(toolbar).toHaveStyle({ flexWrap: 'nowrap' });
    expect(within(toolbar).getByRole('searchbox', { name: 'Search events' })).toHaveAttribute('placeholder', 'Search events');
    expect(within(toolbar).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Status', 'Owner', 'Environment', 'View: Active', 'Columns', 'Export events as CSV']);
  });

  it('sizes its controls from the D2 tokens', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Status' })).toHaveStyle({ height: `${density.compact.control}px`, fontSize: `${density.compact.body}px` });
    expect(screen.getByRole('button', { name: 'Columns' })).toHaveStyle({ width: `${density.compact.control}px`, height: `${density.compact.control}px` });
  });

  it('searches as you type, and Escape or the clear button empties the search', async () => {
    render(<Harness />);
    const box = screen.getByRole('searchbox', { name: 'Search events' });
    await userEvent.type(box, 'payroll');
    expect(state().search).toBe('payroll');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(state().search).toBe('');
    await userEvent.type(box, 'x{Escape}');
    expect(state().search).toBe('');
  });

  it('filters with a checkbox list; the pill shows how many are chosen; Select all and Clear', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    const panel = screen.getByRole('dialog', { name: 'Filter by status' });
    await userEvent.click(within(panel).getByRole('checkbox', { name: 'Blocked' }));
    await userEvent.click(within(panel).getByRole('checkbox', { name: 'At risk' }));
    expect(state().status).toEqual(['blocked', 'atRisk']);
    // The page behind the open filter is hidden from screen readers (MUI's modal popover).
    expect(screen.getByRole('button', { name: 'Status · 2', hidden: true })).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: 'Select all: status' }));
    expect(state().status).toHaveLength(6);
    await userEvent.click(within(panel).getByRole('button', { name: 'Clear: status' }));
    expect(state().status).toEqual([]);
  });

  it('offers a search inside a filter with more than six options', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Owner' }));
    const panel = screen.getByRole('dialog', { name: 'Filter by owner' });
    await userEvent.type(within(panel).getByRole('textbox', { name: 'Search owner' }), 'chen');
    expect(within(panel).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'))).toEqual(['Lin Chen']);
  });

  it('chooses a view from the menu, system views first, then the user’s own', async () => {
    const onSelectView = vi.fn();
    render(<Harness onSelectView={onSelectView} />);
    await userEvent.click(screen.getByRole('button', { name: 'View: Active' }));
    const menu = screen.getByRole('menu', { name: 'Views' });
    expect(within(menu).getAllByRole('menuitemradio').map((m) => m.textContent)).toEqual(['Active', 'All events', 'Production at risk']);
    expect(within(menu).getByRole('menuitemradio', { name: 'Active' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(within(menu).getByRole('menuitemradio', { name: 'Production at risk' }));
    expect(onSelectView).toHaveBeenCalledWith('view-1');
  });

  it('saves a new view with a name, refusing an empty or taken name', async () => {
    const onSaveView = vi.fn();
    render(<Harness onSaveView={onSaveView} />);
    await userEvent.click(screen.getByRole('button', { name: 'View: Active' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save as new view…' }));
    const dialog = screen.getByRole('dialog', { name: 'Save as new view' });
    const save = within(dialog).getByRole('button', { name: 'Save view' });
    expect(save).toBeDisabled();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'production at risk');
    expect(within(dialog).getByText('You already have a view with this name.')).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Name' }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Blocked this week{Enter}');
    expect(onSaveView).toHaveBeenCalledWith('Blocked this week');
  });

  it('saves changes to, or deletes, the user’s own view only', async () => {
    const onUpdateView = vi.fn();
    const onDeleteView = vi.fn();
    const { unmount } = render(<Harness currentViewId="active" viewChanged onUpdateView={onUpdateView} onDeleteView={onDeleteView} />);
    await userEvent.click(screen.getByRole('button', { name: 'View: Active (changed)' }));
    expect(screen.queryByRole('menuitem', { name: /Save changes/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Delete/ })).not.toBeInTheDocument();
    unmount();

    render(<Harness currentViewId="view-1" viewChanged onUpdateView={onUpdateView} onDeleteView={onDeleteView} />);
    await userEvent.click(screen.getByRole('button', { name: 'View: Production at risk (changed)' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save changes to Production at risk' }));
    expect(onUpdateView).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'View: Production at risk (changed)' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete Production at risk…' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete Production at risk?' })).getByRole('button', { name: 'Delete view' }));
    expect(onDeleteView).toHaveBeenCalledWith('view-1');
  });

  it('opens the column chooser and exports; Export waits while a file is being built', async () => {
    const onOpenColumns = vi.fn();
    const onExport = vi.fn();
    const { rerender } = render(<Harness onOpenColumns={onOpenColumns} onExport={onExport} />);
    await userEvent.click(screen.getByRole('button', { name: 'Columns' }));
    await userEvent.click(screen.getByRole('button', { name: 'Export events as CSV' }));
    expect(onOpenColumns).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
    rerender(<Harness onOpenColumns={onOpenColumns} onExport={onExport} exporting />);
    expect(screen.getByRole('button', { name: 'Exporting…' })).toBeDisabled();
  });
});
