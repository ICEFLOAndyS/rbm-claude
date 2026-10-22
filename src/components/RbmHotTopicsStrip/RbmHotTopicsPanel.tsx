import { Box, useMediaQuery } from '@mui/material';
import { EVENT_BAR_HEIGHT } from '../RbmEventBar/RbmEventBar';
import { Children, useState } from 'react';
import { RbmEyebrow, RbmToggleLink } from '../RbmRegion/RbmRegion';
import { RbmHotTopicsStrip, type RbmHotTopicsStripProps } from './RbmHotTopicsStrip';
import { radius } from '../../theme/tokens';
import { useDensity } from '../../theme/RbmDensity';

export type RbmHotTopicsPanelProps = RbmHotTopicsStripProps;

/** The open panel's width. Not drawn (flagged): wide enough for the drawn cards, which were 230 to 300 px in the strip. */
export const HOT_TOPICS_PANEL_WIDTH = 340;
/** The collapsed rail's width. */
export const HOT_TOPICS_RAIL_WIDTH = 56;
/** Below this the page has no room for a side panel, and Hot topics become the strip under the main column. */
export const HOT_TOPICS_PANEL_MIN_VIEWPORT = 1200;

const NAME = 'Hot-topics panel';

/** Pinned under the compact event bar with a 16 px gap, and never taller than the screen. */
const sticky = { position: 'sticky', top: EVENT_BAR_HEIGHT + 16, maxHeight: `calc(100vh - ${EVENT_BAR_HEIGHT + 32}px)`, boxSizing: 'border-box' } as const;

function Chevron({ left }: { left?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d={left ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

/**
 * The Hot-topics panel: the Hot-topics cards stacked in a column on the right of the page, from
 * under the Event vitals down. It stays in view while the page scrolls, and scrolls its own cards
 * when they do not fit. Collapsed, it is a 56 px rail with the expand button and one count per card,
 * and the Event ribbon and Task Timeline take the width. Below 1200 px it is the Hot-topics strip.
 * Not drawn on the Command board (flagged).
 */
export function RbmHotTopicsPanel(props: RbmHotTopicsPanelProps) {
  const d = useDensity();
  const { children, collapsed: collapsedProp, onCollapsedChange, summary = [] } = props;
  const narrow = useMediaQuery(`(max-width: ${HOT_TOPICS_PANEL_MIN_VIEWPORT - 0.02}px)`);
  const [collapsedState, setCollapsedState] = useState(false);
  const collapsed = collapsedProp ?? collapsedState;
  const setCollapsed = (c: boolean) => {
    setCollapsedState(c);
    onCollapsedChange?.(c);
  };

  if (narrow) return <RbmHotTopicsStrip {...props} collapsed={collapsed} onCollapsedChange={setCollapsed} title={NAME} />;

  if (collapsed) {
    return (
      <Box
        component="section"
        aria-label={NAME}
        data-collapsed="true"
        sx={{ ...sticky, width: HOT_TOPICS_RAIL_WIDTH, border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 2, overflowY: 'auto', lineHeight: 'normal' }}
      >
        <RbmToggleLink onClick={() => setCollapsed(false)} label={`Expand ${NAME}`} sx={{ width: d.target, height: d.target, justifyContent: 'center', flex: 'none' }}>
          <Chevron left />
        </RbmToggleLink>
        <Box sx={{ writingMode: 'vertical-rl', flex: 'none' }}>
          <RbmEyebrow>Hot topics</RbmEyebrow>
        </Box>
        <Box component="ul" aria-label={`${NAME} summary`} sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {summary.map((item) => (
            <Box
              component="li"
              key={item.label}
              aria-label={`${item.label} ${item.value}`}
              sx={{ writingMode: 'vertical-rl', display: 'inline-flex', alignItems: 'center', gap: 1.5, width: 32, py: 3, boxSizing: 'border-box', border: 1, borderColor: 'divider', borderRadius: `${radius.pill}px`, fontSize: d.caption, whiteSpace: 'nowrap' }}
            >
              <Box component="span" sx={{ color: 'text.secondary' }}>{item.label}</Box>
              <Box component="strong" sx={{ color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{item.value}</Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box role="region" aria-label={NAME} sx={{ ...sticky, width: HOT_TOPICS_PANEL_WIDTH, display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 'normal' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, px: 1, flex: 'none' }}>
        <RbmEyebrow>Hot topics</RbmEyebrow>
        <RbmToggleLink onClick={() => setCollapsed(true)} label={`Collapse ${NAME}`}>
          Collapse
          <Chevron />
        </RbmToggleLink>
      </Box>
      {/* The cards scroll inside the panel when they are taller than the screen. */}
      <Box data-testid="rbm-hot-topics-cards" sx={{ display: 'flex', flexDirection: 'column', gap: `${d.gap}px`, minHeight: 0, overflowY: 'auto', pb: 1 }}>
        {Children.map(children, (child) => (
          <Box sx={{ display: 'flex', minWidth: 0, flex: 'none' }}>{child}</Box>
        ))}
      </Box>
    </Box>
  );
}
