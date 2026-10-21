import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmAlertCounter, sortAlerts, type RbmAlert } from './RbmAlertCounter';
import { rbmTheme } from '../../theme/theme';
import { colour, elevation } from '../../theme/tokens';

const renderCounter = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

const late: RbmAlert = { id: 'f', severity: 'amber', title: 'Forecast end is 12 minutes late', detail: 'The critical path runs through 1.3.7 Run smoke tests.' };
const blockers: RbmAlert = { id: 'b', severity: 'red', title: '2 blockers are holding 3 tasks', detail: 'The forecast end has moved 12 minutes late.' };
const check: RbmAlert = { id: 'c', severity: 'red', title: '1 task failed its check' };

describe('sortAlerts', () => {
  it('puts Red before Amber and keeps the engine’s order within a severity', () => {
    expect(sortAlerts([late, blockers, check]).map((a) => a.id)).toEqual(['b', 'c', 'f']);
  });
});

describe('RbmAlertCounter', () => {
  it('shows nothing when the event is healthy', () => {
    const { container } = renderCounter(<RbmAlertCounter alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says the count in words and digits', () => {
    const { unmount } = renderCounter(<RbmAlertCounter alerts={[late]} />);
    expect(screen.getByRole('button', { name: /^1 alert,/ })).toBeInTheDocument();
    unmount();
    renderCounter(<RbmAlertCounter alerts={[late, blockers, check]} />);
    expect(screen.getByRole('button', { name: /^3 alerts,/ })).toHaveTextContent('3 alerts');
  });

  it('tells screen readers the most serious alert, since Red and Amber differ only in colour', () => {
    const { unmount } = renderCounter(<RbmAlertCounter alerts={[late, blockers, check]} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('3 alerts, most serious: 2 blockers are holding 3 tasks');
    unmount();
    renderCounter(<RbmAlertCounter alerts={[late]} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('1 alert, most serious: Forecast end is 12 minutes late');
  });

  it('uses the Foundations board menu shadow on the popover', async () => {
    renderCounter(<RbmAlertCounter alerts={[blockers]} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toHaveStyle({ boxShadow: elevation.menu });
  });

  it('is Red with white text when any alert is Red', () => {
    renderCounter(<RbmAlertCounter alerts={[late, blockers]} />);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: colour.redInner, color: colour.white, height: '30px', fontSize: '15px' });
  });

  it('is Amber with Ink text when the only alert is a late forecast', () => {
    renderCounter(<RbmAlertCounter alerts={[late]} />);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: colour.amber, color: colour.ink });
  });

  it('is 24 px with 12 px text in the compact event bar', () => {
    renderCounter(<RbmAlertCounter alerts={[blockers]} size="compact" />);
    expect(screen.getByRole('button')).toHaveStyle({ height: '24px', fontSize: '12px' });
  });

  it('opens the alerts, most serious first, and says it has a popup', async () => {
    renderCounter(<RbmAlertCounter alerts={[late, blockers, check]} />);
    const counter = screen.getByRole('button', { name: /^3 alerts,/ });
    expect(counter).toHaveAttribute('aria-haspopup', 'dialog');
    expect(counter).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(counter);
    expect(counter).toHaveAttribute('aria-expanded', 'true');
    const dialog = screen.getByRole('dialog', { name: 'Alerts' });
    const items = within(dialog).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(/^2 blockers are holding 3 tasks/);
    expect(items[1]).toHaveTextContent(/^1 task failed its check/);
    expect(items[2]).toHaveTextContent(/^Forecast end is 12 minutes late/);
    expect(within(dialog).getByText('Most serious first')).toBeInTheDocument();
  });

  it('opens from the keyboard and closes with Escape, returning focus', async () => {
    renderCounter(<RbmAlertCounter alerts={[blockers]} />);
    await userEvent.tab();
    const counter = screen.getByRole('button', { name: /^1 alert,/ });
    expect(counter).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Alerts' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(counter).toHaveFocus();
  });

  it('runs an alert’s action and closes the popover', async () => {
    const onSelect = vi.fn();
    renderCounter(<RbmAlertCounter alerts={[{ ...blockers, action: { label: 'View blockers', onSelect } }]} />);
    await userEvent.click(screen.getByRole('button', { name: /^1 alert,/ }));
    await userEvent.click(screen.getByRole('button', { name: 'View blockers' }));
    expect(onSelect).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('marks a Red alert with a dot and a late forecast with the ringed dot', async () => {
    renderCounter(<RbmAlertCounter alerts={[blockers, late]} />);
    await userEvent.click(screen.getByRole('button'));
    const [red, amber] = screen.getAllByTestId('rbm-alert-mark');
    expect(red).toHaveStyle({ width: '10px', backgroundColor: colour.red });
    expect(amber).toHaveStyle({ width: '12px', backgroundColor: colour.amber });
    expect(amber!.firstElementChild).toHaveStyle({ backgroundColor: colour.amberInner });
  });
});
