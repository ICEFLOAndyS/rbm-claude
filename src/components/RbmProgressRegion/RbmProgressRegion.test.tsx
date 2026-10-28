import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import source from './RbmProgressRegion.tsx?raw';
import { PROGRESS_REGION_LABEL, RbmProgressRegion, type RbmProgressRegionProps } from './RbmProgressRegion';
import { execProgressMinWidth } from '../RbmExecProgress/RbmExecProgress';
import { RUNBOOK_NAME_WIDTH } from '../RbmRunbookProgress/RbmRunbookProgress';
import { mockRunbookProgress } from '../../mocks/runbookProgress';
import { mockWorkstreamProgress } from '../../mocks/workstreamProgress';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';

const renderRegion = (over: Partial<RbmProgressRegionProps> = {}) =>
  render(
    <ThemeProvider theme={rbmTheme}>
      <RbmDensity level="compact">
        <RbmProgressRegion runbooks={mockRunbookProgress(5)} workstreams={mockWorkstreamProgress()} timeZone="UTC" {...over} />
      </RbmDensity>
    </ThemeProvider>,
  );

describe('RbmProgressRegion', () => {
  it('is a region titled Progress, named apart from the Event vitals Progress card', () => {
    renderRegion();
    const region = screen.getByRole('region', { name: PROGRESS_REGION_LABEL });
    expect(region).toHaveTextContent(/^Progress/);
  });

  it('holds Runbook progress, then Workstream progress', () => {
    renderRegion();
    const cards = screen.getByTestId('rbm-progress-cards');
    expect(within(cards).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Runbook progress', 'Workstream progress']);
  });

  const minWidths = () => screen.getAllByTestId('rbm-progress-slot').map((s) => Number(s.dataset.minWidth));

  it('gives each card the width its columns need, stats hidden by default, so they sit side by side when both fit and wrap when not', () => {
    renderRegion();
    expect(minWidths()).toEqual([
      execProgressMinWidth('compact', { nameWidth: RUNBOOK_NAME_WIDTH, showStats: false, items: mockRunbookProgress(5) }),
      execProgressMinWidth('compact', { showStats: false, items: mockWorkstreamProgress() }),
    ]);
    expect(getComputedStyle(screen.getByTestId('rbm-progress-cards')).flexWrap).toBe('wrap');
  });

  it('widens a card when its stats are shown, and narrows it again when they are hidden', async () => {
    const onStatsChange = vi.fn();
    renderRegion({ onStatsChange });
    const [runbooks] = screen.getAllByRole('region', { name: /progress$/ });
    const before = minWidths();
    await userEvent.click(within(runbooks!).getByRole('button', { name: 'Show stats: tasks, issues, start and end' }));
    expect(onStatsChange).toHaveBeenLastCalledWith({ runbooks: true, workstreams: false });
    expect(minWidths()[0]).toBe(execProgressMinWidth('compact', { nameWidth: RUNBOOK_NAME_WIDTH, items: mockRunbookProgress(5) }));
    expect(minWidths()[0]).toBeGreaterThan(before[0]!);
    expect(minWidths()[1]).toBe(before[1]);
    await userEvent.click(within(runbooks!).getByRole('button', { name: 'Hide stats: tasks, issues, start and end' }));
    expect(minWidths()).toEqual(before);
  });

  it('collapses to one line with the counts, and expands again', async () => {
    const onCollapsedChange = vi.fn();
    const { rerender } = renderRegion({ onCollapsedChange });
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Progress' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    const late = [...mockRunbookProgress(5), ...mockWorkstreamProgress()].filter((r) => r.late).length;
    rerender(
      <ThemeProvider theme={rbmTheme}>
        <RbmProgressRegion runbooks={mockRunbookProgress(5)} workstreams={mockWorkstreamProgress()} collapsed onCollapsedChange={onCollapsedChange} />
      </ThemeProvider>,
    );
    const summary = screen.getByRole('list', { name: 'Progress summary' });
    expect(within(summary).getAllByRole('listitem').map((c) => c.getAttribute('aria-label'))).toEqual(['5 runbooks', '12 workstreams', `${late} late`]);
    await userEvent.click(screen.getByRole('button', { name: 'Expand Progress' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
  });

  it('stretches the two cards to the same height when they sit side by side', () => {
    renderRegion();
    expect(getComputedStyle(screen.getByTestId('rbm-progress-cards')).alignItems).toBe('stretch');
    for (const slot of screen.getAllByTestId('rbm-progress-slot')) {
      expect(getComputedStyle(slot).display).toBe('flex');
      expect(getComputedStyle(slot.firstElementChild!).height).toBe('100%');
    }
  });

  it('has no Collapse link without a handler', () => {
    renderRegion();
    expect(screen.queryByRole('button', { name: 'Collapse Progress' })).toBeNull();
  });

  it('passes loading to both cards', () => {
    renderRegion({ loading: true });
    expect(screen.getByText('Loading runbooks')).toBeInTheDocument();
    expect(screen.getByText('Loading workstreams')).toBeInTheDocument();
  });

  it('has no hex colours: they come from the theme tokens', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
