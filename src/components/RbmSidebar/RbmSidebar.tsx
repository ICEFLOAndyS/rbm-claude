import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Box, Drawer, ListItemButton, Tooltip, useMediaQuery } from '@mui/material';
import { RbmIcon } from '../../icons/RbmIcon';
import { useDensity } from '../../theme/RbmDensity';
import { colour, onDeepBlue, shellSize, stroke } from '../../theme/tokens';
import { activeNavItem, isExternal, navLocation, visibleNav, type RbmNavChild, type RbmNavConfig } from '../../data/nav/nav';
import { useNavCounts, useNavPermissions, type NavData } from '../../data/nav/navData';
import type { SidebarPreferenceStore } from '../../data/nav/sidebarPreference';

/**
 * The app shell's sidebar (App shell board, "Navigation"): primary navigation on Deep Blue, in three forms.
 *
 *   expanded  icons, labels and group headings (248 px at D1, 224 at D2, 200 at D3)
 *   rail      icons only, a tooltip with the name, a divider between groups (72, 64, 56 px)
 *   drawer    the expanded sidebar in a temporary drawer under the top bar, below 900 px (280 px under 600)
 *
 * It draws whatever the menu data holds (`rbmNav`), hides what the platform does not grant, and marks the
 * item for the current route. D0 Command has no sidebar.
 */

export type RbmSidebarVariant = 'expanded' | 'rail' | 'drawer';

/** Read by screen readers, not shown. In sx, width: 1 would mean 100%: the size is given in px. */
const visuallyHidden = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, p: 0, m: '-1px' } as const;

/** Widths at which the form changes (App shell board, "Responsive behaviour"). */
export const SIDEBAR_EXPANDED_FROM = 1200;
export const SIDEBAR_RAIL_FROM = 900;
/** The drawer's width under 600 px; from 600 to 899 px it is the expanded width. */
export const SIDEBAR_PHONE_DRAWER = 280;
const PHONE_BELOW = 600;

export interface RbmSidebarProps {
  /** The menu (normally `rbmNav`). */
  nav: RbmNavConfig;
  /** Permissions and live counts. Without it nothing is granted (Admin hidden) and there are no counts. */
  data?: NavData;
  /** The current route, for example '/events/REV000009'. Marks its item active. */
  path: string;
  variant: RbmSidebarVariant;
  /** The link for a route. The prototype uses hash routes: (to) => `#${to}`. Defaults to the route itself. */
  hrefFor?: (to: string) => string;
  /**
   * Called on a plain click, instead of following the link. A click with a modifier key (new tab, new window)
   * always follows the link. Without it, links work as ordinary links.
   */
  onNavigate?: (to: string) => void;
  /** Collapse and Expand, pinned to the bottom. Without it there is no Collapse item. Not shown in the drawer. */
  onToggleCollapse?: () => void;
  /** The drawer: open, and how it closes (Escape, the backdrop, or choosing an item). */
  open?: boolean;
  onClose?: () => void;
  /** The top bar's height: the drawer opens below it, so the bar stays visible. */
  drawerTop?: number;
  /** The navigation landmark's name. */
  label?: string;
  /**
   * Links shown at the bottom of the drawer only: the footer's Privacy, Support and Knowledge, which the footer
   * hides below 900 px (Andy Smith, 23 Oct 2026). Each opens in a new tab.
   */
  drawerLinks?: readonly { label: string; href: string }[];
  /** The landmark's id, so the top bar's menu button can name the drawer it opens (aria-controls). */
  id?: string;
}

