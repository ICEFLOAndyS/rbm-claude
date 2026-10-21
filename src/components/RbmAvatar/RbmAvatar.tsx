import { Avatar } from '@mui/material';
import { colour } from '../../theme/tokens';

/** Sizes drawn on the Command board: 28 in a task row, 32 and 36 in cards. */
export type RbmAvatarSize = 28 | 32 | 36;

const fontSize: Record<RbmAvatarSize, number> = { 28: 10, 32: 12, 36: 13 };

export interface RbmAvatarProps {
  /** The person's full name. It is the accessible name, and the initials come from it. */
  name: string;
  /** Overrides the initials taken from the name. */
  initials?: string;
  size?: RbmAvatarSize;
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
export function RbmAvatar({ name, initials, size = 28 }: RbmAvatarProps) {
  return (
    <Avatar
      role="img"
      aria-label={name}
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
