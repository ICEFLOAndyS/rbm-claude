import { act, renderHook } from '@testing-library/react';
import { activeNavItem, checkNavConfig, NAV_GROUP_MAX, navItems, navLocation, rbmNav, visibleNav, type RbmNavConfig } from './nav';
import { createMockNavData, useNavCounts, useNavPermissions } from './navData';
import { rbmIconNames } from '../../icons/registry';

describe('rbmNav', () => {
  it('has the four groups in order', () => {
    expect(rbmNav.map((g) => g.group)).toEqual(['Events', 'Library', 'Admin', 'Help']);
  });

  it('has the eleven items, labels and routes from the brief', () => {
    expect(navItems(rbmNav).map((i) => [i.label, i.to])).toEqual([
      ['List', '/events'],
      ['Folders', '/events/folders'],
      ['Templates', '/library/templates'],
      ['Folders', '/library/folders'],
      ['Teams', '/library/teams'],
      ['Workstreams', '/library/workstreams'],
      ['Setup', '/admin/setup'],
      ['Integrations', '/admin/integrations'],
      ['License Management', '/admin/licences'],
      ['Training', '/help/training'],
      ['Support & Versions', '/help/support'],
    ]);
  });

  it('uses the icons from the brief (section 6a), and every one is registered', () => {
    expect(navItems(rbmNav).map((i) => i.icon)).toEqual([
      'nav.list', 'nav.folder',
      'object.template', 'nav.folder', 'object.team', 'object.workstream',
      'nav.setup', 'nav.integrations', 'nav.license',
      'nav.training', 'nav.support',
    ]);
    for (const item of navItems(rbmNav)) expect(rbmIconNames).toContain(item.icon);
  });

  it('marks only the Admin items for the admin permission', () => {
    const admin = navItems(rbmNav).filter((i) => i.permission === 'admin').map((i) => i.id);
    expect(admin).toEqual(['setup', 'integrations', 'licences']);
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
  it('shows Admin to a user the platform grants admin', () => {
    expect(visibleNav(rbmNav, () => true).map((g) => g.group)).toEqual(['Events', 'Library', 'Admin', 'Help']);
  });

  it('hides the Admin items, and so the Admin heading, from everyone else', () => {
    const nav = visibleNav(rbmNav, () => false);
    expect(nav.map((g) => g.group)).toEqual(['Events', 'Library', 'Help']);
    expect(navItems(nav)).toHaveLength(8);
  });

  it('keeps a group that still has items, and hides children too', () => {
    const config: RbmNavConfig = [
      {
        group: 'G',
        items: [
          { id: 'a', label: 'A', icon: 'nav.list', to: '/a', children: [{ id: 'a1', label: 'A1', icon: 'nav.list', to: '/a/1', permission: 'admin' }] },
          { id: 'b', label: 'B', icon: 'nav.list', to: '/b', permission: 'admin' },
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
    ['/library/folders', 'library-folders'],
    ['/admin/licences', 'licences'],
    ['/help/support', 'support'],
  ])('%s marks %s', (path, id) => {
    expect(activeNavItem(rbmNav, path)?.id).toBe(id);
  });

  it.each(['/', '/eventsx', '/library', '/unknown/page'])('%s marks nothing', (path) => {
    expect(activeNavItem(rbmNav, path)).toBeUndefined();
  });

  it('finds the group, so its heading can be shown', () => {
    const at = navLocation(rbmNav, '/library/teams');
    expect(at?.group.group).toBe('Library');
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
  it('grants admin to the mock user by default, and follows a change', () => {
    const data = createMockNavData();
    const { result } = renderHook(() => useNavPermissions(data));
    expect(result.current('admin')).toBe(true);
    act(() => data.setPermissions([]));
    expect(result.current('admin')).toBe(false);
  });

  it('grants nothing without data, so Admin stays hidden until the platform answers', () => {
    const { result } = renderHook(() => useNavPermissions(undefined));
    expect(result.current('admin')).toBe(false);
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