export function RbmSidebar({ nav, data, path, variant, hrefFor = (to) => to, onNavigate, onToggleCollapse, open = false, onClose, drawerTop = 0, label = 'Main', drawerLinks = [], id }: RbmSidebarProps) {
  const d = useDensity();
  const phone = useMediaQuery(`(max-width: ${PHONE_BELOW - 0.02}px)`, { noSsr: true });
  const can = useNavPermissions(data);
  const counts = useNavCounts(data);
  const size = shellSize[d.level];
  const list = useRef<HTMLDivElement>(null);
  // A deep link may land on an item below the fold: bring its group, heading included, into view.
  useEffect(() => {
    const current = list.current?.querySelector('[aria-current="page"]');
    (current?.closest('[role="group"]') ?? current)?.scrollIntoView?.({ block: 'nearest' });
  }, [path, variant]);
  if (size.sidebar === 0) return null;

  const menu = visibleNav(nav, can);
  const rail = variant === 'rail';
  const width = variant === 'drawer' ? (phone ? SIDEBAR_PHONE_DRAWER : size.sidebar) : rail ? size.rail : size.sidebar;
  const active = activeNavItem(menu, path);
  const at = navLocation(menu, path);

  // An address outside RBM is followed by the browser, in a new tab; a route goes through onNavigate.
  const linkFor = (to: string) => (isExternal({ to }) ? to : hrefFor(to));
  const navigate = (to: string) => (e: MouseEvent) => {
    if (onNavigate && !isExternal({ to }) && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onNavigate(to);
    }
    if (variant === 'drawer') onClose?.();
  };

  const body = (
    <Box
      component="nav"
      aria-label={label}
      id={id}
      data-variant={variant}
      sx={{
        width,
        height: '100%',
        flex: 'none',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: colour.deepBlue,
        color: colour.white,
        transition: (t) => t.transitions.create('width', { duration: t.transitions.duration.shorter }),
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {/* When the menu is taller than the screen it scrolls, with a thin, quiet scrollbar (not drawn). */}
      <Box ref={list} sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', pt: 2, scrollbarWidth: 'thin', scrollbarColor: `${onDeepBlue.railDivider} transparent` }}>
        {menu.map((g, i) => (
          <Group key={g.group} name={g.group} rail={rail} first={i === 0}>
            {g.items.map((item) => {
              // In the rail a child is not shown, so its parent stands for the page.
              const isActive = active?.id === item.id || (rail && at?.parent.id === item.id);
              const showChildren = !rail && item.children && item.children.length > 0 && at?.parent.id === item.id;
              return (
                <li key={item.id}>
                  <NavLink item={item} active={isActive} rail={rail} count={counts[item.id]} href={linkFor(item.to)} onClick={navigate(item.to)} />
                  {showChildren && (
                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                      {item.children!.map((child) => (
                        <li key={child.id}>
                          <NavLink item={child} active={active?.id === child.id} rail={false} count={counts[child.id]} href={linkFor(child.to)} onClick={navigate(child.to)} indent />
                        </li>
                      ))}
                    </Box>
                  )}
                </li>
              );
            })}
          </Group>
        ))}
      </Box>
      {onToggleCollapse && variant !== 'drawer' && <CollapseItem rail={rail} onClick={onToggleCollapse} />}
      {variant === 'drawer' && drawerLinks.length > 0 && (
        // Not drawn (proposed): the footer's links, quiet, at the bottom of the drawer.
        <Box component="ul" aria-label="Help and legal" sx={{ listStyle: 'none', m: 0, p: '10px 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: d.caption }}>
          {drawerLinks.map((l) => (
            <li key={l.href}>
              <Box component="a" href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => onClose?.()} sx={{ color: colour.blueLight, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, '&:focus-visible': { outline: `${stroke.thick}px solid ${colour.white}`, outlineOffset: 2, borderRadius: '4px' } }}>
                {l.label}
                <Box component="span" sx={visuallyHidden}> (opens in a new tab)</Box>
              </Box>
            </li>
          ))}
        </Box>
      )}
    </Box>
  );

  if (variant !== 'drawer') return body;
  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={() => onClose?.()}
      sx={{ top: drawerTop, '& .MuiBackdrop-root': { top: drawerTop, bgcolor: 'rgba(31,36,48,0.45)' } }}
      slotProps={{
        paper: { sx: { top: drawerTop, height: `calc(100% - ${drawerTop}px)`, width, bgcolor: colour.deepBlue, border: 0, boxShadow: '4px 0 16px rgba(31,36,48,0.3)' } },
      }}
    >
      {body}
    </Drawer>
  );
}

function Group({ name, rail, first, children }: { name: string; rail: boolean; first: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <Box role="group" {...(rail ? { 'aria-label': name } : { 'aria-labelledby': id })}>
      {rail ? (
        !first && <Box aria-hidden sx={{ height: '1px', bgcolor: onDeepBlue.railDivider, m: '10px 14px' }} />
      ) : (
        // A heading, not a link: the eyebrow type (11 px, drawn), which density does not change.
        <Box id={id} sx={{ p: '14px 16px 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colour.blueLight, whiteSpace: 'nowrap' }}>
          {name}
        </Box>
      )}
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {children}
      </Box>
    </Box>
  );
}

interface NavLinkProps {
  item: RbmNavChild;
  active: boolean;
  rail: boolean;
  count: number | undefined;
  href: string;
  onClick: (e: MouseEvent) => void;
  /** A child, indented under its parent (not drawn: proposed as the label's start). */
  indent?: boolean;
}

function NavLink({ item, active, rail, count, href, onClick, indent }: NavLinkProps) {
  const external = isExternal(item);
  const d = useDensity();
  const size = shellSize[d.level];
  const hasCount = count !== undefined && count > 0;
  const link = (
    <ListItemButton
      component={item.disabled ? 'div' : 'a'}
      {...(item.disabled ? {} : { href })}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={item.disabled ? undefined : onClick}
      disabled={item.disabled}
      selected={active}
      aria-current={active ? 'page' : undefined}
      aria-label={`${item.label}${hasCount ? ` (${count})` : ''}${external ? ' (opens in a new tab)' : ''}`}
      disableGutters
      sx={{
        position: 'relative',
        height: size.navItem,
        minHeight: size.navItem,
        m: '2px 8px',
        px: rail ? 0 : `${d.padX}px`,
        pl: indent ? `${d.padX + d.icon + d.gap}px` : undefined,
        justifyContent: rail ? 'center' : 'flex-start',
        gap: `${d.gap}px`,
        borderRadius: '10px',
        color: colour.white,
        textDecoration: 'none',
        bgcolor: 'transparent',
        '&:hover': { bgcolor: onDeepBlue.hover },
        '&.Mui-selected, &.Mui-selected:hover': { bgcolor: onDeepBlue.active },
        '&.Mui-focusVisible': { bgcolor: active ? onDeepBlue.active : 'transparent', outline: `${stroke.thick}px solid ${colour.white}`, outlineOffset: 2 },
        '&.Mui-disabled': { opacity: 0.4 },
      }}
    >
      {active && <Box aria-hidden sx={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', bgcolor: colour.blueLight }} />}
      {!indent && <RbmIcon name={item.icon} />}
      {!rail && (
        <Box component="span" sx={{ fontSize: d.body, fontWeight: active ? 800 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
          {item.label}
        </Box>
      )}
      {!rail && hasCount && (
        <Box component="span" aria-hidden sx={{ ml: 'auto', flex: 'none', minWidth: 20, height: 20, px: '6px', boxSizing: 'border-box', borderRadius: '999px', bgcolor: colour.white, color: colour.deepBlue, fontSize: d.caption, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {count}
        </Box>
      )}
      {rail && hasCount && (
        <Box aria-hidden data-testid="rbm-nav-count-dot" sx={{ position: 'absolute', top: 8, right: `calc(50% - ${d.icon / 2 - 2}px)`, width: 8, height: 8, borderRadius: '50%', bgcolor: colour.white }} />
      )}
    </ListItemButton>
  );
  if (!rail) return link;
  return (
    <Tooltip title={item.label} placement="right">
      {item.disabled ? <span>{link}</span> : link}
    </Tooltip>
  );
}

function CollapseItem({ rail, onClick }: { rail: boolean; onClick: () => void }) {
  const d = useDensity();
  const size = shellSize[d.level];
  const button = (
    <ListItemButton
      onClick={onClick}
      aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!rail}
      disableGutters
      sx={{
        height: size.navItem,
        minHeight: size.navItem,
        m: '2px 8px 8px',
        px: rail ? 0 : `${d.padX}px`,
        justifyContent: rail ? 'center' : 'flex-start',
        gap: `${d.gap}px`,
        borderRadius: '10px',
        color: colour.blueLight,
        '&:hover': { bgcolor: onDeepBlue.hover },
        '&.Mui-focusVisible': { bgcolor: 'transparent', outline: `${stroke.thick}px solid ${colour.white}`, outlineOffset: 2 },
      }}
    >
      <RbmIcon name="shell.sidebar" />
      {!rail && (
        <Box component="span" sx={{ fontSize: d.body, fontWeight: 600, whiteSpace: 'nowrap' }}>
          Collapse
        </Box>
      )}
    </ListItemButton>
  );
  return (
    // No divider line above it (Andy Smith, 26 Oct 2026): the space above sets it apart.
    <Box sx={{ pt: 1.5 }}>
      {rail ? (
        <Tooltip title="Expand" placement="right">
          {button}
        </Tooltip>
      ) : (
        button
      )}
    </Box>
  );
}

export interface SidebarMode {
  variant: RbmSidebarVariant;
  /** Collapse to the rail, or expand it, and remember the choice. */
  toggle: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

/**
 * Which form the sidebar takes. Under 900 px it is the drawer. From 900 px the user's remembered choice wins;
 * without one, the width decides: expanded from 1200 px, the rail below (App shell board).
 */
export function useSidebarMode(store?: SidebarPreferenceStore): SidebarMode {
  const wide = useMediaQuery(`(min-width: ${SIDEBAR_EXPANDED_FROM}px)`, { noSsr: true });
  const medium = useMediaQuery(`(min-width: ${SIDEBAR_RAIL_FROM}px)`, { noSsr: true });
  const [collapsed, setCollapsed] = useState<boolean | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let live = true;
    void store?.get().then((v) => live && setCollapsed((current) => current ?? v));
    return () => {
      live = false;
    };
  }, [store]);
  // Leaving the drawer's widths closes it, so it is not open when the screen narrows again.
  useEffect(() => {
    if (medium) setDrawerOpen(false);
  }, [medium]);

  const variant: RbmSidebarVariant = !medium ? 'drawer' : (collapsed ?? !wide) ? 'rail' : 'expanded';
  return {
    variant,
    toggle: () => {
      const next = variant !== 'rail';
      setCollapsed(next);
      void store?.set(next);
    },
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
  };
}
