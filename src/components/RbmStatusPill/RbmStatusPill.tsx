import { Box, useTheme } from '@mui/material';
import type { RbmState, StatusToken } from '../../theme/tokens';

export type RbmStatusPillSize = 'normal' | 'compact';

export interface RbmStatusPillProps {
  state: RbmState;
  /** Overrides the default label for the state. The label is always shown. */
  label?: string;
  /** Normal for the page header; compact (24 px) for the sticky event bar. */
  size?: RbmStatusPillSize;
}

const sizes = {
  normal: { height: 30, fontSize: 15 },
  compact: { height: 24, fontSize: 12 },
} as const;

/** The state mark: a 10 px dot, or a 16 px ringed dot when the state has a core. */
function StatusDot({ token }: { token: StatusToken }) {
  const { palette } = useTheme();
  if (!token.core) {
    return (
      <Box
        component="span"
        aria-hidden="true"
        data-testid="rbm-status-dot"
        sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: token.signal, flex: 'none' }}
      />
    );
  }
  return (
    <Box
      component="span"
      aria-hidden="true"
      data-testid="rbm-status-dot"
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        bgcolor: token.signal,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      <Box
        component="span"
        data-testid="rbm-status-core"
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: token.core,
          border: `2px solid ${palette.background.paper}`,
          boxSizing: 'border-box',
        }}
      />
    </Box>
  );
}

/**
 * A state pill: a dot and a text label. Colour is never the only signal.
 * Drawn on the Command board for Active, Complete and Not started. The other
 * states combine that pill with the Semantic board's dots and are not yet drawn.
 */
export function RbmStatusPill({ state, label, size = 'normal' }: RbmStatusPillProps) {
  const { palette } = useTheme();
  const token = palette.status[state];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        height: sizes[size].height,
        px: 3.5,
        borderRadius: 999,
        border: `1px solid ${palette.divider}`,
        bgcolor: palette.background.paper,
        color: token.text,
        fontSize: sizes[size].fontSize,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
      }}
    >
      <StatusDot token={token} />
      {label ?? token.label}
    </Box>
  );
}
