import { useState } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { RbmAppShell, type RbmAppShellProps } from './RbmAppShell';
import { ShellFrameContext, useScrollContainer, useShellFrame } from './shellContext';
import { useHotTopicsNarrow } from '../RbmHotTopicsStrip/RbmHotTopicsPanel';
import { RbmSlideInRegion } from '../RbmSlideInRegion/RbmSlideInRegion';
import { rbmTheme } from '../../theme/theme';
import { shellSize } from '../../theme/tokens';
import { rbmNav } from '../../data/nav/nav';
import { createMockNavData } from '../../data/nav/navData';
import { createMemorySidebarStore } from '../../data/nav/sidebarPreference';

function setWidth(width: number) {
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
    return { matches, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false };
  }) as typeof window.matchMedia;
}
const original = window.matchMedia;
beforeEach(() => setWidth(1280));
afterEach(() => {
  window.matchMedia = original;
});

const user = { id: 'a.smith', name: 'Andy Smith', role: 'Cutover Manager', email: 'andy.smith@iceflo.com' };
const footer = { version: '4.2.0', year: 2026, updatedAt: '10:42:18', environment: { name: 'Production', production: true }, links: { privacy: '#p', support: '#s', knowledge: '#k' } };

function renderShell(props: Partial<RbmAppShellProps> = {}, children = <button type="button">Page action</button>) {
  return render(
    <ThemeProvider theme={rbmTheme}>
      <RbmAppShell nav={rbmNav} navData={createMockNavData()} user={user} path="/events" hrefFor={(to) => `#${to}`} onNavigate={() => {}} footer={footer} sidebarStore={createMemorySidebarStore()} {...props}>
        {children}
      </RbmAppShell>
    </ThemeProvider>,
  );
}

describe('RbmAppShell: the zones', () => {
  it('draws the top bar, the sidebar, the content and the footer', () => {
    renderShell();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByTestId('rbm-shell-content')).toContainElement(screen.getByRole('button', { name: 'Page action' }));
    expect(screen.getByRole('contentinfo')).toHaveTextContent('RBM 4.2.0');
  });

  it('marks the active item from the route', () => {
    renderShell({ path: '/events/REV000009' });
    expect(within(screen.getByRole('group', { name: 'Events' })).getByRole('link', { name: 'List' })).toHaveAttribute('aria-current', 'page');
  });

  it('is D2 Compact by default: the board sizes for the bar and the footer', () => {
    renderShell();
    expect(screen.getByRole('banner').firstElementChild).toHaveStyle({ height: `${shellSize.compact.topBar - 1}px` });
    expect(screen.getByRole('contentinfo')).toHaveStyle({ height: `${shellSize.compact.footer}px` });
  });

  it('takes another density', () => {
    renderShell({ density: 'comfortable' });
    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveStyle({ width: `${shellSize.comfortable.sidebar}px` });
  });

  it('at D0 Command has no sidebar, and the bar shows the programme and the clock', () => {
    renderShell({ density: 'command', programme: 'Q4 Data Centre Migration', clock: '10:42:18' });
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    expect(screen.getByRole('banner')).toHaveTextContent('Q4 Data Centre Migration10:42:18');
  });
});

describe('RbmAppShell: keyboard', () => {
  it('has the skip link first in the tab order, and it moves focus to the content', async () => {
    renderShell();
    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('rbm-shell-content').firstElementChild).toHaveFocus();
    // From the content, Tab goes on into the page.
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Page action' })).toHaveFocus();
  });

  it('goes top bar, then sidebar, then content, then footer', async () => {
    renderShell();
    const order: string[] = [];
    for (let i = 0; i < 20; i++) {
      await userEvent.tab();
      const el = document.activeElement as HTMLElement;
      const zone = el.closest('header') ? 'top bar' : el.closest('nav[aria-label="Main"]') ? 'sidebar' : el.closest('footer') ? 'footer' : el.closest('[data-testid="rbm-shell-content"]') ? 'content' : 'skip';
      if (order.includes(zone) && order.at(-1) !== zone) break; // wrapped round to the start
      if (order.at(-1) !== zone) order.push(zone);
    }
    expect(order).toEqual(['skip', 'top bar', 'sidebar', 'content', 'footer']);
  });

  it('under 900 px the menu button opens the drawer, and Escape returns focus to it', async () => {
    setWidth(800);
    renderShell();
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    const menu = screen.getByRole('button', { name: 'Menu' });
    await userEvent.click(menu);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(menu).toHaveAttribute('aria-controls', nav.id);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull());
    expect(menu).toHaveFocus();
  });

  it('remembers Collapse', async () => {
    const store = createMemorySidebarStore();
    renderShell({ sidebarStore: store });
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(store.value()).toBe(true);
  });
});

