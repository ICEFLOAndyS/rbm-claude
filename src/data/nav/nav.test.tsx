import { act, renderHook } from '@testing-library/react';
import { activeNavItem, checkNavConfig, isExternal, NAV_GROUP_MAX, navItems, navLocation, rbmNav, visibleNav, type RbmNavConfig } from './nav';
import { RBM_FOOTER_LINKS } from './footerLinks';
import { createMockNavData, useNavCounts, useNavPermissions } from './navData';
import { rbmIconNames } from '../../icons/registry';

describe('rbmNav', () => {
  it('has the five groups in order', () => {
    expect(rbmNav.map((g) => g.group)).toEqual(['Events', 'Library', 'RBM Admin', 'Tech Admin', 'Help']);
  });

  it('has the thirteen items, labels and routes from the brief (v4) and the accepted routes', () => {
    expect(navItems(rbmNav).map((i) => [i.label, i.to])).toEqual([
      ['List', '/events'],
      ['Folders', '/events/folders'],
      ['Templates', '/library/templates'],
      ['Content Packs', '/library/content-packs'],
      ['Teams', '/rbm-admin/teams'],
      ['Workstreams', '/rbm-admin/workstreams'],
      ['License Management', '/rbm-admin/licences'],
      ['Folders', '/rbm-admin/folders'],
      ['Setup', '/tech-admin/setup'],
      ['Integrations', '/tech-admin/integrations'],
      ['Training', '/help/training'],
      ['Support', 'https://customer.iceflo.com/portal'],
      ['Versions', '/help/versions'],
    ]);
  });

  it('uses the icons from the brief (section 6a), and every one is registered', () => {
    expect(navItems(rbmNav).map((i) => i.icon)).toEqual([
      'nav.list', 'nav.folder',
      'object.template', 'object.contentPack',
      'object.team', 'object.workstream', 'nav.license', 'nav.folder',
      'nav.setup', 'nav.integrations',
      'nav.training', 'nav.support', 'nav.versions',
    ]);
    for (const item of navItems(rbmNav)) expect(rbmIconNames).toContain(item.icon);
  });

  it('gives each admin group its own permission, and nothing else a permission', () => {
    const by = (p: string) => navItems(rbmNav).filter((i) => i.permission === p).map((i) => i.id);
    expect(by('rbmAdmin')).toEqual(['teams', 'workstreams', 'licences', 'rbm-folders']);
    expect(by('techAdmin')).toEqual(['setup', 'integrations']);
    expect(navItems(rbmNav).filter((i) => i.permission).length).toBe(6);
  });

  it('sends Help › Support to the customer portal, as the footer does', () => {
    const support = navItems(rbmNav).find((i) => i.id === 'support')!;
    expect(isExternal(support)).toBe(true);
    expect(support.to).toBe(RBM_FOOTER_LINKS.find((l) => l.key === 'support')!.href);
  });

  it('passes its own rules', () => {
    expect(checkNavConfig(rbmNav)).toEqual([]);
  });
});

describe('checkNavConfig', () => {
  const item = (id: string, to = `/${id}`) => ({ id, label: id, icon: 'nav.list' as const, to });

  it(`rejects a group of more than ${NAV_GROUP_MAX} items, and an empty group`, () => {
    const config: RbmNavConfig = [
      { group: 'Big', items: ['a', 'b', 'c', 'd', 'e'].map((id) => item(id)) },
      { group: 'Empty', items: [] },
    ];
    expect(checkNavConfig(config)).toEqual(['group Big has 5 items; at most 4', 'group Empty has no items']);
  });

  it('rejects duplicate ids and routes, including among children', () => {
    const config: RbmNavConfig = [{ group: 'G', items: [{ ...item('a'), children: [item('a', '/b')] }, item('c', '/b')] }];
    expect(checkNavConfig(config)).toEqual(['duplicate item id a', 'duplicate route /b']);
  });

  it('rejects a route that is not a plain path from the root', () => {
    const config: RbmNavConfig = [{ group: 'G', items: [item('a', 'events'), item('b', '/events/'), item('c', '/events?x=1')] }];
    expect(checkNavConfig(config)).toHaveLength(3);
  });
});

