import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmEventVitals, formatDuration, formatGap } from './RbmEventVitals';
import { ringSegments } from './RbmRing';
import { mockEventVitals } from '../../mocks/eventVitals';
import { rbmTheme } from '../../theme/theme';
import { colour, density } from '../../theme/tokens';

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

describe('RbmEventVitals', () => {
  it('shows the four cards left to right: Progress, Issues, Start of event, Forecast end time', () => {
    renderVitals(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby') && within(r).getByRole('heading').textContent)).toEqual([
      'Progress',
      'Issues',
      'Start of event',
      'Forecast end time',
    ]);
  });

  it('shows progress as the share complete, with the counts in words', () => {
    renderVitals(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    const progress = card('Progress');
    expect(within(progress).getByText('68%')).toBeInTheDocument();
    for (const [label, value] of [['Complete', '84'], ['In progress', '3'], ['Blocked', '2'], ['Total', '124']]) {
      // Each legend row is a term (dt) and its count (dd).
      expect(within(progress).getByText(label!).nextElementSibling).toHaveTextContent(value!);
    }
  });

  it('shows open issues by severity, with the total in the centre', () => {
    renderVitals(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    const issues = card('Issues');
    expect(within(issues).getAllByText('5')).toHaveLength(2); // centre and Open
    expect(within(issues).getByText('High')).toHaveStyle({ color: colour.redInner });
    expect(within(issues).getByText('Medium')).toHaveStyle({ color: colour.amberDeep });
    expect(within(issues).getAllByTestId('rbm-ring-segment')).toHaveLength(3);
  });

  it('shows the start date, time and elapsed time', () => {
    renderVitals(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    const start = card('Start of event');
    expect(within(start).getByText('MAY')).toBeInTheDocument();
    expect(within(start).getByText('22:00')).toBeInTheDocument();
    expect(start).toHaveTextContent('24 May, 22:00');
    expect(start).toHaveTextContent('Elapsed 05:40 of 08:00');
  });

  it.each([
    ['green', 0, '06:00', 'On Schedule', colour.greenDeep],
    ['amber', 12, '06:12', '+12 min Behind Schedule', colour.amberDeep],
    ['red', 27, '06:27', '+27 min Behind Schedule', colour.redInner],
  ] as const)('shows a %s forecast with the time, the gap in words and the planned end', (rag, gap, time, words, text) => {
    renderVitals(<RbmEventVitals data={mockEventVitals({ rag, gapMinutes: gap })} timeZone="UTC" />);
    const forecast = card('Forecast end time');
    // The large figure comes first; on schedule, the planned end shows the same time.
    expect(within(forecast).getAllByText(time)[0]).toHaveStyle({ fontSize: `${density.comfortable.figure}px` }); // The D1 figure size (drawn 36 px).
    expect(within(forecast).getByText(words)).toHaveStyle({ color: text });
    expect(forecast).toHaveTextContent('Planned end 06:00');
    expect(within(forecast).getByTestId('rbm-rag-disc')).toHaveAttribute('data-rag', rag);
  });

  it('shows Raise issue only when the user may raise issues', async () => {
    const { unmount } = renderVitals(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    expect(screen.queryByRole('button', { name: 'Raise issue' })).not.toBeInTheDocument();
    unmount();
    const onRaiseIssue = vi.fn();
    const onOpenIssues = vi.fn();
    renderVitals(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" onRaiseIssue={onRaiseIssue} onOpenIssues={onOpenIssues} />);
    await userEvent.click(screen.getByRole('button', { name: 'Raise issue' }));
    expect(onRaiseIssue).toHaveBeenCalledOnce();
    expect(onOpenIssues).not.toHaveBeenCalled();
  });

  it('makes each card a link that works from the keyboard', async () => {
    const onOpenForecast = vi.fn();
    const onOpenProgress = vi.fn();
    renderVitals(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" onOpenProgress={onOpenProgress} onOpenForecast={onOpenForecast} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Open the task list' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onOpenProgress).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Open the late tasks and the critical path' }));
    expect(onOpenForecast).toHaveBeenCalledOnce();
  });

  it('has no card links when nothing is given to open', () => {
    renderVitals(<RbmEventVitals data={mockEventVitals()} timeZone="UTC" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows an empty ring when there are no open issues', () => {
    const data = { ...mockEventVitals(), issues: { high: 0, medium: 0, low: 0 } };
    renderVitals(<RbmEventVitals data={data} timeZone="UTC" />);
    expect(within(card('Issues')).queryAllByTestId('rbm-ring-segment')).toHaveLength(0);
  });
});
