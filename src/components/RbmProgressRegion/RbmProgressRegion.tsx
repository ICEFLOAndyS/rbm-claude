import { Box } from '@mui/material';
import { useState } from 'react';
import { RbmEyebrow, RbmRegionCollapsed, RbmRegionToggle, RbmSummaryChip } from '../RbmRegion/RbmRegion';
import { RbmRunbookProgress, RUNBOOK_NAME_WIDTH, type RbmRunbookProgressItem } from '../RbmRunbookProgress/RbmRunbookProgress';
import { RbmWorkstreamProgress, type RbmWorkstreamProgressItem } from '../RbmWorkstreamProgress/RbmWorkstreamProgress';
import { execProgressMinWidth } from '../RbmExecProgress/RbmExecProgress';
import { useDensity } from '../../theme/RbmDensity';

/** Which card's task and issue stats are shown. */
export interface RbmProgressStats {
  runbooks: boolean;
  workstreams: boolean;
}

export interface RbmProgressRegionProps {
  runbooks: RbmRunbookProgressItem[];
  workstreams: RbmWorkstreamProgressItem[];
  loading?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Each card's task and issue stats, shown or hidden. Both hidden by default; without it the region keeps the choice. */
  stats?: RbmProgressStats;
  onStatsChange?: (stats: RbmProgressStats) => void;
  timeZone?: string;
}

const NAME = 'Progress';
/** The accessible name: the Event vitals already have a region named Progress. */
export const PROGRESS_REGION_LABEL = 'Progress, runbooks and workstreams';

const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

/**
 * The Exec Briefing Centre's Progress region, where the Command Centre has its Task Timeline: Runbook progress and
 * Workstream progress side by side, each a card of its own. Not drawn (Proposed, asked by Andy Smith 28 Oct 2026).
 * Each card is as wide as its columns need (execProgressMinWidth) and shares out any width left; when the two do not
 * fit on one line they stack, Runbook progress first. Hiding a card's task and issue stats narrows it, so the two fit
 * side by side sooner; showing them widens it again. Collapsed, the region is the shared 56 px line with counts of
 * runbooks, workstreams and those late.
 */
export function RbmProgressRegion({ runbooks, workstreams, loading, collapsed = false, onCollapsedChange, stats: statsProp, onStatsChange, timeZone }: RbmProgressRegionProps) {
  const d = useDensity();
  const [statsState, setStatsState] = useState<RbmProgressStats>({ runbooks: false, workstreams: false });
  const stats = statsProp ?? statsState;
  const setStats = (change: Partial<RbmProgressStats>) => {
    const next = { ...stats, ...change };
    setStatsState(next);
    onStatsChange?.(next);
  };

  if (collapsed) {
    const late = [...runbooks, ...workstreams].filter((r) => r.late).length;
    return (
      <RbmRegionCollapsed title={NAME} label={PROGRESS_REGION_LABEL} onExpand={() => onCollapsedChange?.(false)}>
        <RbmSummaryChip label={count(runbooks.length, 'runbook')}>{count(runbooks.length, 'runbook')}</RbmSummaryChip>
        <RbmSummaryChip label={count(workstreams.length, 'workstream')}>{count(workstreams.length, 'workstream')}</RbmSummaryChip>
        {late > 0 && <RbmSummaryChip label={`${late} late`}>{late} late</RbmSummaryChip>}
      </RbmRegionCollapsed>
    );
  }

  // Each card starts at its narrowest and grows into the width left; below it, it wraps under the other.
  // Side by side, the cards stretch to the taller one's height.
  const slot = (min: number) => ({ flex: `1 1 ${min}px`, minWidth: `min(100%, ${min}px)`, display: 'flex', flexDirection: 'column' });
  const runbookMin = execProgressMinWidth(d.level, { nameWidth: RUNBOOK_NAME_WIDTH, showStats: stats.runbooks });
  const workstreamMin = execProgressMinWidth(d.level, { showStats: stats.workstreams });

  return (
    <Box component="section" aria-label={PROGRESS_REGION_LABEL} sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, lineHeight: 'normal' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, px: 1 }}>
        <RbmEyebrow>{NAME}</RbmEyebrow>
        {onCollapsedChange && <RbmRegionToggle region={NAME} collapsed={false} onChange={onCollapsedChange} />}
      </Box>
      <Box data-testid="rbm-progress-cards" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: `${d.gap}px` }}>
        <Box data-testid="rbm-progress-slot" data-min-width={runbookMin} sx={slot(runbookMin)}>
          <RbmRunbookProgress items={runbooks} loading={loading} timeZone={timeZone} showStats={stats.runbooks} onShowStatsChange={(show) => setStats({ runbooks: show })} />
        </Box>
        <Box data-testid="rbm-progress-slot" data-min-width={workstreamMin} sx={slot(workstreamMin)}>
          <RbmWorkstreamProgress items={workstreams} loading={loading} timeZone={timeZone} showStats={stats.workstreams} onShowStatsChange={(show) => setStats({ workstreams: show })} />
        </Box>
      </Box>
    </Box>
  );
}
