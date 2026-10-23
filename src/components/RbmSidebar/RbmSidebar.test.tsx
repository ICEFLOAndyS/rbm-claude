import { useState } from 'react';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RbmSidebar, useSidebarMode, type RbmSidebarProps } from './RbmSidebar';
import { RbmDensity } from '../../theme/RbmDensity';
import { shellSize, type DensityLevel } from '../../theme/tokens';
import { rbmNav, type RbmNavConfig } from '../../data/nav/nav';
import { createMockNavData } from '../../data/nav/navData';
import { createLocalSidebarStore, createMemorySidebarStore } from '../../data/nav/sidebarPreference';

/** A screen of the given width, as far as CSS media queries are concerned. */
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

function renderSidebar(props: Partial<RbmSidebarProps> = {}, level: DensityLevel = 'compact') {
  return render(
    <RbmDensity level={level}>
      <RbmSidebar nav={rbmNav} data={createMockNavData()} path="/events" variant="expanded" {...props} />
    </RbmDensity>,
  );
}

describe('RbmSidebar: expanded', () => {
  it('is a navigation landmark with a name', () => {
    renderSidebar();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('shows the four groups, named by their headings, with their items in order', () => {
    renderSidebar();
    const groups = screen.getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-labelledby') && document.getElementById(g.getAttribute('aria-labelledby')!)!.textContent)).toEqual(['Events', 'Library', 'Admin', 'Help']);
    expect(within(screen.getByRole('group', { name: 'Library' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Templates', 'Folders', 'Teams', 'Workstreams']);
    // Headings are text, not links.
    expect(screen.queryByRole('link', { name: 'Events' })).toBeNull();
  });

  it('marks the item for the route with aria-current, and only that one', () => {
    renderSidebar({ path: '/library/teams' });
    expect(screen.getByRole('link', { name: 'Teams' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link').filter((l) => l.hasAttribute('aria-current'))).toHaveLength(1);
  });

  it('marks Events › List for a deep link to an event', () => {
    renderSidebar({ path: '/events/REV000009' });
    expect(within(screen.getByRole('group', { name: 'Events' })).getByRole('link', { name: 'List' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks the right Folders: the two share a label and an icon', () => {
    renderSidebar({ path: '/library/folders' });
    expect(within(screen.getByRole('group', { name: 'Library' })).getByRole('link', { name: 'Folders' })).toHaveAttribute('aria-current', 'page');
    expect(within(screen.getByRole('group', { name: 'Events' })).getByRole('link', { name: 'Folders' })).not.toHaveAttribute('aria-current');
  });

  it('links to each route, through hrefFor', () => {
    renderSidebar({ hrefFor: (to) => `#${to}` });
    expect(screen.getByRole('link', { name: 'License Management' })).toHaveAttribute('href', '#/admin/licences');
  });

  it('draws each item with its registry icon, hidden from screen readers', () => {
    renderSidebar();
    const icon = screen.getByRole('link', { name: 'Support & Versions' }).querySelector('svg')!;
    expect(icon).toHaveAttribute('data-icon', 'nav.support');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('RbmSidebar: permissions', () => {
  it('shows Admin to a user the platform grants admin', () => {
    renderSidebar({ data: createMockNavData({ permissions: ['admin'] }) });
    expect(screen.getByRole('group', { name: 'Admin' })).toBeInTheDocument();
  });

  it('hides the Admin items and heading from everyone else', () => {
    renderSidebar({ data: createMockNavData({ permissions: [] }) });
    expect(screen.queryByRole('group', { name: 'Admin' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Setup' })).toBeNull();
  });

  it('hides Admin until the platform answers', () => {
    renderSidebar({ data: undefined });
    expect(screen.queryByRole('group', { name: 'Admin' })).toBeNull();
  });

  it('follows a change in permissions', () => {
    const data = createMockNavData({ permissions: [] });
    renderSidebar({ data });
    act(() => data.setPermissions(['admin']));
    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument();
  });
});

describe('RbmSidebar: counts', () => {
  it('shows no count by default (no item has one yet)', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'List' }).textContent).toBe('List');
  });

  it('shows a count as a pill, in the name for screen readers', () => {
    renderSidebar({ data: createMockNavData({ counts: { events: 12 } }) });
    const link = screen.getByRole('link', { name: 'List (12)' });
    expect(within(link).getByText('12')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a count in the rail as a small dot', () => {
    renderSidebar({ variant: 'rail', data: createMockNavData({ counts: { events: 12 } }) });
    const link = screen.getByRole('link', { name: 'List (12)' });
    expect(within(link).getByTestId('rbm-nav-count-dot')).toBeInTheDocument();
    expect(link.textContent).toBe('');
  });

  it('shows nothing for a count of zero', () => {
    renderSidebar({ data: createMockNavData({ counts: { events: 0 } }) });
    expect(screen.getByRole('link', { name: 'List' })).toBeInTheDocument();
  });
});

describe('RbmSidebar: rail', () => {
  it('keeps the icons and names each group, without headings', () => {
    renderSidebar({ variant: 'rail' });
    expect(screen.getByRole('group', { name: 'Library' })).not.toHaveAttribute('aria-labelledby');
    expect(screen.queryByText('Library')).toBeNull();
    expect(screen.getByRole('link', { name: 'Templates' }).textContent).toBe('');
  });

  it('shows the name in a tooltip on focus', async () => {
    renderSidebar({ variant: 'rail' });
    act(() => screen.getByRole('link', { name: 'Teams' }).focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Teams');
  });

  it('shows the name in a tooltip on hover', async () => {
    renderSidebar({ variant: 'rail' });
    await userEvent.hover(screen.getByRole('link', { name: 'Training' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Training');
  });
});

describe('RbmSidebar: Collapse', () => {
  it('is pinned to the bottom, after the menu', () => {
    renderSidebar({ onToggleCollapse: () => {} });
    const nav = screen.getByRole('navigation');
    const buttons = within(nav).getAllByRole('button');
    expect(buttons.at(-1)).toHaveAccessibleName('Collapse sidebar');
    expect(buttons.at(-1)).toHaveAttribute('aria-expanded', 'true');
  });

  it('becomes Expand in the rail', () => {
    renderSidebar({ variant: 'rail', onToggleCollapse: () => {} });
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('is not there without a handler', () => {
    renderSidebar();
    expect(screen.queryByRole('button', { name: /sidebar/ })).toBeNull();
  });
});

describe('RbmSidebar: following a link', () => {
  it('calls onNavigate on a plain click instead of following the link', async () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });
    await userEvent.click(screen.getByRole('link', { name: 'Templates' }));
    expect(onNavigate).toHaveBeenCalledWith('/library/templates');
  });

  it('leaves a click with a modifier key to the browser (new tab)', async () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate, hrefFor: (to) => `#${to}` });
    const user = userEvent.setup();
    await user.keyboard('{Control>}');
    await user.click(screen.getByRole('link', { name: 'Templates' }));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('follows Enter from the keyboard', async () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });
    act(() => screen.getByRole('link', { name: 'Teams' }).focus());
    await userEvent.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('/library/teams');
  });

  it('shows a disabled item, not as a link', () => {
    const nav: RbmNavConfig = [{ group: 'Events', items: [{ id: 'events', label: 'List', icon: 'nav.list', to: '/events', disabled: true }] }];
    renderSidebar({ nav, path: '/x' });
    expect(screen.queryByRole('link', { name: 'List' })).toBeNull();
    expect(screen.getByText('List').closest('[aria-disabled="true"]')).not.toBeNull();
  });
});

describe('RbmSidebar: children', () => {
  const nav: RbmNavConfig = [
    {
      group: 'Library',
      items: [
        { id: 'templates', label: 'Templates', icon: 'object.template', to: '/library/templates', children: [{ id: 'drafts', label: 'Drafts', icon: 'object.template', to: '/library/templates/drafts' }] },
        { id: 'teams', label: 'Teams', icon: 'object.team', to: '/library/teams' },
      ],
    },
  ];

  it('shows children only under the active parent', () => {
    const { unmount } = renderSidebar({ nav, path: '/library/teams' });
    expect(screen.queryByRole('link', { name: 'Drafts' })).toBeNull();
    unmount();
    renderSidebar({ nav, path: '/library/templates/drafts' });
    expect(screen.getByRole('link', { name: 'Drafts' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks the parent in the rail, where the child is not shown', () => {
    renderSidebar({ nav, path: '/library/templates/drafts', variant: 'rail' });
    expect(screen.queryByRole('link', { name: 'Drafts' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('RbmSidebar: drawer', () => {
  function WithMenuButton() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Menu
        </button>
        <RbmSidebar nav={rbmNav} data={createMockNavData()} path="/events" variant="drawer" open={open} onClose={() => setOpen(false)} drawerTop={56} hrefFor={(to) => `#${to}`} />
      </>
    );
  }

  it('opens from the menu button, and Escape closes it and returns focus to the button', async () => {
    setWidth(800);
    render(<WithMenuButton />);
    expect(screen.queryByRole('navigation')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('navigation')).toBeNull());
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });

  it('closes when an item is chosen', async () => {
    setWidth(800);
    render(<WithMenuButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByRole('link', { name: 'Teams' }));
    await waitFor(() => expect(screen.queryByRole('navigation')).toBeNull());
  });

  it('is the expanded width from 600 to 899 px, and 280 px under 600', async () => {
    setWidth(800);
    const { unmount } = render(<RbmSidebar nav={rbmNav} path="/events" variant="drawer" open />);
    expect(screen.getByRole('navigation')).toHaveStyle({ width: `${shellSize.comfortable.sidebar}px` });
    unmount();
    setWidth(390);
    render(<RbmSidebar nav={rbmNav} path="/events" variant="drawer" open />);
    expect(screen.getByRole('navigation')).toHaveStyle({ width: '280px' });
  });

  it('has no Collapse item', () => {
    setWidth(800);
    render(<RbmSidebar nav={rbmNav} path="/events" variant="drawer" open onToggleCollapse={() => {}} />);
    expect(screen.queryByRole('button', { name: /sidebar/ })).toBeNull();
  });
});

describe('RbmSidebar: density', () => {
  it.each(['comfortable', 'compact', 'dense'] as const)('takes the board sizes at %s', (level) => {
    const { unmount } = renderSidebar({}, level);
    expect(screen.getByRole('navigation')).toHaveStyle({ width: `${shellSize[level].sidebar}px` });
    expect(screen.getByRole('link', { name: 'List' })).toHaveStyle({ height: `${shellSize[level].navItem}px` });
    unmount();
    renderSidebar({ variant: 'rail' }, level);
    expect(screen.getByRole('navigation')).toHaveStyle({ width: `${shellSize[level].rail}px` });
  });

  it('is not drawn at D0 Command', () => {
    renderSidebar({}, 'command');
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});

describe('useSidebarMode', () => {
  it.each([
    [1280, 'expanded'],
    [1200, 'expanded'],
    [1024, 'rail'],
    [900, 'rail'],
    [800, 'drawer'],
    [390, 'drawer'],
  ])('at %i px with no choice made, is %s', (width, variant) => {
    setWidth(width);
    const { result } = renderHook(() => useSidebarMode());
    expect(result.current.variant).toBe(variant);
  });

  it('remembers Collapse, and the remembered choice wins over the width', async () => {
    const store = createMemorySidebarStore();
    const { result, unmount } = renderHook(() => useSidebarMode(store));
    act(() => result.current.toggle());
    expect(result.current.variant).toBe('rail');
    expect(store.value()).toBe(true);
    unmount();
    const again = renderHook(() => useSidebarMode(store));
    await waitFor(() => expect(again.result.current.variant).toBe('rail'));
  });

  it('remembers Expand in the rail widths', async () => {
    setWidth(1024);
    const store = createMemorySidebarStore();
    const { result } = renderHook(() => useSidebarMode(store));
    expect(result.current.variant).toBe('rail');
    act(() => result.current.toggle());
    expect(result.current.variant).toBe('expanded');
    expect(store.value()).toBe(false);
  });

  it('is always the drawer under 900 px, whatever was chosen', async () => {
    setWidth(800);
    const { result } = renderHook(() => useSidebarMode(createMemorySidebarStore(false)));
    await act(async () => {});
    expect(result.current.variant).toBe('drawer');
  });

  it('opens and closes the drawer', () => {
    setWidth(800);
    const { result } = renderHook(() => useSidebarMode());
    act(() => result.current.openDrawer());
    expect(result.current.drawerOpen).toBe(true);
    act(() => result.current.closeDrawer());
    expect(result.current.drawerOpen).toBe(false);
  });
});

describe('createLocalSidebarStore', () => {
  function memoryStorage() {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), keys: () => [...m.keys()] };
  }

  it('keeps the choice per user', async () => {
    const storage = memoryStorage();
    await createLocalSidebarStore('a.smith', storage).set(true);
    expect(await createLocalSidebarStore('a.smith', storage).get()).toBe(true);
    expect(await createLocalSidebarStore('t.baker', storage).get()).toBeUndefined();
  });

  it('has no choice when storage is blocked', async () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const store = createLocalSidebarStore('a.smith', blocked);
    await expect(store.set(true)).resolves.toBeUndefined();
    expect(await store.get()).toBeUndefined();
  });
});
