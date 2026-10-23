import { useId, useState } from 'react';
import { Box, ButtonBase, Divider, Menu, MenuItem } from '@mui/material';
import { RbmAvatar, type RbmAvatarSize } from '../RbmAvatar/RbmAvatar';
import { RbmIcon } from '../../icons/RbmIcon';
import type { RbmIconName } from '../../icons/registry';
import { useDensity } from '../../theme/RbmDensity';
import { colour, onDeepBlue, radius, stroke, type DensityLevel } from '../../theme/tokens';


/** The signed-in user, as the shell shows them. A stub in the prototype; the ServiceNow session later. */
export interface RbmUser {
  /** Keys the user's own preferences, such as the remembered sidebar. */
  id: string;
  name: string;
  /** The role shown under the name, for example "Cutover Manager". */
  role: string;
  email: string;
  initials?: string;
}

/** The account menu's items, as drawn. Settings is personal; Setup (Admin) configures the application. */
export type RbmAccountAction = 'profile' | 'settings' | 'notificationPreferences' | 'signOut';

const items: { action: RbmAccountAction; label: string; icon: RbmIconName; dividerBefore?: boolean }[] = [
  { action: 'profile', label: 'Profile', icon: 'shell.profile' },
  // Drawn with the Setup icon (flagged: one shape, two meanings).
  { action: 'settings', label: 'Settings', icon: 'nav.setup' },
  { action: 'notificationPreferences', label: 'Notification preferences', icon: 'shell.notifications' },
  { action: 'signOut', label: 'Sign out', icon: 'shell.signOut', dividerBefore: true },
];

/** The avatar in the bar at each level (App shell board, "Top bar"). */
const barAvatar: Record<DensityLevel, RbmAvatarSize> = { command: 36, comfortable: 36, compact: 28, dense: 20 };

export interface RbmAccountMenuProps {
  user: RbmUser;
  onAction?: (action: RbmAccountAction) => void;
  /** Avatar only, as on narrow screens (App shell board, mobile drawer). */
  compact?: boolean;
}

/**
 * The signed-in user in the top bar: avatar, name and role, and a chevron. It opens a menu with the user's
 * name, role and email, then Profile, Settings, Notification preferences and Sign out.
 */
export function RbmAccountMenu({ user, onAction, compact = false }: RbmAccountMenuProps) {
  const d = useDensity();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const open = anchor !== null;
  const choose = (action: RbmAccountAction) => {
    setAnchor(null);
    onAction?.(action);
  };

  return (
    <>
      <ButtonBase
        aria-label={`Account: ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          p: '4px 8px 4px 4px',
          borderRadius: `${radius.control}px`,
          color: colour.white,
          // Open, as drawn. Hover is not drawn: the sidebar's hover tint on Deep Blue.
          bgcolor: open ? 'rgba(255,255,255,0.12)' : 'transparent',
          '&:hover': { bgcolor: open ? 'rgba(255,255,255,0.12)' : onDeepBlue.hover },
          '&.Mui-focusVisible': { outline: `${stroke.thick}px solid ${colour.white}`, outlineOffset: 2 },
        }}
      >
        <RbmAvatar name={user.name} initials={user.initials} size={barAvatar[d.level]} decorative />
        {!compact && (
          <>
            <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2, textAlign: 'left' }}>
              <Box component="span" sx={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {user.name}
              </Box>
              <Box component="span" sx={{ fontSize: 11, color: colour.blueLight, whiteSpace: 'nowrap' }}>
                {user.role}
              </Box>
            </Box>
            <Box component="span" sx={{ display: 'inline-flex', color: colour.blueLight }}>
              <RbmIcon name="display.next" size={16} />
            </Box>
          </>
        )}
      </ButtonBase>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: '6px',
              width: 280,
              border: `${stroke.thin}px solid ${colour.rule}`,
              borderRadius: `${radius.card}px`,
              boxShadow: '0 8px 24px rgba(31,36,48,0.18)',
            },
          },
          list: { sx: { py: 0 }, 'aria-label': 'Account' },
        }}
      >
        {/* Who is signed in: not a menu item, so it is skipped by the arrow keys. */}
        <Box role="presentation" sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 4 }}>
          <RbmAvatar name={user.name} initials={user.initials} size={40} decorative />
          <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
            <Box component="span" sx={{ fontSize: 14, fontWeight: 800, color: colour.ink }}>
              {user.name}
            </Box>
            <Box component="span" sx={{ fontSize: 12, color: colour.slate }}>
              {user.role}
            </Box>
            <Box component="span" sx={{ fontSize: 12, color: colour.slate, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </Box>
          </Box>
        </Box>
        {items.flatMap((item, i) => [
          ...(i === 0 || item.dividerBefore ? [<Divider key={`${item.action}-rule`} sx={{ my: '0 !important', borderColor: colour.rule }} />] : []),
          <MenuItem key={item.action} onClick={() => choose(item.action)} sx={{ gap: 3, px: 4, fontWeight: 600, color: colour.ink }}>
            <Box component="span" sx={{ display: 'inline-flex', color: colour.deepBlue }}>
              <RbmIcon name={item.icon} />
            </Box>
            {item.label}
          </MenuItem>,
        ])}
      </Menu>
    </>
  );
}