describe('the host page (demo/index.html)', () => {
  it('links the ICEFLO favicon, and the file is there', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const demo = join(__dirname, '..', '..', '..', 'demo');
    const html = readFileSync(join(demo, 'index.html'), 'utf8');
    expect(html).toMatch(/<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32x32.png" \/>/);
    const png = readFileSync(join(demo, 'public', 'favicon-32x32.png'));
    expect(existsSync(join(demo, 'public', 'favicon-32x32.png'))).toBe(true);
    // A PNG, 32 by 32: the signature, then the IHDR width and height.
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(32);
    expect(png.readUInt32BE(20)).toBe(32);
  });
});

describe('the Hot-topics rule inside the shell', () => {
  function Probe() {
    return <span>{useHotTopicsNarrow() ? 'strip' : 'panel'}</span>;
  }
  const inShell = (width: number | null) =>
    render(
      <ShellFrameContext.Provider value={{ frame: null, scroller: null, width }}>
        <Probe />
      </ShellFrameContext.Provider>,
    );

  it('asks the content area, not the window: 1,280 px window, 1,056 px content, so the strip', () => {
    inShell(1056);
    expect(screen.getByText('strip')).toBeInTheDocument();
  });

  it('keeps the side panel when the content is 1,200 px or more', () => {
    inShell(1216);
    expect(screen.getByText('panel')).toBeInTheDocument();
  });

  it('asks the window outside a shell', () => {
    inShell(null);
    expect(screen.getByText('panel')).toBeInTheDocument();
  });
});

describe('RbmAppShell: what a page gets', () => {
  it('gives the page the content scroller and frame', () => {
    let seen: { scroller: HTMLElement | null; frame: HTMLElement | null } = { scroller: null, frame: null };
    function Page() {
      const scroller = useScrollContainer();
      const { frame } = useShellFrame();
      seen = { scroller, frame };
      return null;
    }
    renderShell({}, <Page />);
    expect(seen.frame).toBe(screen.getByTestId('rbm-shell-content'));
    expect(seen.scroller).toBe(screen.getByTestId('rbm-shell-content').firstElementChild);
  });

  it('opens a page’s slide-in over the content only, without passing a container', async () => {
    function Page() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open record
          </button>
          <RbmSlideInRegion open={open} onClose={() => setOpen(false)} label="Record">
            <p>Record panel</p>
          </RbmSlideInRegion>
        </>
      );
    }
    renderShell({}, <Page />);
    await userEvent.click(screen.getByRole('button', { name: 'Open record' }));
    const dialog = screen.getByRole('dialog', { name: 'Record' });
    expect(screen.getByTestId('rbm-shell-content')).toContainElement(dialog);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('calls onNavigate from the menu', async () => {
    const onNavigate = vi.fn();
    renderShell({ onNavigate });
    await userEvent.click(screen.getByRole('link', { name: 'Teams' }));
    expect(onNavigate).toHaveBeenCalledWith('/library/teams');
  });

  it('reports the account menu', async () => {
    const onAccountAction = vi.fn();
    renderShell({ onAccountAction });
    await userEvent.click(screen.getByRole('button', { name: 'Account: Andy Smith' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(onAccountAction).toHaveBeenCalledWith('profile');
  });

  it('shows the notification count', () => {
    renderShell({ notificationCount: 3 });
    expect(screen.getByRole('button', { name: 'Notifications (3 new)' })).toBeInTheDocument();
  });

  it('hides Admin from a user the platform does not grant it', () => {
    renderShell({ navData: createMockNavData({ permissions: [] }) });
    act(() => {});
    expect(screen.queryByRole('group', { name: 'Admin' })).toBeNull();
  });
});