describe('visibleNav', () => {
  it('shows both admin groups to a user the platform grants both', () => {
    expect(visibleNav(rbmNav, () => true).map((g) => g.group)).toEqual(['Events', 'Library', 'RBM Admin', 'Tech Admin', 'Help']);
  });

  it('shows one admin group without the other (Andy Smith: separate permissions)', () => {
    expect(visibleNav(rbmNav, (p) => p === 'rbmAdmin').map((g) => g.group)).toEqual(['Events', 'Library', 'RBM Admin', 'Help']);
    expect(visibleNav(rbmNav, (p) => p === 'techAdmin').map((g) => g.group)).toEqual(['Events', 'Library', 'Tech Admin', 'Help']);
  });

  it('hides both admin groups, headings and all, from everyone else', () => {
    const nav = visibleNav(rbmNav, () => false);
    expect(nav.map((g) => g.group)).toEqual(['Events', 'Library', 'Help']);
    expect(navItems(nav)).toHaveLength(7);
  });

  it('keeps a group that still has items, and hides children too', () => {
    const config: RbmNavConfig = [
      {
        group: 'G',
        items: [
          { id: 'a', label: 'A', icon: 'nav.list', to: '/a', children: [{ id: 'a1', label: 'A1', icon: 'nav.list', to: '/a/1', permission: 'rbmAdmin' }] },
          { id: 'b', label: 'B', icon: 'nav.list', to: '/b', permission: 'rbmAdmin' },
        ],
      },
    ];
    const nav = visibleNav(config, () => false);
    expect(navItems(nav).map((i) => i.id)).toEqual(['a']);
  });
});

describe('activeNavItem: the route marks the item', () => {
  it.each([
    ['/events', 'events'],
    ['/events/', 'events'],
    ['/events?view=active', 'events'],
    ['/events/folders', 'event-folders'],
    ['/events/folders/f-12', 'event-folders'],
    // A deep link to an event's Command Centre marks Events › List (decided by Andy Smith, 23 Oct 2026).
    ['/events/REV000009', 'events'],
    ['/library/content-packs', 'content-packs'],
    ['/rbm-admin/folders', 'rbm-folders'],
    ['/rbm-admin/licences', 'licences'],
    ['/tech-admin/setup', 'setup'],
    ['/help/versions', 'versions'],
  ])('%s marks %s', (path, id) => {
    expect(activeNavItem(rbmNav, path)?.id).toBe(id);
  });

  // The old routes, and Help › Support, which is the portal and never the page the user is on.
  it.each(['/', '/eventsx', '/library', '/unknown/page', '/library/folders', '/admin/setup', '/help/support'])('%s marks nothing', (path) => {
    expect(activeNavItem(rbmNav, path)).toBeUndefined();
  });

  it('finds the group, so its heading can be shown', () => {
    const at = navLocation(rbmNav, '/rbm-admin/teams');
    expect(at?.group.group).toBe('RBM Admin');
    expect(at?.parent.id).toBe('teams');
  });

  it('finds a child under its parent', () => {
    const config: RbmNavConfig = [
      { group: 'G', items: [{ id: 'a', label: 'A', icon: 'nav.list', to: '/a', children: [{ id: 'a1', label: 'A1', icon: 'nav.list', to: '/a/one' }] }] },
    ];
    const at = navLocation(config, '/a/one/x');
    expect(at?.item.id).toBe('a1');
    expect(at?.parent.id).toBe('a');
  });
});

describe('NavData hooks', () => {
  it('grants both admin permissions to the mock user by default, and follows a change', () => {
    const data = createMockNavData();
    const { result } = renderHook(() => useNavPermissions(data));
    expect(result.current('rbmAdmin')).toBe(true);
    expect(result.current('techAdmin')).toBe(true);
    act(() => data.setPermissions(['rbmAdmin']));
    expect(result.current('techAdmin')).toBe(false);
  });

  it('grants nothing without data, so Admin stays hidden until the platform answers', () => {
    const { result } = renderHook(() => useNavPermissions(undefined));
    expect(result.current('rbmAdmin')).toBe(false);
    expect(result.current('techAdmin')).toBe(false);
  });

  it('has no counts by default, and follows live counts', () => {
    const data = createMockNavData();
    const { result } = renderHook(() => useNavCounts(data));
    expect(result.current).toEqual({});
    act(() => data.setCounts({ events: 12 }));
    expect(result.current).toEqual({ events: 12 });
  });

  it('stops listening when unmounted', () => {
    const data = createMockNavData();
    const { unmount } = renderHook(() => useNavCounts(data));
    unmount();
    expect(() => data.setCounts({ events: 1 })).not.toThrow();
  });
});
