import { useId, useState, type MouseEvent, type ReactNode } from 'react';
import { AppBar, Box, IconButton, Popover, Toolbar, Tooltip } from '@mui/material';
import { RbmIcon } from '../../icons/RbmIcon';
import { useDensity } from '../../theme/RbmDensity';
import { colour, elevation, onDeepBlue, radius, shellSize, stroke } from '../../theme/tokens';
import type { RbmSidebarVariant } from '../RbmSidebar/RbmSidebar';
import { RbmAccountMenu, type RbmAccountAction, type RbmUser } from './RbmAccountMenu';
import wordmark from './assets/iceflo-wordmark.png';
import mark from './assets/iceflo-mark.png';

/**
 * The top bar (App shell board, "Top bar"): Deep Blue, full width, session information only. The logo,
 * notifications with a count, and the signed-in user with the account menu. No page context, no page actions
 * and no search. A thin divider separates the logo block from the rest of the bar.
 *
 * The logo block is as wide as the sidebar below it: the wordmark over the expanded sidebar, the ICEFLO mark
 * over the rail. Under 900 px (the drawer) a menu button comes first, the logo has no block, and the user is
 * the avatar alone. At D0 Command the bar is the programme name and a large clock.
 */

/** The wordmark's drawn width over the expanded sidebar at each level. */
const wordmarkWidth = { command: 104, comfortable: 104, compact: 96, dense: 88 } as const;
/** The wordmark beside the menu button on narrow screens (App shell board, mobile drawer). */
const NARROW_WORDMARK = 88;
/** Counts above this show as "99+" (not drawn). */
const COUNT_CAP = 99;

export interface RbmTopBarProps {
  user: RbmUser;
  /** The sidebar's form, so the logo block lines up with it. */
  sidebar: RbmSidebarVariant;
  /** Unread notifications. A count, not a status, so it carries no status colour. Hidden at 0. */
  notificationCount?: number;
  /** The notifications popover's content (not drawn). */
  notifications?: ReactNode;
  onAccountAction?: (action: RbmAccountAction) => void;
  /** The menu button, under 900 px: opens the sidebar drawer. */
  onMenu?: () => void;
  menuOpen?: boolean;
  /** The id of the drawer the menu button opens. */
  menuControls?: string;
  /** D0 Command only: the programme's name and the time. */
  programme?: string;
  clock?: string;
}

