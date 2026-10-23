import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmListPage, type RbmListPageProps } from './RbmListPage';
import { rbmTheme } from '../../theme/theme';
import { colour } from '../../theme/tokens';

const renderPage = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

const slots: RbmListPageProps = {
  title: 'Events',
  count: '128 events · filtered to Production',
  actions: <button>New event</button>,
  toolbar: <div role="toolbar" aria-label="Find events" />,
  bulkBar: null,
  grid: <div role="grid" aria-label="Events" />,
  record: null,
  emptyState: null,
  errorState: null,
};

describe('RbmListPage', () => {
  it('draws the page header as drawn: the breadcrumb, the title, the count and the actions', () => {
    renderPage(<RbmListPage {...slots} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Events');
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toHaveStyle({ fontSize: '24px', fontWeight: 800 });
    expect(screen.getByText('128 events · filtered to Production')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'New event' })).toBeInTheDocument();
  });

  it('is a main landmark on Mist, with the toolbar above the one grid', () => {
    renderPage(<RbmListPage {...slots} />);
    const main = screen.getByRole('main');
    expect(main).toHaveStyle({ backgroundColor: colour.mist, padding: '24px' });
    const toolbar = screen.getByRole('toolbar', { name: 'Find events' });
    const grid = screen.getByRole('grid', { name: 'Events' });
    expect(toolbar.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('swaps the toolbar for the bulk bar while rows are selected', () => {
    renderPage(<RbmListPage {...slots} bulkBar={<div role="toolbar" aria-label="Actions for 2 events selected" />} />);
    expect(screen.queryByRole('toolbar', { name: 'Find events' })).toBeNull();
    expect(screen.getByRole('toolbar', { name: 'Actions for 2 events selected' })).toBeInTheDocument();
  });

  it('shows the empty state in place of the grid, and keeps the toolbar', () => {
    renderPage(<RbmListPage {...slots} emptyState={<p>No events match these filters</p>} />);
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByText('No events match these filters')).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Find events' })).toBeInTheDocument();
  });

  it('shows the error state in place of the toolbar and the grid, and keeps the header', () => {
    renderPage(<RbmListPage {...slots} errorState={<div role="alert">Could not load events.</div>} />);
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load events.');
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument();
  });

  it('opens the record panel in the slide-in region, over the list', () => {
    renderPage(<RbmListPage {...slots} record={{ container: 'slideIn', label: 'REV000001 Q4 Data Centre Cutover', onClose: vi.fn(), panel: <section aria-label="REV000001" /> }} />);
    const dialog = screen.getByRole('dialog', { name: 'REV000001 Q4 Data Centre Cutover' });
    expect(dialog).toHaveStyle({ width: '480px' });
    expect(within(dialog).getByRole('region', { name: 'REV000001' })).toBeInTheDocument();
  });

  it('is 800 px for the wide panel', () => {
    renderPage(<RbmListPage {...slots} record={{ container: 'wide', label: 'REV000001', onClose: vi.fn(), panel: <section aria-label="REV000001" /> }} />);
    expect(screen.getByRole('dialog', { name: 'REV000001' })).toHaveStyle({ width: '800px' });
  });

  it('leaves Escape to the panel, and closes on a click on the list behind', async () => {
    const onClose = vi.fn();
    renderPage(<RbmListPage {...slots} record={{ container: 'slideIn', label: 'REV000001', onClose, panel: <section aria-label="REV000001" /> }} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(document.querySelector('.MuiBackdrop-root')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a message after an action', () => {
    renderPage(<RbmListPage {...slots} message={{ text: '2 events exported.', onClose: vi.fn() }} />);
    expect(screen.getByText('2 events exported.')).toBeInTheDocument();
  });

  it('makes every slot required: a missing one is a compile error', () => {
    const { grid: _g, ...noGrid } = slots;
    const { errorState: _e, ...noError } = slots;
    // @ts-expect-error: the grid is missing
    const missingGrid: RbmListPageProps = noGrid;
    // @ts-expect-error: errorState must be given, even as null
    const missingError: RbmListPageProps = noError;
    expect(missingGrid.title).toBe('Events');
    expect(missingError.title).toBe('Events');
  });
});
