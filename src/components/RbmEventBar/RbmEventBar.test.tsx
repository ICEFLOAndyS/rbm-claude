import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmEventBar, barGap, type RbmEventBarProps } from './RbmEventBar';
import { mockEventVitals } from '../../mocks/eventVitals';
import { mockAlerts, mockEvent } from '../../mocks/event';
import { rbmTheme } from '../../theme/theme';
import { colour } from '../../theme/tokens';

const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
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
  it('carries the five facts: name and state, alerts, progress, open issues and Forecast end time', () => {
    bar();
    expect(screen.getByText('REV000009')).toBeInTheDocument();
    expect(screen.getByText('Weekend Payroll Cutover')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^3 alerts,/ })).toHaveStyle({ height: '24px' });
    expect(screen.getByRole('button', { name: 'Progress, 68% complete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 open issues' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forecast end 06:12, +12 min' })).toBeInTheDocument();
  });

  it('is 48 px high', () => {
    bar();
    expect(screen.getByRole('banner', { name: 'Event summary' })).toHaveStyle({ height: '48px' });
  });

  it('shows the gap in the RAG text colour', () => {
    bar({ vitals: mockEventVitals({ rag: 'red', gapMinutes: 27 }) });
    expect(screen.getByText('+27 min')).toHaveStyle({ color: colour.redInner });
  });

  it('is not shown while the Event vitals are on screen', () => {
    bar({ visible: false });
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('makes each part a link, and the chevron goes back to the top', async () => {
    const onOpenProgress = vi.fn();
    const onOpenIssues = vi.fn();
    const onOpenForecast = vi.fn();
    const onBackToTop = vi.fn();
    bar({ onOpenProgress, onOpenIssues, onOpenForecast, onBackToTop });
    await userEvent.click(screen.getByRole('button', { name: 'Progress, 68% complete' }));
    await userEvent.click(screen.getByRole('button', { name: '5 open issues' }));
    await userEvent.click(screen.getByRole('button', { name: /^Forecast end/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to top' }));
    expect([onOpenProgress, onOpenIssues, onOpenForecast, onBackToTop].every((f) => f.mock.calls.length === 1)).toBe(true);
  });

  it('hides the alert counter when the event is healthy', () => {
    bar({ alerts: [] });
    expect(screen.queryByRole('button', { name: /alert/ })).not.toBeInTheDocument();
  });
});