export function RbmTopBar({ user, sidebar, notificationCount = 0, notifications, onAccountAction, onMenu, menuOpen = false, menuControls, programme, clock }: RbmTopBarProps) {
  const d = useDensity();
  const size = shellSize[d.level];

  if (d.level === 'command') {
    return (
      <AppBar position="static" elevation={0} sx={{ bgcolor: colour.deepBlue, color: colour.white }}>
        <Toolbar disableGutters sx={{ height: size.topBar, minHeight: `${size.topBar}px !important`, px: 8, gap: 5 }}>
          <Box component="img" src={mark} alt="ICEFLO" sx={{ width: 40, height: 40, display: 'block' }} />
          {programme && (
            <Box component="span" sx={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>
              {programme}
            </Box>
          )}
          <Box sx={{ flex: 1 }} />
          {clock && (
            <Box component="time" aria-label={`Time ${clock}`} sx={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {clock}
            </Box>
          )}
        </Toolbar>
      </AppBar>
    );
  }

  const narrow = sidebar === 'drawer';
  const rail = sidebar === 'rail';
  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: colour.deepBlue, color: colour.white, borderBottom: `${stroke.thin}px solid ${onDeepBlue.divider}` }}>
      <Toolbar
        disableGutters
        sx={{ height: size.topBar - stroke.thin, minHeight: `${size.topBar - stroke.thin}px !important`, gap: 4, pr: d.level === 'comfortable' ? 6 : 5 }}
      >
        {narrow ? (
          <>
            <BarButton label="Menu" icon="shell.menu" onClick={onMenu} expanded={menuOpen} controls={menuControls} />
            <Box component="img" src={wordmark} alt="ICEFLO" sx={{ width: NARROW_WORDMARK, height: 'auto', display: 'block', flex: 'none' }} />
          </>
        ) : (
          <Box
            sx={{
              width: rail ? size.rail : size.sidebar,
              height: '100%',
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: rail ? 'center' : 'flex-start',
              px: rail ? 0 : 5,
              boxSizing: 'border-box',
              borderRight: `${stroke.thin}px solid ${onDeepBlue.divider}`,
              transition: (t) => t.transitions.create('width', { duration: t.transitions.duration.shorter }),
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            {rail ? (
              <Box component="img" src={mark} alt="ICEFLO" sx={{ width: 36, height: 36, display: 'block' }} />
            ) : (
              <Box component="img" src={wordmark} alt="ICEFLO" sx={{ width: wordmarkWidth[d.level], height: 'auto', display: 'block' }} />
            )}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flex: 'none' }}>
          <Notifications count={notificationCount}>{notifications}</Notifications>
          <RbmAccountMenu user={user} onAction={onAccountAction} compact={narrow} />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

interface BarButtonProps {
  label: string;
  icon: 'shell.menu' | 'shell.notifications';
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  expanded?: boolean;
  controls?: string;
  /** Overrides the accessible name, for example with the count. */
  name?: string;
  children?: ReactNode;
}

/** An icon-only button on the bar: white icon, a tooltip with its name (Icon suite rule 2). */
function BarButton({ label, icon, onClick, expanded, controls, name, children }: BarButtonProps) {
  const d = useDensity();
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
      <Tooltip title={label}>
        <IconButton
          aria-label={name ?? label}
          aria-expanded={expanded}
          aria-controls={expanded ? controls : undefined}
          onClick={onClick}
          sx={{
            width: d.target,
            height: d.target,
            borderRadius: `${radius.control}px`,
            color: colour.white,
            '&:hover': { bgcolor: onDeepBlue.hover },
            '&.Mui-focusVisible': { outline: `${stroke.thick}px solid ${colour.white}`, outlineOffset: 2 },
          }}
        >
          <RbmIcon name={icon} />
        </IconButton>
      </Tooltip>
      {children}
    </Box>
  );
}

/** The bell with its count, and a popover (its content is not drawn). */
function Notifications({ count, children }: { count: number; children?: ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = useId();
  const shown = count > COUNT_CAP ? `${COUNT_CAP}+` : String(count);
  return (
    <>
      <BarButton
        label="Notifications"
        icon="shell.notifications"
        name={count > 0 ? `Notifications (${shown} new)` : 'Notifications'}
        onClick={(e) => setAnchor(e.currentTarget)}
        expanded={anchor !== null}
        controls={id}
      >
        {count > 0 && (
          <Box
            component="span"
            aria-hidden
            data-testid="rbm-notification-count"
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: 16,
              height: 16,
              px: '2px',
              boxSizing: 'border-box',
              borderRadius: '999px',
              bgcolor: colour.white,
              color: colour.deepBlue,
              fontSize: 10,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
              pointerEvents: 'none',
            }}
          >
            {shown}
          </Box>
        )}
      </BarButton>
      <Popover
        id={id}
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { role: 'dialog', 'aria-label': 'Notifications', sx: { mt: '6px', width: 320, borderRadius: `${radius.card}px`, border: `${stroke.thin}px solid ${colour.rule}`, boxShadow: elevation.menu } } }}
      >
        <Box sx={{ p: 4, fontSize: 14, color: colour.ink }}>
          <Box component="h2" sx={{ m: 0, mb: 2, fontSize: 14, fontWeight: 800 }}>
            Notifications
          </Box>
          {children ?? <Box sx={{ color: colour.slate }}>{count > 0 ? `${shown} new.` : 'No new notifications.'}</Box>}
        </Box>
      </Popover>
    </>
  );
}
