import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmPagination, rangeText, type RbmPaginationProps } from './RbmPagination';
import { RbmDataGrid } from '../RbmDataGrid/RbmDataGrid';
import { rbmTheme } from '../../theme/theme';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, density } from '../../theme/tokens';
import { DEFAULT_EVENT_COLUMNS, EVENT_COLUMNS } from '../../data/list/events';
import { PAGE_SIZES } from '../../data/list/types';
import { eventsBoard } from '../../fixtures/events/build';

// A list page is a D2 Compact region.
const renderD2 = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}><RbmDensity level="compact">{ui}</RbmDensity></ThemeProvider>);
const pager = (over: Partial<RbmPaginationProps> = {}) => <RbmPagination page={0} pageSize={25} total={128} pageSizes={PAGE_SIZES} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} {...over} />;

describe('rangeText', () => {
  it('says which rows are on the page, as drawn ("1 to 8 of 128")', () => {
    expect(rangeText(0, 25, 128)).toBe('1 to 25 of 128');
    expect(rangeText(5, 25, 128)).toBe('126 to 128 of 128');
    expect(rangeText(0, 25, 8)).toBe('1 to 8 of 8');
    expect(rangeText(0, 25, 15000)).toBe('1 to 25 of 15,000');
    expect(rangeText(0, 25, 0)).toBe('0 of 0');
  });
});

describe('RbmPagination', () => {
  it('is a navigation landmark with the range, announced as it changes', () => {
    renderD2(pager({ page: 1 }));
    const nav = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(nav).getByText('26 to 50 of 128')).toHaveAttribute('aria-live', 'polite');
  });

  it('moves a page at a time, and cannot go before the first or past the last', async () => {
    const onPageChange = vi.fn();
    const { rerender } = renderD2(pager({ onPageChange }));
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    rerender(<ThemeProvider theme={rbmTheme}><RbmDensity level="compact">{pager({ page: 5, onPageChange })}</RbmDensity></ThemeProvider>);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
  });

  it('draws an arrow that can be used in Deep Blue, and one that cannot in Slate', () => {
    renderD2(pager());
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveStyle({ color: colour.deepBlue });
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveStyle({ color: colour.slate });
  });

  it('changes the page size from "Rows per page"', async () => {
    const onPageSizeChange = vi.fn();
    renderD2(pager({ onPageSizeChange }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Rows per page' }));
    await userEvent.click(screen.getByRole('option', { name: '50' }));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('holds both arrows while a page loads', () => {
    renderD2(pager({ page: 2, disabled: true }));
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('takes its sizes from the D2 tokens: one row tall, secondary text, arrows at the minimum target', () => {
    const d = density.compact;
    renderD2(pager());
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveStyle({ height: `${d.row}px`, fontSize: `${d.caption}px` });
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveStyle({ width: `${d.target}px`, height: `${d.target}px` });
  });

  it('sits inside the grid’s card, under the rows, as drawn', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderD2(
      <RbmDataGrid label="Events" columns={EVENT_COLUMNS} rows={eventsBoard().rows} sort={[]} onSortChange={() => {}} columnState={DEFAULT_EVENT_COLUMNS} onColumnStateChange={() => {}} disableVirtualization footer={pager({ total: 8 })} />,
    );
    const grid = screen.getByRole('grid', { name: 'Events' });
    const nav = screen.getByRole('navigation', { name: 'Pages' });
    expect(grid.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(nav).getByText('1 to 8 of 8')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
