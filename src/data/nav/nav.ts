import type { RbmIconName } from '../../icons/registry';

/**
 * The app shell's navigation, as data (App shell board, "Navigation" and "React and MUI"; app shell brief,
 * section 4). Four groups, decided by Andy Smith, 22 Oct 2026. The sidebar draws whatever this holds, so
 * pages never build their own menu.
 */

/** A platform permission that decides whether an item shows. The platform's API says; the UI never decides. */
export type RbmNavPermission = 'admin';

/** A second-level item: indented under its parent while the parent is active. There is no third level. */
export interface RbmNavChild {
  /** Unique across the whole menu: counts are keyed by it. */
  id: string;
  label: string;
  /** A registry key, not a component, so pages cannot choose their own icons. */
  icon: RbmIconName;
  /** The route, from the root, for example '/events'. */
  to: string;
  /** Shown only to users the platform grants this permission. */
  permission?: RbmNavPermission;
  /** Shown but not a link (the board's Disabled item state). When an item is disabled is not decided. */
  disabled?: boolean;
}

export interface RbmNavItem extends RbmNavChild {
  children?: readonly RbmNavChild[];
}

export interface RbmNavGroup {
  /** The group heading: small text, not a link. */
  group: string;
  items: readonly RbmNavItem[];
}

export type RbmNavConfig = readonly RbmNavGroup[];

/** Live counts by item id. A count is neutral: it is a number, not a status. */
export type RbmNavCounts = Readonly<Partial<Record<string, number>>>;

/** The board's rule: four items or fewer in a group (changed from "seven destinations" on 22 Oct 2026). */
export const NAV_GROUP_MAX = 4;

/**
 * The RBM menu, exactly as the App shell board's `rbmNav` sample (design version 78), with the Admin items
 * marked for the admin permission (proposed in the brief: Admin shows only to users whose platform roles
 * allow it). "License Management" is Andy Smith's wording (US spelling).
 */
export const rbmNav: RbmNavConfig = [
  {
    group: 'Events',
    items: [
      { id: 'events', label: 'List', icon: 'nav.list', to: '/events' },
      { id: 'event-folders', label: 'Folders', icon: 'nav.folder', to: '/events/folders' },
    ],
  },
  {
    group: 'Library',
    items: [
      { id: 'templates', label: 'Templates', icon: 'object.template', to: '/library/templates' },
      { id: 'library-folders', label: 'Folders', icon: 'nav.folder', to: '/library/folders' },
      { id: 'teams', label: 'Teams', icon: 'object.team', to: '/library/teams' },
      { id: 'workstreams', label: 'Workstreams', icon: 'object.workstream', to: '/library/workstreams' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { id: 'setup', label: 'Setup', icon: 'nav.setup', to: '/admin/setup', permission: 'admin' },
      { id: 'integrations', label: 'Integrations', icon: 'nav.integrations', to: '/admin/integrations', permission: 'admin' },
      { id: 'licences', label: 'License Management', icon: 'nav.license', to: '/admin/licences', permission: 'admin' },
    ],
  },
  {
    group: 'Help',
    items: [
      { id: 'training', label: 'Training', icon: 'nav.training', to: '/help/training' },
      { id: 'support', label: 'Support & Versions', icon: 'nav.support', to: '/help/support' },
    ],
  },
];

/** Every item, parents before their children. */
export function navItems(config: RbmNavConfig): RbmNavChild[] {
  return config.flatMap((g) => g.items.flatMap((i) => [i, ...(i.children ?? [])]));
}

/** The rules the types cannot hold. Returns the problems found; an empty list means the menu is sound. */
export function checkNavConfig(config: RbmNavConfig): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const routes = new Set<string>();
  for (const g of config) {
    if (g.items.length === 0) problems.push(`group ${g.group} has no items`);
    if (g.items.length > NAV_GROUP_MAX) problems.push(`group ${g.group} has ${g.items.length} items; at most ${NAV_GROUP_MAX}`);
  }
  for (const item of navItems(config)) {
    if (ids.has(item.id)) problems.push(`duplicate item id ${item.id}`);
    ids.add(item.id);
    if (routes.has(item.to)) problems.push(`duplicate route ${item.to}`);
    routes.add(item.to);
    if (!/^\/[\w/-]*$/.test(item.to) || (item.to.length > 1 && item.to.endsWith('/'))) problems.push(`route ${item.to} of ${item.id} is not a plain path from the root`);
  }
  return problems;
}

/** The menu a user sees: items they lack the permission for are removed, and groups left empty go too. */
export function visibleNav(config: RbmNavConfig, can: (permission: RbmNavPermission) => boolean): RbmNavConfig {
  const shows = (i: RbmNavChild) => !i.permission || can(i.permission);
  return config
    .map((g) => ({
      ...g,
      items: g.items.filter(shows).map((i) => (i.children ? { ...i, children: i.children.filter(shows) } : i)),
    }))
    .filter((g) => g.items.length > 0);
}

/** The path without its query or fragment, and without a trailing slash. */
function cleanPath(path: string): string {
  const p = path.split(/[?#]/)[0] || '/';
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

/**
 * The item a route belongs to: the one whose route is the longest match for the path, at a segment boundary.
 * A deep link marks its item active, so /events/REV000009 (an event's Command Centre) marks Events › List,
 * while /events/folders marks Events › Folders. Undefined when no item matches.
 */
export function activeNavItem(config: RbmNavConfig, path: string): RbmNavChild | undefined {
  const p = cleanPath(path);
  let best: RbmNavChild | undefined;
  for (const item of navItems(config)) {
    const hit = p === item.to || p.startsWith(item.to === '/' ? '/' : `${item.to}/`);
    if (hit && (!best || item.to.length > best.to.length)) best = item;
  }
  return best;
}

/** The active item's group and its top-level parent (the item itself unless it is a child). */
export function navLocation(config: RbmNavConfig, path: string): { group: RbmNavGroup; parent: RbmNavItem; item: RbmNavChild } | undefined {
  const item = activeNavItem(config, path);
  if (!item) return undefined;
  for (const group of config)
    for (const parent of group.items) if (parent === item || parent.children?.includes(item)) return { group, parent, item };
  return undefined;
}
