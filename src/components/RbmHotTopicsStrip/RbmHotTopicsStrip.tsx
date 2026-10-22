import { Box } from '@mui/material';
import { Children, useState, type ReactNode } from 'react';
import { RbmEyebrow, RbmRegionCollapsed, RbmRegionToggle, RbmSummaryChip } from '../RbmRegion/RbmRegion';
import { countdown, type RbmBlocker, type RbmMilestoneItem, type RbmNextCheckpointData, type RbmWatcher } from './cards';

/** One chip in the collapsed strip's summary, for example { label: 'Blockers', value: '2' }. */
export interface RbmHotTopicsSummaryItem {
  label: string;
  value: string;
}

export interface RbmHotTopicsStripProps {
  /**
   * The cards, ordered by urgency: Blockers, Next checkpoint, Milestones, Collaboration, Watchers.
   * They follow the runbook filter; the page passes the filtered data.
   */
  children: ReactNode;
  /** Open by default. Pass with onCollapsedChange to remember the choice. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** What the collapsed line shows: one chip per card. See hotTopicsSummary. */
  summary?: RbmHotTopicsSummaryItem[];
}

/** The collapsed strip's chips, in card order, with the number each card's header shows. */
export function hotTopicsSummary(
  d: { blockers: RbmBlocker[]; nextCheckpoint?: RbmNextCheckpointData; milestones: RbmMilestoneItem[]; collaboration: { live: boolean }; watchers: RbmWatcher[] },
  now: Date,
): RbmHotTopicsSummaryItem[] {
  return [
    { label: 'Blockers', value: String(d.blockers.length) },
    { label: 'Next checkpoint', value: d.nextCheckpoint ? countdown(d.nextCheckpoint.at, now) : 'none' },
    { label: 'Milestones', value: String(d.milestones.length) },
    { label: 'Collaboration', value: d.collaboration.live ? 'Live' : 'Not live' },
    { label: 'Watchers', value: String(d.watchers.length) },
  ];
}

/** Column widths as drawn on the Command board, for the five cards in order. */
const drawn = '1.3fr 1fr 1.25fr 1.05fr 0.95fr';

/**
 * The Hot-topics strip, directly under the Task Timeline: five cards side by side. On screens
 * below 1200 px it becomes two rows of cards, and below 900 px the cards stack. It never scrolls on its own.
 * It collapses as a whole to one line, like the Event ribbon.
 */
export function RbmHotTopicsStrip({ children, collapsed: collapsedProp, onCollapsedChange, summary = [] }: RbmHotTopicsStripProps) {
  const [collapsedState, setCollapsedState] = useState(false);
  const collapsed = collapsedProp ?? collapsedState;
  const setCollapsed = (c: boolean) => {
    setCollapsedState(c);
    onCollapsedChange?.(c);
  };
  const count = Children.count(children);

  if (collapsed) {
    return (
      <RbmRegionCollapsed title="Hot-topics strip" onExpand={() => setCollapsed(false)}>
        {summary.map((item) => (
          <RbmSummaryChip key={item.label} label={`${item.label} ${item.value}`}>
            <Box component="span" sx={{ color: 'text.secondary' }}>{item.label}</Box>
            <Box component="strong" sx={{ color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{item.value}</Box>
          </RbmSummaryChip>
        ))}
      </RbmRegionCollapsed>
    );
  }

  return (
    <Box role="region" aria-label="Hot-topics strip" sx={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 'normal' }}>
      {/* Not drawn: the strip's own header, so it can collapse like the ribbon. */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, px: 1 }}>
        <RbmEyebrow>Hot-topics strip</RbmEyebrow>
        <RbmRegionToggle region="Hot-topics strip" collapsed={false} onChange={setCollapsed} />
      </Box>
      <Box
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
    </Box>
  );
}
