import { Box, type SxProps, type Theme } from '@mui/material';
import { useDensity } from '../theme/RbmDensity';
import { iconDrawing, type RbmIconName } from './registry';

export interface RbmIconProps {
  /** A registry key, for example 'nav.list'. */
  name: RbmIconName;
  /**
   * Only for an icon that carries meaning alone (Icon suite rule 3). Without it the icon is decorative and
   * hidden from screen readers, as it is beside a text label.
   */
  title?: string;
  /** Size in px. Leave it out: the density sets it (D0 32, D1 24, D2 20, D3 16). */
  size?: number;
  sx?: SxProps<Theme>;
}

/**
 * One icon from the RBM suite. Colour comes from the text around it (currentColor) and size from the
 * density. Small sizes get a slightly heavier stroke so they stay crisp: 2.25 in the 24 px grid at 16 px
 * and below (1.5 px drawn), as on the Icon suite board's "Sizes".
 */
export function RbmIcon({ name, title, size, sx }: RbmIconProps) {
  const d = useDensity();
  const px = size ?? d.icon;
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth={px <= 16 ? 2.25 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      data-icon={name}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
      sx={[{ display: 'inline-block', flex: 'none' }, ...(Array.isArray(sx) ? sx : [sx])]}
      dangerouslySetInnerHTML={{ __html: iconDrawing(name) }}
    />
  );
}
