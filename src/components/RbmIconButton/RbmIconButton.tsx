import { IconButton, type IconButtonProps } from '@mui/material';
import type { ReactNode } from 'react';
import { colour, stroke } from '../../theme/tokens';
import { useDensity } from '../../theme/RbmDensity';
import { RbmIcon } from '../../icons/RbmIcon';
import type { RbmIconName } from '../../icons/registry';

/** The icon: a registry key, or (until earlier components move to the registry) a 20 px icon as children. */
type RbmIconButtonIcon = { name: RbmIconName; children?: never } | { name?: never; children: ReactNode };

export type RbmIconButtonProps = Omit<IconButtonProps, 'children' | 'aria-label' | 'name'> &
  RbmIconButtonIcon & {
    /** What the button does, for screen readers. Required: the button has no visible text. */
    label: string;
  };

/** A square icon button with a Deep Blue outline, as drawn on the Components board ("More actions"), at the density's control size (48 px at D1). */
export function RbmIconButton({ label, name, children, sx, ...props }: RbmIconButtonProps) {
  const d = useDensity();
  return (
    <IconButton
      aria-label={label}
      {...props}
      sx={[
        {
          width: d.control,
          height: d.control,
          border: `${stroke.thick}px solid ${colour.deepBlue}`,
          borderRadius: `${d.radius}px`,
          bgcolor: colour.white,
          color: colour.deepBlue,
          '&.Mui-disabled': { borderColor: colour.rule, bgcolor: colour.rule, color: colour.slate },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {name ? <RbmIcon name={name} /> : children}
    </IconButton>
  );
}
