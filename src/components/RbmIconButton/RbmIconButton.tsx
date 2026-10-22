import { IconButton, type IconButtonProps } from '@mui/material';
import type { ReactNode } from 'react';
import { colour, radius, stroke } from '../../theme/tokens';

export interface RbmIconButtonProps extends Omit<IconButtonProps, 'children' | 'aria-label'> {
  /** What the button does, for screen readers. Required: the button has no visible text. */
  label: string;
  /** A 20 px icon. */
  children: ReactNode;
}

/** A square icon button with a Deep Blue outline, as drawn on the Components board ("More actions"). */
export function RbmIconButton({ label, children, sx, ...props }: RbmIconButtonProps) {
  return (
    <IconButton
      aria-label={label}
      {...props}
      sx={[
        {
          width: 48,
          height: 48,
          border: `${stroke.thick}px solid ${colour.deepBlue}`,
          borderRadius: `${radius.control}px`,
          bgcolor: colour.white,
          color: colour.deepBlue,
          '&.Mui-disabled': { borderColor: colour.rule, bgcolor: colour.rule, color: colour.slate },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </IconButton>
  );
}
