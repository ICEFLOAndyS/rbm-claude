import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmListEmpty, RbmListError, RbmListFailure, RbmListLoading, RbmListNoAccess, clientReference, LOADING_DELAY_MS } from './RbmListState';
import { rbmTheme } from '../../theme/theme';
import { RbmDensity } from '../../theme/RbmDensity';
import { density } from '../../theme/tokens';
import { ListDataError } from '../../data/list/types';

// A list page is a D2 Compact region.
const renderD2 = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}><RbmDensity level="compact">{ui}</RbmDensity></ThemeProvider>);

describe('RbmListLoading', () => {
  afterEach(() => vi.useRealTimers());

  it('shows nothing for the first 300 ms, then the skeleton (board rule)', () => {
    vi.useFakeTimers();
    renderD2(<RbmListLoading label="Loading events" columns={[140, 280]} />);
    expect(screen.queryByTestId('rbm-list-skeleton')).toBeNull();
    act(() => vi.advanceTimersByTime(LOADING_DELAY_MS - 1));
    expect(screen.queryByTestId('rbm-list-skeleton')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('rbm-list-skeleton')).toBeInTheDocument();
  });

  it('tells a screen reader it is loading from the start, and hides the skeleton from it', () => {
    renderD2(<RbmListLoading label="Loading events" columns={[140, 280]} delayMs={0} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading events');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('rbm-list-skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('matches the layout: a toolbar row, the header and one row per page row at the D2 row height', () => {
    const { container } = renderD2(<RbmListLoading label="Loading events" columns={[140, 280, 140]} rows={5} delayMs={0} />);
    // Toolbar: search, three filters and a control-sized button.
    const skeleton = screen.getByTestId('rbm-list-skeleton');
    expect(skeleton.querySelectorAll('.MuiSkeleton-rounded').length).toBeGreaterThanOrEqual(5);
    // Header + 5 rows, each with three column cells.
    const rows = Array.from(container.querySelectorAll('.MuiSkeleton-text')).length;
    expect(rows).toBe(6 * 3);
    expect(density.compact.row).toBe(44);
  });

  it('can leave out the toolbar when only the grid is loading', () => {
    renderD2(<RbmListLoading label="Loading events" columns={[140]} toolbar={false} rows={1} delayMs={0} />);
    // Only the checkbox placeholders (header + 1 row) are rounded.
    expect(screen.getByTestId('rbm-list-skeleton').querySelectorAll('.MuiSkeleton-rounded')).toHaveLength(2);
  });

  it('is never a full-page spinner', () => {
    renderD2(<RbmListLoading label="Loading events" columns={[140]} delayMs={0} />);
    expect(document.querySelector('.MuiCircularProgress-root')).toBeNull();
  });
});

describe('RbmListEmpty', () => {
  it('says why it is empty and offers the one action that fixes it', async () => {
    const onClick = vi.fn();
    renderD2(<RbmListEmpty title="No events match these filters" reason="Clear the filters to see every event." action={{ label: 'Clear filters', onClick }} />);
    expect(screen.getByRole('heading', { level: 2, name: 'No events match these filters' })).toBeInTheDocument();
    expect(screen.getByText('Clear the filters to see every event.')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('makes New the green CTA', () => {
    renderD2(<RbmListEmpty title="No events yet" reason="Create the first event." action={{ label: 'New event', onClick: vi.fn() }} actionKind="cta" />);
    expect(screen.getByRole('button', { name: 'New event' })).toHaveClass('MuiButton-contained', 'MuiButton-colorSecondary');
  });

  it('hides the icon from screen readers', () => {
    renderD2(<RbmListEmpty title="No events yet" reason="Create the first event." />);
    expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('RbmListError', () => {
  it('is an alert with a short message, Retry and the reference for support', async () => {
    const onRetry = vi.fn();
    renderD2(<RbmListError message="Could not load events." reference="REF-20261025-0001" onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Could not load events.');
    expect(alert).toHaveTextContent('Reference: REF-20261025-0001');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('RbmListNoAccess', () => {
  it('says what the user cannot see and who to ask, with no action', () => {
    renderD2(<RbmListNoAccess message="You do not have access to events." contact="Ask your RBM administrator for the Event reader role." />);
    expect(screen.getByRole('heading', { name: 'You do not have access to events.' })).toBeInTheDocument();
    expect(screen.getByText('Ask your RBM administrator for the Event reader role.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('RbmListFailure', () => {
  it('shows no access when the server refuses', () => {
    renderD2(<RbmListFailure error={new ListDataError('noAccess', 'You do not have access to events.', 'REF-1', 'Ask your administrator.')} onRetry={vi.fn()} noun="events" />);
    expect(screen.getByRole('heading', { name: 'You do not have access to events.' })).toBeInTheDocument();
    expect(screen.getByText('Ask your administrator.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('shows the error with Retry and the server reference when the load fails', () => {
    renderD2(<RbmListFailure error={new ListDataError('failed', 'Could not load events.', 'REF-20261025-0003')} onRetry={vi.fn()} noun="events" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Reference: REF-20261025-0003');
  });

  it('makes its own reference when the server never answered', () => {
    renderD2(<RbmListFailure error={new TypeError('Failed to fetch')} onRetry={vi.fn()} noun="events" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load events.');
    expect(screen.getByRole('alert')).toHaveTextContent(/Reference: REF-C-[0-9A-Z]+/);
    expect(clientReference(0)).toBe('REF-C-0');
  });
});
