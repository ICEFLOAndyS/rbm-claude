import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import source from './RbmProgressRegion.tsx?raw';
import { PROGRESS_CARD_MIN_WIDTH, PROGRESS_REGION_LABEL, RbmProgressRegion, type RbmProgressRegionProps } from './RbmProgressRegion';
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

  it('sits them side by side when there is room for both at the region density, and stacks them when not', () => {
    renderRegion();
    expect(screen.getByTestId('rbm-progress-cards').style.gridTemplateColumns || getComputedStyle(screen.getByTestId('rbm-progress-cards')).gridTemplateColumns).toBe(
      `repeat(auto-fit, minmax(min(100%, ${PROGRESS_CARD_MIN_WIDTH.compact}px), 1fr))`,
    );
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
