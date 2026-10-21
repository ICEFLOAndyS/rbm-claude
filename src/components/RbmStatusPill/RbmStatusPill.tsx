import { Box } from '@mui/material';
import { colour, stateStyle, type RbmState } from '../../theme/tokens';

export interface RbmStatusPillProps {
  state: RbmState;
  /** Overrides the default label for the state. The label is always shown. */
  label?: string;
}

/**
 * A state pill: a dot and a text label. Colour is never the only signal.
 * Example of the pattern only; check it against the design file before extending.
 */
export function RbmStatusPill({ state, label }: RbmStatusPillProps) {
  const s = stateStyle[state];
  const text = label ?? s.label;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        height: 30,
        px: 1.75,
        borderRadius: 999,
        border: `1px solid ${colour.rule}`,
        bgcolor: colour.white,
        color: s.text,
        fontSize: 15,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        data-testid="rbm-status-dot"
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: s.ring ? s.centre : s.dot,
          boxShadow: s.ring ? `0 0 0 2px ${s.ring}` : 'none',
          flex: 'none',
        }}
      />
      {text}
    </Box>
  );
}
