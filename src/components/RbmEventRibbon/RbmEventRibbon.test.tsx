import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmEventRibbon, laneSummary, shortGap, type RbmRibbonRunbook } from './RbmEventRibbon';
import { at, mockOverlappingRunbook, mockRibbon, ribbonNow } from '../../mocks/eventRibbon';
import { rbmTheme } from '../../theme/theme';

const renderRibbon = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
const lane = (name: RegExp) => screen.getByRole('group', { name });
const stage = (id: string) => document.querySelector<HTMLElement>(`[data-stage="${id}"]`);
const px = (el: HTMLElement | null, prop: 'left' | 'width' | 'top') => parseFloat(getComputedStyle(el!)[prop]);

describe('shortGap and laneSummary', () => {
  it('writes the gap in short words', () => {
    expect(shortGap(12)).toBe('+12m');
    expect(shortGap(0)).toBe('On Schedule');
    expect(shortGap(-8)).toBe('−08m');
  });

  it('gives each lane a text alternative, as in the brief', () => {
    const [, interfaces, reporting] = mockRibbon();
    expect(laneSummary(interfaces!, 'UTC')).toBe('Interfaces, forecast end 05:27, 27 minutes behind');
    expect(laneSummary(reporting!, 'UTC')).toBe('Reporting, forecast end 05:40, on schedule');
  });
});

