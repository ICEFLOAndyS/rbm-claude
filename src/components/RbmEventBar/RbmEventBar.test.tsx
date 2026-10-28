import { render, screen, within } from '@testing-library/react';
import { RbmDensity } from '../../theme/RbmDensity';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import source from './RbmEventBar.tsx?raw';
import { RbmEventBar, barGap, type RbmEventBarProps } from './RbmEventBar';
import { mockEventVitals } from '../../mocks/eventVitals';
import { mockAlerts, mockEvent } from '../../mocks/event';
import { rbmTheme } from '../../theme/theme';
import { colour } from '../../theme/tokens';

// The bar is a D2 Compact region of the Command Centre.
const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}><RbmDensity level="compact">{ui}</RbmDensity></ThemeProvider>);
const links = { onOpenWork: vi.fn(), onOpenProgress: vi.fn(), onOpenIssues: vi.fn(), onOpenStart: vi.fn(), onOpenForecast: vi.fn(), onBackToTop: vi.fn() };
const bar = (over: Partial<RbmEventBarProps> = {}) =>
  renderUi(<RbmEventBar event={mockEvent()} vitals={mockEventVitals()} alerts={mockAlerts()} visible timeZone="UTC" {...over} />);

describe('barGap', () => {
  it.each([
    [12, '+12 min'],
    [-8, '−08 min'],
    [0, 'On Schedule'],
  ])('%i minutes reads %s', (m, text) => expect(barGap(m)).toBe(text));
});

