import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RbmTopBar, type RbmTopBarProps } from './RbmTopBar';
import { RbmAccountMenu, type RbmUser } from './RbmAccountMenu';
import { RbmDensity } from '../../theme/RbmDensity';
import { shellSize, type DensityLevel } from '../../theme/tokens';

const user: RbmUser = { id: 'a.smith', name: 'Andy Smith', role: 'Cutover Manager', email: 'andy.smith@iceflo.com' };

function renderBar(props: Partial<RbmTopBarProps> = {}, level: DensityLevel = 'compact') {
  return render(
    <RbmDensity level={level}>
      <RbmTopBar user={user} sidebar="expanded" {...props} />
    </RbmDensity>,
  );
}

describe('RbmTopBar', () => {
  it('is the page banner, with the ICEFLO logo', () => {
    renderBar();
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('img', { name: 'ICEFLO' })).toBeInTheDocument();
  });

  it('holds session information only: notifications and the account, no search and no page context', () => {
    renderBar();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Notifications', 'Account: Andy Smith']);
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('shows the user name and role, with the avatar hidden from screen readers', () => {
    renderBar();
    const account = screen.getByRole('button', { name: 'Account: Andy Smith' });
    expect(account).toHaveTextContent('Andy Smith');
    expect(account).toHaveTextContent('Cutover Manager');
    expect(within(account).queryByRole('img')).toBeNull();
  });

  it.each(['comfortable', 'compact', 'dense'] as const)('is the board height at %s, with the logo block as wide as the sidebar', (level) => {
    renderBar({}, level);
    const banner = screen.getByRole('banner');
    // The toolbar plus the 1 px divider under it.
    expect(banner.firstElementChild).toHaveStyle({ height: `${shellSize[level].topBar - 1}px` });
    expect(screen.getByRole('img', { name: 'ICEFLO' }).parentElement).toHaveStyle({ width: `${shellSize[level].sidebar}px` });
  });

  it('shows the ICEFLO mark over the rail, in a block as wide as the rail', () => {
    renderBar({ sidebar: 'rail' });
    const logo = screen.getByRole('img', { name: 'ICEFLO' });
    expect(logo).toHaveAttribute('src', expect.stringContaining('iceflo-mark'));
    expect(logo.parentElement).toHaveStyle({ width: `${shellSize.compact.rail}px` });
  });
});

describe('RbmTopBar: notifications', () => {
  it('shows the count in the name and as a pill', () => {
    renderBar({ notificationCount: 4 });
    expect(screen.getByRole('button', { name: 'Notifications (4 new)' })).toBeInTheDocument();
    expect(screen.getByTestId('rbm-notification-count')).toHaveTextContent('4');
  });

  it('shows no pill at 0', () => {
    renderBar({ notificationCount: 0 });
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByTestId('rbm-notification-count')).toBeNull();
  });

  it('caps a large count at 99+', () => {
    renderBar({ notificationCount: 240 });
    expect(screen.getByTestId('rbm-notification-count')).toHaveTextContent('99+');
    expect(screen.getByRole('button', { name: 'Notifications (99+ new)' })).toBeInTheDocument();
  });

  it('has a tooltip with its name', async () => {
    renderBar();
    act(() => screen.getByRole('button', { name: 'Notifications' }).focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Notifications');
  });

  it('opens a popover, and Escape closes it and returns focus to the bell', async () => {
    renderBar({ notificationCount: 2, notifications: <p>Task 1.3.5 is late.</p> });
    const bell = screen.getByRole('button', { name: 'Notifications (2 new)' });
    await userEvent.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toHaveTextContent('Task 1.3.5 is late.');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(bell).toHaveFocus();
  });
});

describe('RbmAccountMenu', () => {
  it('opens the menu: who is signed in, then the four items in order', async () => {
    render(<RbmAccountMenu user={user} />);
    const button = screen.getByRole('button', { name: 'Account: Andy Smith' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Account' });
    expect(menu).toHaveTextContent('andy.smith@iceflo.com');
    expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Profile', 'Settings', 'Notification preferences', 'Sign out']);
  });

  it('reports the chosen item and closes', async () => {
    const onAction = vi.fn();
    render(<RbmAccountMenu user={user} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Account: Andy Smith' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(onAction).toHaveBeenCalledWith('signOut');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('works from the keyboard: arrows move through the items, and Escape returns focus', async () => {
    const onAction = vi.fn();
    render(<RbmAccountMenu user={user} onAction={onAction} />);
    const button = screen.getByRole('button', { name: 'Account: Andy Smith' });
    act(() => button.focus());
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(button).toHaveFocus();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('is the avatar alone when compact', () => {
    render(<RbmAccountMenu user={user} compact />);
    expect(screen.getByRole('button', { name: 'Account: Andy Smith' })).not.toHaveTextContent('Cutover Manager');
  });
});

describe('RbmTopBar: narrow screens', () => {
  it('starts with the menu button, which opens the drawer', async () => {
    const onMenu = vi.fn();
    renderBar({ sidebar: 'drawer', onMenu, menuControls: 'drawer' });
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAccessibleName('Menu');
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(buttons[0]!);
    expect(onMenu).toHaveBeenCalled();
  });

  it('says when the drawer is open', () => {
    renderBar({ sidebar: 'drawer', menuOpen: true, menuControls: 'drawer' });
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(menu).toHaveAttribute('aria-controls', 'drawer');
  });

  it('shows the user as the avatar alone', () => {
    renderBar({ sidebar: 'drawer' });
    expect(screen.getByRole('button', { name: 'Account: Andy Smith' })).not.toHaveTextContent('Andy Smith');
  });
});

describe('RbmTopBar: D0 Command', () => {
  it('shows the programme name and a large clock, and no controls', () => {
    renderBar({ programme: 'Q4 Data Centre Migration', clock: '10:42:18', notificationCount: 4 }, 'command');
    const banner = screen.getByRole('banner');
    expect(banner).toHaveTextContent('Q4 Data Centre Migration');
    expect(banner).toHaveTextContent('10:42:18');
    expect(within(banner).queryAllByRole('button')).toEqual([]);
    expect(banner.firstElementChild).toHaveStyle({ height: '72px' });
  });
});
