import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmListBulkAction, type RbmListBulkActionProps } from './RbmListBulkAction';
import { RbmListToolbar } from '../RbmListToolbar/RbmListToolbar';
import { rbmTheme } from '../../theme/theme';
import { RbmDensity } from '../../theme/RbmDensity';
import { density } from '../../theme/tokens';

// A list page is a D2 Compact region.
const renderD2 = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}><RbmDensity level="compact">{ui}</RbmDensity></ThemeProvider>);
const noun = { one: 'event', many: 'events' };
const bar = (over: Partial<RbmListBulkActionProps> = {}) => <RbmListBulkAction count={3} noun={noun} actions={[{ id: 'export', label: 'Export', onSelect: vi.fn() }]} onClear={vi.fn()} {...over} />;

describe('RbmListBulkAction', () => {
  it('says how many rows are selected, politely to screen readers, and names the toolbar after it', () => {
    renderD2(bar());
    expect(screen.getByRole('toolbar', { name: 'Actions for 3 events selected' })).toBeInTheDocument();
    expect(screen.getByText('3 events selected')).toHaveAttribute('aria-live', 'polite');
  });

  it('uses the singular for one row', () => {
    renderD2(bar({ count: 1 }));
    expect(screen.getByText('1 event selected')).toBeInTheDocument();
  });

  it('runs an action, and clears the selection', async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();
    renderD2(bar({ actions: [{ id: 'owner', label: 'Change owner…', onSelect }], onClear }));
    await userEvent.click(screen.getByRole('button', { name: 'Change owner…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('marks an action that removes things, and explains a disabled action', async () => {
    renderD2(
      bar({
        actions: [
          { id: 'delete', label: 'Delete…', onSelect: vi.fn(), tone: 'danger' },
          { id: 'owner', label: 'Change owner…', onSelect: vi.fn(), disabled: true, disabledReason: 'Complete events are read-only.' },
        ],
      }),
    );
    expect(screen.getByRole('button', { name: 'Delete…' })).toHaveClass('MuiButton-colorError');
    const owner = screen.getByRole('button', { name: 'Change owner…' });
    expect(owner).toBeDisabled();
    await userEvent.hover(owner.parentElement!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Complete events are read-only.');
  });

  it('is one row tall with full-size controls, like the list toolbar, so the grid does not move when it swaps in', () => {
    const d = density.compact;
    renderD2(
      <>
        {bar()}
        <RbmListToolbar noun="events" search="" onSearchChange={() => {}} filters={[]} views={[{ id: 'all', name: 'All events', kind: 'system' }]} currentViewId="all" onSelectView={() => {}} onOpenColumns={() => {}} onExport={() => {}} />
      </>,
    );
    expect(screen.getByRole('toolbar')).toHaveStyle({ height: `${d.row}px` });
    expect(screen.getByRole('group', { name: 'Find events' })).toHaveStyle({ height: `${d.row}px` });
    expect(screen.getByRole('button', { name: 'Export' })).toHaveStyle({ height: `${d.control}px` });
    expect(screen.getByRole('button', { name: 'Clear selection' })).toHaveStyle({ height: `${d.control}px` });
  });
});

describe('RbmListBulkAction swapping with the list toolbar (the story)', () => {
  it('replaces the toolbar while rows are selected, in the same place, and Clear brings the toolbar back', async () => {
    const { composeStories } = await import('@storybook/react-vite');
    const stories = await import('./RbmListBulkAction.stories');
    const { SwapsWithTheToolbar } = composeStories(stories);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ThemeProvider theme={rbmTheme}><SwapsWithTheToolbar /></ThemeProvider>);
    expect(screen.getByRole('group', { name: 'Find events' })).toBeInTheDocument();
    const [first, second] = screen.getAllByRole('checkbox', { name: /select row/i });
    await userEvent.click(first!);
    await userEvent.click(second!);
    expect(screen.queryByRole('group', { name: 'Find events' })).not.toBeInTheDocument();
    expect(screen.getByText('2 events selected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByRole('group', { name: 'Find events' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { name: /select row/i }).every((c) => !(c as HTMLInputElement).checked)).toBe(true);
    vi.restoreAllMocks();
  });
});
