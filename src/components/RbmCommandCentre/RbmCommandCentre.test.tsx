import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmCommandCentre, TIMELINE_MIN_HEIGHT, formatWindow, type RbmCommandCentreProps } from './RbmCommandCentre';
import { mockEventVitals } from '../../mocks/eventVitals';
import { mockAlerts, mockEvent } from '../../mocks/event';
import { at } from '../../mocks/eventRibbon';
import { rbmTheme } from '../../theme/theme';

const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
const page = (over: Partial<RbmCommandCentreProps> = {}) =>
  renderUi(
    <RbmCommandCentre
      event={{ ...mockEvent(), owner: 'Cutover Manager Team', window: { start: at('22:00'), end: at('06:00') } }}
      alerts={mockAlerts()}
      vitalsData={mockEventVitals()}
      timeZone="UTC"
      vitals={<div>Vitals</div>}
      ribbon={<div>Ribbon</div>}
      timeline={<div>Timeline</div>}
      hotTopics={<div>Hot topics</div>}
      {...over}
    />,
  );
// The main column's regions in order, then the Hot-topics panel beside them.
const regionOrder = () => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="rbm-main-column"] > [data-region], [data-testid="rbm-main-column"] + [data-region]')).map((r) => r.dataset.region);

describe('formatWindow', () => {
  it('writes the window with days and times', () => {
    expect(formatWindow(at('22:00'), at('06:00'), 'UTC')).toBe('Sun 24 May 22:00 – Mon 25 May 06:00');
  });
});

describe('RbmCommandCentre', () => {
  it('shows the page header: breadcrumb, title with state and alerts, owner and window', () => {
    page();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Run / Weekend Payroll Cutover');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('REV000009 · Weekend Payroll Cutover');
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^3 alerts,/ })).toBeInTheDocument();
    expect(screen.getByText(/Owner/)).toHaveTextContent('Owner Cutover Manager Team · Window Sun 24 May 22:00 – Mon 25 May 06:00');
  });

  it('names the page by its title', () => {
    page();
    expect(screen.getByRole('region', { name: 'REV000009 · Weekend Payroll Cutover' })).toBeInTheDocument();
  });

  it('puts the movable regions in the default order, after the fixed vitals', () => {
    page();
    expect(regionOrder()).toEqual(['ribbon', 'timeline', 'hotTopics']);
    const text = document.body.textContent ?? '';
    expect(text.indexOf('Vitals')).toBeLessThan(text.indexOf('Ribbon'));
  });

  it('follows the user’s layout', () => {
    page({ layout: ['timeline', 'ribbon'] });
    expect(regionOrder()).toEqual(['timeline', 'ribbon', 'hotTopics']);
  });

  it('puts the Hot-topics panel beside the main column, not in it', () => {
    page();
    const main = screen.getByTestId('rbm-main-column');
    expect(main.querySelector('[data-region="hotTopics"]')).toBeNull();
    expect(main.nextElementSibling).toHaveAttribute('data-region', 'hotTopics');
    expect(main.nextElementSibling).toHaveTextContent('Hot topics');
  });

  it('keeps room for at least 8 rows of the Task Timeline', () => {
    page();
    expect(screen.getByText('Timeline').parentElement).toHaveStyle({ minHeight: `${TIMELINE_MIN_HEIGHT}px` });
  });

  it('drops the 8-row minimum while the Task Timeline is collapsed', () => {
    page({ collapsed: { timeline: true } });
    expect(screen.getByText('Timeline').parentElement).not.toHaveStyle({ minHeight: `${TIMELINE_MIN_HEIGHT}px` });
  });

  it('opens and collapses regions from the Layout panel', async () => {
    const onCollapsedChange = vi.fn();
    page({ collapsed: {}, onCollapsedChange });
    await userEvent.click(screen.getByRole('button', { name: 'Event actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Layout/ }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Layout' })).getByRole('switch', { name: 'Task Timeline open' }));
    expect(onCollapsedChange).toHaveBeenCalledWith('timeline', true);
  });

  it('shows only the event actions the user may take, and always Layout', async () => {
    const raiseIssue = vi.fn();
    page({ eventActions: { raiseIssue } });
    await userEvent.click(screen.getByRole('button', { name: 'Event actions' }));
    const menu = screen.getByRole('menu', { name: 'Event actions' });
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Raise issue', 'LayoutOrder the page regions']);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Raise issue' }));
    expect(raiseIssue).toHaveBeenCalledOnce();
  });

  it('lists every event action in the drawn order when all are allowed', async () => {
    const all = { raiseIssue: vi.fn(), raiseBlocker: vi.fn(), addNote: vi.fn(), notifyStakeholders: vi.fn(), pauseEvent: vi.fn(), exportLog: vi.fn(), settings: vi.fn() };
    page({ eventActions: all });
    await userEvent.click(screen.getByRole('button', { name: 'Event actions' }));
    expect(screen.getAllByRole('menuitem').map((i) => i.firstChild?.nextSibling?.firstChild?.textContent)).toEqual([
      'Raise issue', 'Raise blocker', 'Add event note', 'Notify stakeholders', 'Pause event', 'Export event log', 'Layout', 'Event settings',
    ]);
  });

  it('opens the Layout panel from the menu, and the page re-orders at once', async () => {
    const onLayoutChange = vi.fn();
    page({ layout: ['timeline', 'ribbon'], onLayoutChange });
    await userEvent.click(screen.getByRole('button', { name: 'Event actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Layout/ }));
    const panel = screen.getByRole('dialog', { name: 'Layout' });
    await userEvent.click(within(panel).getByRole('button', { name: 'Reset to default' }));
    expect(onLayoutChange).toHaveBeenCalledWith(['ribbon', 'timeline']);
  });

  it('reorders by itself when the page does not hold the layout', async () => {
    page();
    await userEvent.click(screen.getByRole('button', { name: 'Event actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Layout/ }));
    expect(screen.getByRole('dialog', { name: 'Layout' })).toBeInTheDocument();
    expect(regionOrder()).toEqual(['ribbon', 'timeline', 'hotTopics']);
  });

  describe('the compact event bar', () => {
    let trigger: (onScreen: boolean) => void = () => {};
    beforeEach(() => {
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(cb: IntersectionObserverCallback) {
            trigger = (onScreen) => cb([{ isIntersecting: onScreen } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
          }
          observe() {}
          disconnect() {}
        },
      );
    });
    afterEach(() => vi.unstubAllGlobals());

    it('appears only once the Event vitals have scrolled away', () => {
      page();
      expect(screen.queryByRole('banner', { name: 'Event summary' })).not.toBeInTheDocument();
      act(() => trigger(false));
      expect(screen.getByRole('banner', { name: 'Event summary' })).toBeInTheDocument();
    });

    it('disappears when the Event vitals come back, so the same facts are never shown twice', async () => {
      page();
      act(() => trigger(false));
      expect(screen.getByRole('banner', { name: 'Event summary' })).toBeInTheDocument();
      act(() => trigger(true));
      await waitFor(() => expect(screen.queryByRole('banner', { name: 'Event summary' })).not.toBeInTheDocument());
    });

    it('stays the same whatever the layout order', () => {
      page({ layout: ['timeline', 'ribbon'] });
      act(() => trigger(false));
      expect(screen.getByRole('banner', { name: 'Event summary' })).toBeInTheDocument();
    });
  });
});
