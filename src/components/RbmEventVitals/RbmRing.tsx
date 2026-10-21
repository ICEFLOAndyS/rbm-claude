import { Box, useTheme } from '@mui/material';

export interface RbmRingSegment {
  value: number;
  colour: string;
}

export interface RbmRingProps {
  /** Segments in order, clockwise from the top. Their share is of `total`. */
  segments: RbmRingSegment[];
  total: number;
  /** The figure in the centre, for example "68%". */
  centre: string;
  size?: number;
}

/**
 * Dash lengths and offsets on a 100-unit circle, as drawn: each segment starts half a unit
 * after its share begins and is one unit shorter than its share, leaving a one-unit gap.
 * A segment too small to show keeps half a unit, so a non-zero value is never invisible.
 */
export function ringSegments(values: number[], total: number) {
  let start = 0;
  return values.map((v) => {
    const share = total > 0 ? (v / total) * 100 : 0;
    const segment = { length: share > 0 ? Math.max(share - 1, 0.5) : 0, offset: start + 0.5 };
    start += share;
    return segment;
  });
}

/** The ring from the Column ring, in small form: Rule track, coloured segments, a figure in the centre. */
export function RbmRing({ segments, total, centre, size = 84 }: RbmRingProps) {
  const { palette } = useTheme();
  const geometry = ringSegments(segments.map((s) => s.value), total);
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block' }}>
        <circle cx="50" cy="50" r="44" fill="none" stroke={palette.divider} strokeWidth="12" />
        {segments.map((s, i) =>
          geometry[i]!.length > 0 ? (
            <circle
              key={i}
              data-testid="rbm-ring-segment"
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={s.colour}
              strokeWidth="12"
              pathLength="100"
              strokeDasharray={`${geometry[i]!.length.toFixed(2)} 100`}
              strokeDashoffset={(-geometry[i]!.offset).toFixed(2)}
              transform="rotate(-90 50 50)"
            />
          ) : null,
        )}
      </svg>
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'text.primary' }}>
        {centre}
      </Box>
    </Box>
  );
}
