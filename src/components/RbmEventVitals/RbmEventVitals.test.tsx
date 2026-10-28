import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import source from './RbmEventVitals.tsx?raw';
import { RbmEventVitals, VITALS_CARD_MIN_WIDTH, formatDuration, formatGap, formatWork, workPercent, workSummary, type RbmEventVitalsData } from './RbmEventVitals';
import { ringSegments } from './RbmRing';
import { mockEventVitals } from '../../mocks/eventVitals';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';
import { colour, density, type DensityLevel } from '../../theme/tokens';

const renderVitals = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
const card = (name: string) => screen.getByRole('region', { name });

describe('formatGap', () => {
  it.each([
    [0, 'On Schedule'],
    [12, '+12 min Behind Schedule'],
    [27, '+27 min Behind Schedule'],
    [-8, '−08 min Ahead of Schedule'],
    [95, '+95 min Behind Schedule'],
  ])('%i minutes reads "%s"', (minutes, words) => {
    expect(formatGap(minutes)).toBe(words);
  });
});

describe('formatDuration', () => {
  it.each([
    [340, '05:40'],
    [480, '08:00'],
    [5, '00:05'],
  ])('%i minutes is %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });
});

describe('ringSegments', () => {
  it('matches the Issues ring drawn on the board (1 High, 3 Medium, 1 Low)', () => {
    expect(ringSegments([1, 3, 1], 5)).toEqual([
      { length: 19, offset: 0.5 },
      { length: 59, offset: 20.5 },
      { length: 19, offset: 80.5 },
    ]);
  });

  it('keeps a small non-zero segment visible and draws nothing for zero', () => {
    const [tiny, none] = ringSegments([1, 0], 400);
    expect(tiny!.length).toBe(0.5);
    expect(none!.length).toBe(0);
  });

  it('draws nothing when the total is zero', () => {
    expect(ringSegments([0, 0], 0).every((s) => s.length === 0)).toBe(true);
  });
});

describe('formatWork', () => {
  it.each([
    [1110, '18 h 30 min'],
    [660, '11 h'],
    [45, '45 min'],
    [0, '0 min'],
    [1785, '29 h 45 min'],
  ])('%i minutes reads "%s"', (minutes, words) => {
    expect(formatWork(minutes)).toBe(words);
  });
});

describe('workPercent', () => {
  it('is done ÷ (done + to do), to the nearest whole percent', () => {
    expect(workPercent({ doneMinutes: 1110, todoMinutes: 675 })).toBe(62);
    expect(workPercent({ doneMinutes: 0, todoMinutes: 1785 })).toBe(0);
    expect(workPercent({ doneMinutes: 1785, todoMinutes: 0 })).toBe(100);
  });

  it('never shows 100% while work is left, or 0% once any is done', () => {
    expect(workPercent({ doneMinutes: 999, todoMinutes: 1 })).toBe(99);
    expect(workPercent({ doneMinutes: 1, todoMinutes: 999 })).toBe(1);
  });

  it('is null when there is no work at all', () => {
    expect(workPercent({ doneMinutes: 0, todoMinutes: 0 })).toBeNull();
  });

  it('names the bar with every figure', () => {
    expect(workSummary({ doneMinutes: 1110, todoMinutes: 675 }, false)).toBe('Work Progress, 62%, 18 h 30 min done, 11 h 15 min to do');
    expect(workSummary({ doneMinutes: 1785, todoMinutes: 0 }, true)).toBe('Work Progress, 100%, 29 h 45 min done, 0 min to do, Complete');
  });
});

const renderAt = (ui: ReactElement, level: DensityLevel = 'comfortable') => renderVitals(<RbmDensity level={level}>{ui}</RbmDensity>);
const headings = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const data = (over: Partial<RbmEventVitalsData> = {}) => ({ ...mockEventVitals(), ...over });

describe('RbmEventVitals', () => {
  it('shows the five cards left to right: Work Progress, Task progress, Issues, Start of event, Forecast end time', () => {
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    expect(headings()).toEqual(['Work Progress', 'Task progress', 'Issues', 'Start of event', 'Forecast end time']);
    for (const name of headings()) expect(card(name!)).toBeInTheDocument();
  });

  it('gives every card the same width, wrapping below 185 px rather than shrinking', () => {
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    expect(VITALS_CARD_MIN_WIDTH).toBe(185);
    const row = getComputedStyle(screen.getByTestId('rbm-vitals-row'));
    expect(row.gridTemplateColumns).toBe('repeat(auto-fit, minmax(min(100%, 185px), 1fr))');
    expect(row.gap).toBe(`${density.comfortable.gap}px`);
  });

  describe('Work Progress', () => {
    it('shows the share of Work done, a Blue Dark bar, and Done and To do in hours and minutes', () => {
      renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
      const w = card('Work Progress');
      expect(within(w).getByText('62%')).toHaveStyle({ fontSize: '32px' });
      expect(within(w).getByRole('progressbar', { name: 'Work Progress, 62%, 18 h 30 min done, 11 h 15 min to do' })).toHaveAttribute('aria-valuenow', '62');
      expect(within(w).getByTestId('rbm-work-fill')).toHaveAttribute('data-fill', 'active');
      expect(within(w).getByText('Done').nextElementSibling).toHaveTextContent('18 h 30 min');
      expect(within(w).getByText('To do').nextElementSibling).toHaveTextContent('11 h 15 min');
      expect(within(w).queryByText('Complete')).toBeNull();
    });

    it('turns Brand Green only when the Event is Complete, with a tick and the word', () => {
      renderAt(<RbmEventVitals data={data({ eventComplete: true, work: { doneMinutes: 1785, todoMinutes: 0 } })} timeZone="UTC" />);
      const w = card('Work Progress');
      expect(within(w).getByText('100%')).toBeInTheDocument();
      expect(within(w).getByText('Complete')).toBeInTheDocument();
      expect(within(w).getByTestId('rbm-work-fill')).toHaveAttribute('data-fill', 'complete');
      expect(within(w).getByRole('progressbar')).toHaveAccessibleName(/, Complete$/);
    });

    it('stays Blue Dark at 100% until the Event itself is Complete', () => {
      renderAt(<RbmEventVitals data={data({ work: { doneMinutes: 1785, todoMinutes: 0 } })} timeZone="UTC" />);
      expect(within(card('Work Progress')).getByTestId('rbm-work-fill')).toHaveAttribute('data-fill', 'active');
    });

    it('reads 0% before any work is done', () => {
      renderAt(<RbmEventVitals data={data({ work: { doneMinutes: 0, todoMinutes: 1785 } })} timeZone="UTC" />);
      expect(within(card('Work Progress')).getByText('0%')).toBeInTheDocument();
      expect(within(card('Work Progress')).getByText('Done').nextElementSibling).toHaveTextContent('0 min');
    });

    it('shows an en dash and "No work planned yet." when there is no work', () => {
      renderAt(<RbmEventVitals data={data({ work: { doneMinutes: 0, todoMinutes: 0 } })} timeZone="UTC" />);
      const w = card('Work Progress');
      expect(within(w).getByLabelText('No percentage')).toHaveTextContent('–');
      expect(w).toHaveTextContent('No work planned yet.');
      expect(within(w).queryByRole('progressbar')).toBeNull();
    });

    it('D0 shows the percentage and the bar alone, larger', () => {
      renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />, 'command');
      const w = card('Work Progress');
      expect(within(w).getByText('62%')).toHaveStyle({ fontSize: '44px' });
      expect(within(w).getByRole('progressbar')).toBeInTheDocument();
      expect(within(w).queryByText('Done')).toBeNull();
    });

    it('D2 keeps Done and To do with a 28 px figure', () => {
      renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />, 'compact');
      const w = card('Work Progress');
      expect(within(w).getByText('62%')).toHaveStyle({ fontSize: '28px' });
      expect(within(w).getByText('Done')).toBeInTheDocument();
    });

    it('D3 is one 40 px line, the title and the percentage, with the bar only for a screen reader', () => {
      renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />, 'dense');
      const w = card('Work Progress');
      expect(w).toHaveStyle({ height: '40px', flexDirection: 'row' });
      expect(within(w).getByText('62%')).toHaveStyle({ fontSize: '20px' });
      expect(within(w).getByRole('progressbar')).toHaveStyle({ position: 'absolute', width: '1px' });
      expect(within(w).queryByText('Done')).toBeNull();
    });
  });

  it('shows Task progress (renamed from Progress) as the share of tasks complete, with the counts in words', () => {
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    const tasks = card('Task progress');
    expect(within(tasks).getByText('68%')).toHaveStyle({ fontSize: '16px' });
    for (const [label, value] of [['Complete', '84'], ['In progress', '3'], ['Blocked', '2'], ['Total', '124']]) {
      // Each legend row is a term (dt) and its count (dd), in 12 px text.
      expect(within(tasks).getByText(label!).nextElementSibling).toHaveTextContent(value!);
    }
    expect(within(tasks).getByText('Complete').parentElement).toHaveStyle({ fontSize: '12px' });
  });

  it('shows open issues by severity, with the total in the centre', () => {
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    const issues = card('Issues');
    expect(within(issues).getAllByText('5')).toHaveLength(2); // centre and Open
    expect(within(issues).getByText('High')).toHaveStyle({ color: colour.redInner });
    expect(within(issues).getByText('Medium')).toHaveStyle({ color: colour.amberDeep });
    expect(within(issues).getAllByTestId('rbm-ring-segment')).toHaveLength(3);
  });

  it('shows the start date, time and elapsed time', () => {
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    const start = card('Start of event');
    expect(within(start).getByText('MAY')).toBeInTheDocument();
    expect(within(start).getByText('22:00')).toHaveStyle({ fontSize: '32px' });
    expect(start).toHaveTextContent('24 May, 22:00');
    expect(start).toHaveTextContent('Elapsed 05:40 of 08:00');
  });

  it.each([
    ['green', 0, '06:00', 'On Schedule', colour.greenDeep],
    ['amber', 12, '06:12', '+12 min Behind Schedule', colour.amberDeep],
    ['red', 27, '06:27', '+27 min Behind Schedule', colour.redInner],
    ['green', -8, '05:52', '−08 min Ahead of Schedule', colour.greenDeep],
  ] as const)('shows a %s forecast with the time, the gap in words under it and the planned end', (rag, gap, time, words, text) => {
    renderAt(<RbmEventVitals data={mockEventVitals({ rag, gapMinutes: gap })} timeZone="UTC" />);
    const forecast = card('Forecast end time');
    // The large figure comes first (34 px as drawn); on schedule, the planned end shows the same time.
    expect(within(forecast).getAllByText(time)[0]).toHaveStyle({ fontSize: '34px' });
    expect(within(forecast).getByText(words)).toHaveStyle({ color: text });
    expect(forecast).toHaveTextContent('Planned end 06:00');
    expect(within(forecast).getByTestId('rbm-rag-disc')).toHaveStyle({ width: '48px' });
    expect(within(forecast).getByTestId('rbm-rag-disc')).toHaveAttribute('data-rag', rag);
  });

  it('shows Raise issue only when the user may raise issues', async () => {
    const { unmount } = renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    expect(screen.queryByRole('button', { name: 'Raise issue' })).not.toBeInTheDocument();
    unmount();
    const onRaiseIssue = vi.fn();
    const onOpenIssues = vi.fn();
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" onRaiseIssue={onRaiseIssue} onOpenIssues={onOpenIssues} />);
    await userEvent.click(screen.getByRole('button', { name: 'Raise issue' }));
    expect(onRaiseIssue).toHaveBeenCalledOnce();
    expect(onOpenIssues).not.toHaveBeenCalled();
  });

  it('makes each card a link that works from the keyboard, Work Progress first', async () => {
    const onOpenWork = vi.fn();
    const onOpenProgress = vi.fn();
    const onOpenForecast = vi.fn();
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" onOpenWork={onOpenWork} onOpenProgress={onOpenProgress} onOpenForecast={onOpenForecast} />);
    await userEvent.tab();
    expect(within(card('Work Progress')).getByRole('button', { name: 'Open the task list' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onOpenWork).toHaveBeenCalledOnce();
    await userEvent.tab();
    expect(within(card('Task progress')).getByRole('button', { name: 'Open the task list' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Open the late tasks and the critical path' }));
    expect(onOpenForecast).toHaveBeenCalledOnce();
  });

  it('has no card links when nothing is given to open', () => {
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows an empty ring when there are no open issues', () => {
    renderAt(<RbmEventVitals data={data({ issues: { high: 0, medium: 0, low: 0 } })} timeZone="UTC" />);
    expect(within(card('Issues')).queryAllByTestId('rbm-ring-segment')).toHaveLength(0);
  });

  it('shows grey blocks in every card while loading, announced as loading', () => {
    renderAt(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" loading onRaiseIssue={vi.fn()} />);
    expect(screen.getByTestId('rbm-vitals-row')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button', { name: 'Raise issue' })).toBeNull();
    for (const name of ['Work Progress', 'Task progress', 'Issues', 'Start of event', 'Forecast end time']) {
      expect(card(name)).toHaveTextContent(`Loading ${name}`);
      expect(card(name)).toHaveAttribute('aria-busy', 'true');
    }
    expect(screen.queryByText('62%')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('has no hex colours: they come from the theme tokens', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