describe('RbmEventBar', () => {
  it('is a landmark named "Event summary" with the Event, its state and the alert counter', () => {
    bar();
    const summary = screen.getByRole('banner', { name: 'Event summary' });
    expect(within(summary).getByText('REV000009')).toBeInTheDocument();
    expect(within(summary).getByText('Weekend Payroll Cutover')).toBeInTheDocument();
    expect(within(summary).getByText('Active')).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: /^3 alerts,/ })).toHaveStyle({ height: '24px' });
  });

  it('shows one key fact for each Event vital, with short labels: Work, Tasks, issues, Started, Forecast end', () => {
    bar();
    const summary = screen.getByRole('banner', { name: 'Event summary' });
    for (const text of ['Work', '62%', 'Tasks', '68%', '5', 'issues', 'Started', '22:00', 'FORECAST END', '06:12', '+12 min']) {
      expect(within(summary).getByText(text)).toBeInTheDocument();
    }
  });

  it('names each fact in full when it is a link, one tab stop each, in order', async () => {
    bar(links);
    const names = ['Work Progress, 62%', 'Task progress, 68%', 'Open issues, 5, 1 high', 'Start of event, 22:00', 'Forecast end time, 06:12, +12 min'];
    for (const name of names) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    // Past the alert counter, Tab visits each fact in order, then the chevron.
    screen.getByRole('button', { name: /^3 alerts,/ }).focus();
    for (const name of [...names, 'Back to the top of the page']) {
      await userEvent.tab();
      expect(screen.getByRole('button', { name })).toHaveFocus();
    }
  });

  it('makes each fact go to its card or list, and the chevron back to the top', async () => {
    const handlers = { onOpenWork: vi.fn(), onOpenProgress: vi.fn(), onOpenIssues: vi.fn(), onOpenStart: vi.fn(), onOpenForecast: vi.fn(), onBackToTop: vi.fn() };
    bar(handlers);
    await userEvent.click(screen.getByRole('button', { name: 'Work Progress, 62%' }));
    await userEvent.click(screen.getByRole('button', { name: 'Task progress, 68%' }));
    await userEvent.click(screen.getByRole('button', { name: /^Open issues/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Start of event/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Forecast end time/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to the top of the page' }));
    expect(Object.values(handlers).every((f) => f.mock.calls.length === 1)).toBe(true);
  });

  it('without handlers, the bars are progress bars with the full names and Started is plain text', () => {
    bar();
    expect(screen.getByRole('progressbar', { name: 'Work Progress, 62%' })).toHaveAttribute('aria-valuenow', '62');
    expect(screen.getByRole('progressbar', { name: 'Task progress, 68%' })).toHaveAttribute('aria-valuenow', '68');
    expect(screen.queryByRole('button', { name: /^Start of event/ })).toBeNull();
    expect(screen.getByRole('group', { name: 'Start of event, 22:00' })).toBeInTheDocument();
  });

  it('fills the Work bar Blue Dark, and Brand Green only when the Event is Complete', () => {
    const { unmount } = bar();
    expect(screen.getByTestId('rbm-bar-work-fill')).toHaveAttribute('data-fill', 'active');
    expect(screen.getByTestId('rbm-bar-work-fill')).toHaveStyle({ width: '62%' });
    unmount();
    bar({ vitals: mockEventVitals({ rag: 'green', gapMinutes: 0 }, { eventComplete: true, work: { doneMinutes: 1785, todoMinutes: 0 } }) });
    expect(screen.getByTestId('rbm-bar-work-fill')).toHaveAttribute('data-fill', 'complete');
    expect(screen.getByRole('progressbar', { name: 'Work Progress, 100%, Complete' })).toBeInTheDocument();
  });

  it('keeps the segmented Tasks bar: Complete, In progress and Blocked by their share', () => {
    bar();
    const [complete, active, blocked] = screen.getAllByTestId('rbm-bar-task-segment');
    expect(getComputedStyle(complete!).width).toMatch(/^67\.7/);
    expect(getComputedStyle(active!).width).toMatch(/^2\.4/);
    expect(getComputedStyle(blocked!).width).toMatch(/^1\.6/);
  });

  it.each([
    [{ high: 1, medium: 3, low: 1 }, 'high', 'Open issues, 5, 1 high'],
    [{ high: 0, medium: 2, low: 1 }, 'medium', 'Open issues, 3, 2 medium'],
    [{ high: 0, medium: 0, low: 1 }, 'low', 'Open issues, 1, 1 low'],
  ] as const)('gives the issues dot the worst open severity: %o is %s', (issues, severity, name) => {
    bar({ ...links, vitals: mockEventVitals(undefined, { issues }) });
    expect(screen.getByTestId('rbm-bar-issue-dot')).toHaveAttribute('data-severity', severity);
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });

  it('leaves the dot out when there are no open issues, and says "issue" for one', () => {
    const { unmount } = bar({ ...links, vitals: mockEventVitals(undefined, { issues: { high: 0, medium: 0, low: 0 } }) });
    expect(screen.queryByTestId('rbm-bar-issue-dot')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open issues, 0' })).toBeInTheDocument();
    unmount();
    bar({ vitals: mockEventVitals(undefined, { issues: { high: 0, medium: 0, low: 1 } }) });
    expect(screen.getByText('issue')).toBeInTheDocument();
  });

  it.each([
    ['amber', 12, '+12 min', colour.amberDeep],
    ['red', 27, '+27 min', colour.redInner],
    ['green', 0, 'On Schedule', colour.greenDeep],
    ['green', -8, '−08 min', colour.greenDeep],
  ] as const)('shows a %s forecast gap in the RAG text colour', (rag, gap, text, c) => {
    bar({ vitals: mockEventVitals({ rag, gapMinutes: gap }) });
    expect(screen.getByText(text)).toHaveStyle({ color: c });
  });

  it('cuts a long Event name with an ellipsis, so the facts stay on one line', () => {
    bar({ event: { ...mockEvent(), name: 'Weekend Payroll Cutover and Finance Ledger Migration for the Northern Region' } });
    const name = screen.getByText(/^Weekend Payroll Cutover and Finance/);
    expect(name).toHaveStyle({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
    expect(name).toHaveAttribute('title', 'Weekend Payroll Cutover and Finance Ledger Migration for the Northern Region');
  });

  it('is as tall as its forecast time at the D2 figure size needs (56 px; drawn 48)', () => {
    bar();
    expect(screen.getByRole('banner', { name: 'Event summary' })).toHaveStyle({ height: '56px' });
  });

  it('is not shown while the Event vitals are on screen', () => {
    bar({ visible: false });
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('hides the alert counter when the event is healthy', () => {
    bar({ alerts: [] });
    expect(screen.queryByRole('button', { name: /alert/ })).not.toBeInTheDocument();
  });

  it('has no hex colours: they come from the theme tokens', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