describe('RbmEventRibbon', () => {
  it('shows one lane per runbook, every runbook, each with its forecast', () => {
    renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(lane(/^Payroll cutover, forecast end 06:12, 12 minutes behind$/)).toHaveTextContent('06:12+12m');
    expect(lane(/^Interfaces/)).toHaveTextContent('+27m');
    expect(lane(/^Reporting/)).toHaveTextContent('On Schedule');
  });

  it('puts every lane on one shared clock: stages at the same time line up', () => {
    renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
    // 1.3 starts at 02:00 and the 02:00 milestone sits on the same x.
    const milestone = document.querySelector<HTMLElement>('[data-marker="m1"]');
    expect(px(stage('1.3'), 'left')).toBeCloseTo(px(milestone, 'left') + 1, 0);
  });

  it('shows now as a marker with the time', () => {
    renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
    expect(screen.getByText('NOW 03:40')).toBeInTheDocument();
  });

  it('hatches a forecast overrun from the planned end to the forecast end, and not when on schedule', () => {
    renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
    const overrun = within(lane(/^Interfaces/)).getByTestId('rbm-overrun');
    const tick = within(lane(/^Interfaces/)).getByTestId('rbm-planned-end');
    expect(px(overrun, 'left')).toBeCloseTo(px(tick, 'left') + 1, 0);
    expect(px(overrun, 'width')).toBeGreaterThan(30); // 27 minutes at about 97 px an hour
    expect(within(lane(/^Reporting/)).queryByTestId('rbm-overrun')).not.toBeInTheDocument();
  });

  it('puts milestones and checkpoints on the line above the stage rows, never on a bar', () => {
    renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
    const marker = document.querySelector<HTMLElement>('[data-marker="c1"]');
    expect(px(marker, 'top')).toBeLessThan(px(stage('1.5'), 'top'));
  });

  describe('overlapping stages', () => {
    const runbooks = () => [mockOverlappingRunbook()];

    it('packs 2, 3 and 5 stages at once into sub-rows, and caps the lane at 3', () => {
      renderRibbon(<RbmEventRibbon runbooks={runbooks()} now={ribbonNow} timeZone="UTC" />);
      expect(stage('4.1')).toHaveAttribute('data-row', '0');
      expect(stage('4.2')).toHaveAttribute('data-row', '1');
      expect(['4.3', '4.4', '4.5'].map((id) => stage(id)?.getAttribute('data-row'))).toEqual(['0', '1', '2']);
      // Five at once from 02:45: the 4th and 5th rows are hidden behind "+n more".
      expect(stage('4.9')).toBeNull();
      expect(stage('4.10')).toBeNull();
      expect(screen.getByRole('button', { name: '+2 more stages overlapping' })).toBeInTheDocument();
    });

    it('grows the lane 28 px for each extra sub-row', () => {
      renderRibbon(<RbmEventRibbon runbooks={runbooks()} now={ribbonNow} timeZone="UTC" />);
      expect(px(stage('4.2'), 'top') - px(stage('4.1'), 'top')).toBe(28);
    });

    it('expands the lane to show every stage, and back', async () => {
      renderRibbon(<RbmEventRibbon runbooks={runbooks()} now={ribbonNow} timeZone="UTC" />);
      await userEvent.click(screen.getByRole('button', { name: '+2 more stages overlapping' }));
      expect(stage('4.9')).toHaveAttribute('data-row', '3');
      expect(stage('4.10')).toHaveAttribute('data-row', '4');
      await userEvent.click(screen.getByRole('button', { name: 'Show fewer stages' }));
      expect(stage('4.10')).toBeNull();
    });

    it('keeps a stage on its sub-row as the forecast moves', () => {
      const base = mockOverlappingRunbook();
      const { rerender } = renderRibbon(<RbmEventRibbon runbooks={[base]} now={ribbonNow} timeZone="UTC" />);
      expect(stage('4.4')).toHaveAttribute('data-row', '1');
      // 4.3 slips later, so 4.4 now starts first; without memory 4.4 would move to row 0.
      const moved = { ...base, stages: base.stages.map((s) => (s.id === '4.3' ? { ...s, start: at('00:20'), end: at('01:40') } : s)) };
      rerender(
        <ThemeProvider theme={rbmTheme}>
          <RbmEventRibbon runbooks={[moved]} now={ribbonNow} timeZone="UTC" />
        </ThemeProvider>,
      );
      expect(stage('4.4')).toHaveAttribute('data-row', '1');
      expect(stage('4.3')).toHaveAttribute('data-row', '0');
    });
  });

  it('clips a stage that starts before the window or ends after it, with a flat edge', () => {
    renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" windowStart={at('23:00')} windowEnd={at('05:30')} />);
    expect(px(stage('1.1'), 'left')).toBe(188);
    expect(getComputedStyle(stage('1.1')!).borderRadius).toBe('0px 7px 7px 0px');
    expect(getComputedStyle(stage('3.1')!).borderRadius).toBe('7px 0px 0px 7px');
  });

  it('keeps a long runbook of dozens of stages on one row', () => {
    const long: RbmRibbonRunbook = {
      ...mockRibbon()[2]!,
      id: 'long',
      stages: Array.from({ length: 40 }, (_, i) => ({ id: `L${i}`, wbs: `5.${i}`, name: `Step ${i}`, start: new Date(at('22:00').getTime() + i * 600_000), end: new Date(at('22:00').getTime() + (i + 1) * 600_000), state: 'pending' as const })),
    };
    renderRibbon(<RbmEventRibbon runbooks={[long]} now={ribbonNow} timeZone="UTC" />);
    expect(document.querySelectorAll('[data-row="0"]')).toHaveLength(40);
    expect(document.querySelectorAll('[data-row="1"]')).toHaveLength(0);
  });

  it('shows the lane and forecast of a runbook with no stages', () => {
    const empty: RbmRibbonRunbook = { id: 'e', wbs: '6', name: 'Comms', plannedEnd: at('05:00'), forecastEnd: at('05:00'), rag: 'green', gapMinutes: 0, stages: [] };
    renderRibbon(<RbmEventRibbon runbooks={[empty]} now={ribbonNow} timeZone="UTC" />);
    expect(lane(/^Comms, forecast end 05:00, on schedule$/)).toBeInTheDocument();
    expect(document.querySelectorAll('[data-stage]')).toHaveLength(0);
  });

  it('keeps milestones close together separate, each focusable with its own name', async () => {
    const r = { ...mockRibbon()[2]!, markers: [
      { id: 'a', kind: 'milestone' as const, wbs: '3.1.4', name: 'Reports built', at: at('05:00'), state: 'pending' as const },
      { id: 'b', kind: 'checkpoint' as const, wbs: '3.1.5', name: 'Reports checked', at: at('05:05'), state: 'pending' as const },
    ] };
    renderRibbon(<RbmEventRibbon runbooks={[r]} now={ribbonNow} timeZone="UTC" />);
    expect(screen.getByRole('button', { name: 'Milestone 3.1.4 Reports built, 05:00, Not started' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkpoint 3.1.5 Reports checked, 05:05, Not started' })).toBeInTheDocument();
  });

  it('names each stage for screen readers and takes keyboard focus', async () => {
    const onSelectStage = vi.fn();
    renderRibbon(<RbmEventRibbon runbooks={[mockRibbon()[1]!]} now={ribbonNow} timeZone="UTC" onSelectStage={onSelectStage} />);
    const bar = screen.getByRole('button', { name: 'Stage 2.1 Switch interfaces, 03:00 to 05:27, Active' });
    await userEvent.tab();
    expect(bar).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSelectStage).toHaveBeenCalledWith(expect.objectContaining({ id: '2.1' }));
  });

  it('collapses to one chip per runbook with its forecast end, and expands again', async () => {
    const onCollapsedChange = vi.fn();
    renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" onCollapsedChange={onCollapsedChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Event ribbon' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    const chips = within(screen.getByRole('region', { name: 'Event ribbon' })).getAllByRole('listitem');
    expect(chips).toHaveLength(3);
    expect(chips[1]).toHaveTextContent('2 Interfacesends05:27 +27m');
    expect(chips[1]).toHaveAccessibleName('Interfaces, forecast end 05:27, 27 minutes behind');
    await userEvent.click(screen.getByRole('button', { name: 'Expand Event ribbon' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(screen.getAllByRole('group')).toHaveLength(3);
  });

  it('follows a collapsed value from the parent, so the choice can be remembered', () => {
    renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" collapsed />);
    expect(screen.getByRole('button', { name: 'Expand Event ribbon' })).toBeInTheDocument();
  });

  describe('the Critical runbooks filter', () => {
    const lanes = () => Array.from(document.querySelectorAll<HTMLElement>('[data-lane]')).map((l) => l.dataset.lane);

    it('is off by default and shows every runbook', () => {
      renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
      expect(screen.getByRole('button', { name: 'Critical runbooks' })).toHaveAttribute('aria-pressed', 'false');
      expect(lanes()).toHaveLength(3);
    });

    it('hides runbooks with no stage on the critical path, says how many, and shows them again', async () => {
      const onChange = vi.fn();
      const all = mockRibbon();
      renderRibbon(<RbmEventRibbon runbooks={all} now={ribbonNow} timeZone="UTC" onCriticalRunbooksOnlyChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Critical runbooks' }));
      expect(onChange).toHaveBeenLastCalledWith(true);
      expect(lanes()).toEqual([all[0]!.id]);
      // Every stage of a critical runbook stays: this filter hides runbooks, not stages.
      expect(document.querySelectorAll('[data-stage]')).toHaveLength(all[0]!.stages.length);
      expect(screen.getByRole('status')).toHaveTextContent('2 runbooks hidden: no stages on the critical path');
      await userEvent.click(screen.getByRole('button', { name: 'Show all runbooks' }));
      expect(onChange).toHaveBeenLastCalledWith(false);
      expect(lanes()).toHaveLength(3);
    });

    it('combines with the Critical path filter: critical stages of critical runbooks', () => {
      renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" criticalOnly criticalRunbooksOnly />);
      expect(lanes()).toHaveLength(1);
      expect(Array.from(document.querySelectorAll<HTMLElement>('[data-stage]')).map((s) => s.dataset.stage)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5']);
      expect(screen.queryByText('No stages on the critical path')).not.toBeInTheDocument();
    });

    it('uses the runbook value from the planning engine when it is given', () => {
      const [a, b, c] = mockRibbon();
      renderRibbon(<RbmEventRibbon runbooks={[{ ...a!, critical: false }, { ...b!, critical: true }, c!]} now={ribbonNow} timeZone="UTC" criticalRunbooksOnly />);
      expect(lanes()).toEqual([b!.id]);
    });

    it('keeps the clock when lanes are hidden', () => {
      const { unmount } = renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
      const hours = () => screen.getAllByText(/^\d\d:00$/).map((h) => h.textContent);
      const before = hours();
      unmount();
      renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" criticalRunbooksOnly />);
      expect(hours()).toEqual(before);
    });
  });

  describe('the Critical path filter', () => {
    it('marks critical stages with an outline and in their name, with the filter off', () => {
      renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
      const marked = Array.from(document.querySelectorAll<HTMLElement>('[data-critical]'));
      expect(marked.map((s) => s.dataset.stage)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5']);
      expect(marked[0]!.getAttribute('style')).toMatch(/outline: 2px solid/);
      expect(marked[0]).toHaveAccessibleName(/^Stage 1.1 .*, on the critical path$/);
      const plain = Array.from(document.querySelectorAll<HTMLElement>('[data-stage]:not([data-critical])'));
      expect(plain).toHaveLength(2);
      expect(plain[0]!.getAttribute('style')).not.toMatch(/outline/);
      expect(plain[0]!.getAttribute('aria-label')).not.toMatch(/critical path/);
      expect(screen.getByText('On the critical path')).toBeInTheDocument();
    });

    it('is off by default and shows every stage', () => {
      renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
      expect(screen.getByRole('button', { name: 'Critical path' })).toHaveAttribute('aria-pressed', 'false');
      expect(document.querySelectorAll('[data-stage]')).toHaveLength(7);
    });

    it('shows only stages and markers on the critical path, and keeps every lane', async () => {
      renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" />);
      await userEvent.click(screen.getByRole('button', { name: 'Critical path' }));
      expect(screen.getByRole('button', { name: 'Critical path' })).toHaveAttribute('aria-pressed', 'true');
      expect(Array.from(document.querySelectorAll<HTMLElement>('[data-stage]')).map((s) => s.dataset.stage)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5']);
      expect(document.querySelectorAll('[data-marker]')).toHaveLength(4);
      expect(screen.getAllByRole('group')).toHaveLength(3);
      expect(within(lane(/^Interfaces/)).getByText('No stages on the critical path')).toBeInTheDocument();
      expect(within(lane(/^Interfaces/)).getByText('+27m')).toBeInTheDocument(); // its forecast stays
      expect(within(lane(/^Interfaces/)).queryByTestId('rbm-overrun')).not.toBeInTheDocument(); // no floating overrun
      expect(within(lane(/^Interfaces/)).queryByTestId('rbm-planned-end')).not.toBeInTheDocument();
      expect(within(lane(/^Payroll/)).getByTestId('rbm-overrun')).toBeInTheDocument();
    });

    it('repacks the critical stages, so the lane needs fewer sub-rows', async () => {
      renderRibbon(<RbmEventRibbon runbooks={[mockOverlappingRunbook()]} now={ribbonNow} timeZone="UTC" />);
      expect(screen.getByRole('button', { name: /more stages overlapping/ })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Critical path' }));
      expect(Array.from(document.querySelectorAll<HTMLElement>('[data-stage]')).map((s) => [s.dataset.stage, s.dataset.row])).toEqual([['4.1', '0'], ['4.3', '0'], ['4.10', '0']]);
      expect(screen.queryByRole('button', { name: /more stages overlapping/ })).not.toBeInTheDocument();
    });

    it('can be held by the page', async () => {
      const onCriticalOnlyChange = vi.fn();
      renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" criticalOnly onCriticalOnlyChange={onCriticalOnlyChange} />);
      expect(document.querySelectorAll('[data-stage]')).toHaveLength(5);
      await userEvent.click(screen.getByRole('button', { name: 'Critical path' }));
      expect(onCriticalOnlyChange).toHaveBeenCalledWith(false);
    });

    it('is not offered on the collapsed ribbon', () => {
      renderRibbon(<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" collapsed />);
      expect(screen.queryByRole('button', { name: 'Critical path' })).not.toBeInTheDocument();
    });
  });
});
