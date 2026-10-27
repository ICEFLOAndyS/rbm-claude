import { Avatar } from '@mui/material';
import { colour } from '../../theme/tokens';

/**
 * Sizes drawn on the Command board (28 in a task row, 32 and 36 in cards) and the App shell board (20, 28
 * and 36 in the top bar at D3, D2 and D1; 40 in the account menu), and the Progress board (18 beside an owner's
 * name at D1, 24 in the Owner column at D2).
 */
export type RbmAvatarSize = 18 | 20 | 24 | 28 | 32 | 36 | 40;

const fontSize: Record<RbmAvatarSize, number> = { 18: 9, 20: 7, 24: 10, 28: 10, 32: 12, 36: 13, 40: 15 };

export interface RbmAvatarProps {
  /** The person's full name. It is the accessible name, and the initials come from it. */
  name: string;
  /** Overrides the initials taken from the name. */
  initials?: string;
  size?: RbmAvatarSize;
  /** Hidden from screen readers, for an avatar beside the person's name in text. */
  decorative?: boolean;
}

/** First letter of the first and last words: "Mary O'Neill" gives "MO". */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0]!.charAt(0);
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}

/** A person's initials in a Blue Light circle. Unassigned tasks show no avatar. */
export function RbmAvatar({ name, initials, size = 28, decorative = false }: RbmAvatarProps) {
  return (
    <Avatar
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
      sx={{
        width: size,
        height: size,
        bgcolor: colour.blueLight,
        color: colour.deepBlue,
        fontSize: fontSize[size],
        fontWeight: 800,
        flex: 'none',
      }}
    >
      <span aria-hidden="true">{initials ?? initialsOf(name)}</span>
    </Avatar>
  );
}
