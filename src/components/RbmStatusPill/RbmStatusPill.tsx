import { Box, useTheme } from '@mui/material';
import type { RbmState, StatusToken } from '../../theme/tokens';
import { stroke } from '../../theme/tokens';
import { ringSize, useDensity } from '../../theme/RbmDensity';

export type RbmStatusPillSize = 'normal' | 'compact';

export interface RbmStatusPillProps {
  state: RbmState;
  /** Overrides the default label for the state. The label is always shown. */
  label?: string;
  /** Normal for the page header; compact (24 px) for the sticky event bar. Text and dot follow the region's density. */
  size?: RbmStatusPillSize;
}

/** Pill heights as drawn (not on the density scale). Text is the density's body text, or its secondary text when compact. */
const heights = { normal: 30, compact: 24 } as const;

/** The state mark: the density's dot, or a ringed dot when the state has a core. */
function StatusDot({ token }: { token: StatusToken }) {
  const { palette } = useTheme();
  const { dot } = useDensity();
  if (!token.core) {
    return (
      <Box
        component="span"
        aria-hidden="true"
        data-testid="rbm-status-dot"
        sx={{ width: dot, height: dot, borderRadius: '50%', bgcolor: token.signal, flex: 'none' }}
      />
    );
  }
  return (
    <Box
      component="span"
      aria-hidden="true"
      data-testid="rbm-status-dot"
      sx={{
        width: ringSize(dot),
        height: ringSize(dot),
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
          width: dot,
          height: dot,
          borderRadius: '50%',
          bgcolor: token.core,
          border: `${stroke.thick}px solid ${palette.background.paper}`,
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
  const d = useDensity();
  const token = palette.status[state];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        height: heights[size],
        px: 3.5,
        borderRadius: 999,
        border: `${stroke.thin}px solid ${palette.divider}`,
        bgcolor: palette.background.paper,
        color: token.text,
        fontSize: size === 'compact' ? d.caption : d.body,
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
