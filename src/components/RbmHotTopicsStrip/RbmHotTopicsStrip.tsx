import { Box } from '@mui/material';
import { Children, type ReactNode } from 'react';

export interface RbmHotTopicsStripProps {
  /**
   * The cards, ordered by urgency: Blockers, Next checkpoint, Milestones, Collaboration, Watchers.
   * They follow the runbook filter; the page passes the filtered data.
   */
  children: ReactNode;
}

/** Column widths as drawn on the Command board, for the five cards in order. */
const drawn = '1.3fr 1fr 1.25fr 1.05fr 0.95fr';

/**
 * The Hot-topics strip, directly under the Task Timeline: five cards side by side. On screens
 * below 1200 px it becomes two rows of cards, and below 900 px the cards stack. It never scrolls on its own.
 */
export function RbmHotTopicsStrip({ children }: RbmHotTopicsStripProps) {
  const count = Children.count(children);
  return (
    <Box
      role="region"
      aria-label="Hot-topics strip"
      sx={{
        display: 'grid',
        gridTemplateColumns: count === 5 ? drawn : `repeat(${count}, minmax(0, 1fr))`,
        gap: 3,
        alignItems: 'stretch',
        '@media (max-width: 1199.98px)': { gridTemplateColumns: `repeat(${Math.min(count, 3)}, minmax(0, 1fr))` },
        '@media (max-width: 899.98px)': { gridTemplateColumns: '1fr' },
      }}
    >
      {Children.map(children, (child) => (
        <Box sx={{ display: 'flex', minWidth: 0 }}>{child}</Box>
      ))}
    </Box>
  );
}
