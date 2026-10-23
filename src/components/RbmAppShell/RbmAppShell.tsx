import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Box, Link } from '@mui/material';
import { RbmTopBar } from '../RbmTopBar/RbmTopBar';
import type { RbmAccountAction, RbmUser } from '../RbmTopBar/RbmAccountMenu';
import { RbmSidebar, useSidebarMode } from '../RbmSidebar/RbmSidebar';
import { RbmFooter, type RbmFooterProps } from '../RbmFooter/RbmFooter';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, shellSize, stroke, type DensityLevel } from '../../theme/tokens';
import type { RbmNavConfig } from '../../data/nav/nav';
import type { NavData } from '../../data/nav/navData';
import type { SidebarPreferenceStore } from '../../data/nav/sidebarPreference';
import { RBM_FOOTER_LINKS, footerHref } from '../../data/nav/footerLinks';
import { ShellFrameContext } from './shellContext';

/**
 * The app shell (App shell board; app shell brief, section 3): the whole RBM screen, so no page builds its own
 * frame. Six zones on a CSS grid, which keeps the bars in place without position: fixed:
 *
 *   top bar      full width                   RbmTopBar
 *   sidebar      left, under the top bar      RbmSidebar (expanded, rail, or a drawer under 900 px)
 *   content      the page; it scrolls on its own, so the shell never moves
 *   footer       full width, at the bottom    RbmFooter
 *   slide-in     over the content only        RbmSlideInRegion, which a page renders; it finds the frame here
 *   page header  inside the content           pages keep their own for now (decided by Andy Smith, 23 Oct 2026)
 *
 * A skip link is the first thing to focus. Keyboard order: top bar, sidebar, content, footer.
 */

/** The product's name in the browser tab (app shell brief 5b; Andy Smith, 23 Oct 2026). One constant, set only by the shell. */
export const RBM_APP_TITLE = 'Runbook Management';

/** The tab title: the page's name first, then the product ("Events · Runbook Management"), as Andy Smith decided. */
export const rbmDocumentTitle = (page?: string) => (page ? `${page} · ${RBM_APP_TITLE}` : RBM_APP_TITLE);

export interface RbmAppShellProps {
  /** The menu (normally `rbmNav`). */
  nav: RbmNavConfig;
  /** Permissions and live counts for the menu. */
  navData?: NavData;
  user: RbmUser;
  /** The current route, for example '/events/REV000009'. */
  path: string;
  /** The link for a route; the prototype uses hash routes. */
  hrefFor?: (to: string) => string;
  /** A plain click on a menu item. */
  onNavigate?: (to: string) => void;
  footer: RbmFooterProps;
  /** The shell's density. D2 Compact by default (flagged: the board's default is D1). Pages may set their own. */
  density?: DensityLevel;
  notificationCount?: number;
  notifications?: ReactNode;
  onAccountAction?: (action: RbmAccountAction) => void;
  /** Where the user's Collapse choice is kept. */
  sidebarStore?: SidebarPreferenceStore;
  /**
   * The page's name for the browser tab, which reads "<page> · Runbook Management". Screen readers announce the
   * title when the page changes, so each page gives one. Without it the tab shows the product's name.
   */
  pageTitle?: string;
  /** D0 Command: the programme's name and the time in the top bar. */
  programme?: string;
  clock?: string;
  children: ReactNode;
}

/** Shown only when focused (not drawn: proposed). */
const skipLink = {
  position: 'absolute',
  left: 8,
  top: 8,
  zIndex: 2000,
  px: 3,
  py: 2,
  borderRadius: '8px',
  bgcolor: colour.white,
  color: colour.deepBlue,
  fontWeight: 700,
  fontSize: 14,
  textDecoration: 'none',
  transform: 'translateY(-200%)',
  '&:focus': { transform: 'none', outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 },
} as const;

export function RbmAppShell(props: RbmAppShellProps) {
  const { density = 'compact' } = props;
  return (
    <RbmDensity level={density}>
      <Frame {...props} />
    </RbmDensity>
  );
}

function Frame({ nav, navData, user, path, hrefFor, onNavigate, footer, density = 'compact', notificationCount, notifications, onAccountAction, sidebarStore, programme, clock, pageTitle, children }: RbmAppShellProps) {
  const sidebar = useSidebarMode(sidebarStore);
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const shell = useMemo(() => ({ frame, scroller, width }), [frame, scroller, width]);
  const contentId = useId();
  const navId = useId();
  const size = shellSize[density];

  // The browser tab: set here only, so no page sets its own.
  useEffect(() => {
    document.title = rbmDocumentTitle(pageTitle);
  }, [pageTitle]);

  // The content area's size: its height for a page that sizes something to the visible area
  // (--rbm-view-height), and its width for a page whose layout changes at a width.
  useEffect(() => {
    if (!scroller || typeof ResizeObserver === 'undefined') return;
    const set = () => {
      scroller.style.setProperty('--rbm-view-height', `${scroller.clientHeight}px`);
      setWidth(scroller.clientWidth);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [scroller]);

  return (
    <Box
      data-density={density}
      sx={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        bgcolor: colour.mist,
        overflow: 'hidden',
      }}
    >
      <Link
        href={`#${contentId}`}
        sx={skipLink}
        onClick={(e) => {
          // A hash link would change the route in a hash-routed app: move focus instead.
          e.preventDefault();
          scroller?.focus();
        }}
      >
        Skip to content
      </Link>
      <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
        <RbmTopBar
          user={user}
          sidebar={sidebar.variant}
          notificationCount={notificationCount}
          notifications={notifications}
          onAccountAction={onAccountAction}
          onMenu={sidebar.openDrawer}
          menuOpen={sidebar.drawerOpen}
          menuControls={navId}
          programme={programme}
          clock={clock}
        />
      </Box>
      <Box sx={{ gridColumn: 1, gridRow: 2, minHeight: 0, display: 'flex' }}>
        <RbmSidebar
          id={navId}
          nav={nav}
          data={navData}
          path={path}
          variant={sidebar.variant}
          hrefFor={hrefFor}
          onNavigate={onNavigate}
          onToggleCollapse={sidebar.toggle}
          open={sidebar.drawerOpen}
          onClose={sidebar.closeDrawer}
          drawerTop={size.topBar}
          // Below 900 px the footer hides its links, so the drawer carries them (Andy Smith, 23 Oct 2026).
          drawerLinks={RBM_FOOTER_LINKS.map((l) => ({ label: l.label, href: footerHref(l.key, footer.links) }))}
        />
      </Box>
      {/* The content frame hosts the slide-in region; the scroller inside it holds the page. */}
      <Box ref={setFrame} data-testid="rbm-shell-content" sx={{ gridColumn: 2, gridRow: 2, position: 'relative', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
        <Box ref={setScroller} id={contentId} tabIndex={-1} sx={{ height: '100%', overflow: 'auto', outline: 'none', overscrollBehavior: 'contain' }}>
          <ShellFrameContext.Provider value={shell}>{children}</ShellFrameContext.Provider>
        </Box>
      </Box>
      <Box sx={{ gridColumn: '1 / -1', gridRow: 3, minWidth: 0 }}>
        <RbmFooter {...footer} />
      </Box>
    </Box>
  );
}
