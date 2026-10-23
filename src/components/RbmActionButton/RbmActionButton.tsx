import type { MouseEvent, Ref } from 'react';
import { Box, ButtonBase, Tooltip } from '@mui/material';
import { RbmIcon } from '../../icons/RbmIcon';
import type { RbmIconName } from '../../icons/registry';
import { useDensity } from '../../theme/RbmDensity';
import { colour, stroke } from '../../theme/tokens';

/**
 * The action button from the Icon suite board (Actions; "In use": panel header and toolbar buttons): a white
 * square at the density's control height, a 1 px Slate border, the control radius and a Deep Blue icon from
 * the suite. Two forms, both foundational (Andy Smith, 23 Oct 2026):
 *
 *   icon only      the drawn button: the action's name in a tooltip and for screen readers
 *   icon and text  the same button with the action's word beside the icon (not drawn: proposed)
 *
 * Every Edit uses it with `construct.edit`. Any action from the suite can.
 */

export interface RbmActionButtonProps {
  /** The action's icon, from the suite. Optional only with text. */
  icon?: RbmIconName;
  /** The action's word: the visible text, or the tooltip when the button is icon only. */
  label: string;
  /** Just the icon, with the label in a tooltip (for tight places such as rows and toolbars). */
  iconOnly?: boolean;
  /**
   * A fuller name for screen readers, which must start with the visible word: "Edit Details" for an Edit in
   * the Details section, so the button says what it acts on.
   */
  name?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function RbmActionButton({ icon, label, iconOnly = false, name, onClick, disabled, ref }: RbmActionButtonProps) {
  const d = useDensity();
  const button = (
    <ButtonBase
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      aria-label={iconOnly || name ? (name ?? label) : undefined}
      sx={{
        height: d.control,
        minWidth: d.control,
        px: iconOnly ? 0 : `${d.padX}px`,
        gap: '8px',
        boxSizing: 'border-box',
        border: `${stroke.thin}px solid ${colour.slate}`,
        borderRadius: `${d.radius}px`,
        bgcolor: colour.white,
        color: colour.deepBlue,
        fontFamily: 'inherit',
        fontSize: d.body,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flex: 'none',
        // Not drawn: hover and pressed are MUI's (a light tint and the ripple); focus is the 2 px Blue Dark ring.
        '&:hover': { bgcolor: colour.mist },
        '&.Mui-focusVisible': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 },
        // Disabled as on the Components board: Rule fill, Slate text.
        '&.Mui-disabled': { bgcolor: colour.rule, borderColor: colour.rule, color: colour.slate },
      }}
    >
      {icon && <RbmIcon name={icon} />}
      {!iconOnly && <Box component="span">{label}</Box>}
    </ButtonBase>
  );
  if (!iconOnly) return button;
  // A disabled button gets no pointer events, so the tooltip listens on a wrapper.
  return <Tooltip title={label}>{disabled ? <span style={{ display: 'inline-flex' }}>{button}</span> : button}</Tooltip>;
}
