import { Box, Checkbox, type CheckboxProps } from '@mui/material';
import { colour, stroke } from '../../theme/tokens';

/**
 * The checkbox drawn in the Scenario section of the App shell board: a 20 px box with 5 px corners, Deep Blue and a
 * white tick when checked (Brand Green means Complete only), white with a Slate edge when not. MUI's Checkbox
 * underneath, so it is a real input with its keyboard and screen-reader behaviour.
 *
 * Not drawn: hover, pressed and disabled. Hover and pressed are MUI's ripple; disabled is the board's faded box
 * (the locked row's "On by default", at 40%).
 */

const box = { width: 20, height: 20, borderRadius: '5px', border: `2px solid ${colour.slate}`, boxSizing: 'border-box', bgcolor: colour.white, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' } as const;

function Unchecked() {
  return <Box component="span" sx={box} />;
}

function Checked() {
  return (
    <Box component="span" sx={{ ...box, bgcolor: colour.deepBlue, borderColor: colour.deepBlue }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colour.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </Box>
  );
}

export function RbmCheckbox({ sx, ...props }: Omit<CheckboxProps, 'icon' | 'checkedIcon'>) {
  return (
    <Checkbox
      {...props}
      icon={<Unchecked />}
      checkedIcon={<Checked />}
      sx={[
        { p: 0, '&.Mui-disabled': { opacity: 0.4 }, '&.Mui-focusVisible > span': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
