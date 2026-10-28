import { Box } from '@mui/material';
import { RbmEyebrow, RbmRegionCollapsed, RbmRegionToggle, RbmSummaryChip } from '../RbmRegion/RbmRegion';
import { RbmRunbookProgress, type RbmRunbookProgressItem } from '../RbmRunbookProgress/RbmRunbookProgress';
import { RbmWorkstreamProgress, type RbmWorkstreamProgressItem } from '../RbmWorkstreamProgress/RbmWorkstreamProgress';
import { useDensity } from '../../theme/RbmDensity';
import type { DensityLevel } from '../../theme/tokens';

export interface RbmProgressRegionProps {
  runbooks: RbmRunbookProgressItem[];
  workstreams: RbmWorkstreamProgressItem[];
  loading?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  timeZone?: string;
}

const NAME = 'Progress';
/** The accessible name: the Event vitals already have a region named Progress. */
export const PROGRESS_REGION_LABEL = 'Progress, runbooks and workstreams';

/**
 * The narrowest each card can be at each density before its drawn columns (name, the fixed columns and their gaps,
 * the side padding and a 100 px bar) no longer fit. Below twice this the cards stack.
 */
export const PROGRESS_CARD_MIN_WIDTH: Record<DensityLevel, number> = { command: 780, comfortable: 1080, compact: 1080, dense: 870 };

const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

/**
 * The Exec Briefing Centre's Progress region, where the Command Centre has its Task Timeline: Runbook progress and
 * Workstream progress side by side, each a card of its own. Not drawn (Proposed, asked by Andy Smith 28 Oct 2026).
 * The cards sit side by side while the region is wide enough for both at their drawn sizes, and stack, Runbook
 * progress first, when it is not. Collapsed, it is the shared 56 px line with counts of runbooks, workstreams and
 * those late.
 */
export function RbmProgressRegion({ runbooks, workstreams, loading, collapsed = false, onCollapsedChange, timeZone }: RbmProgressRegionProps) {
  const d = useDensity();
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
  return (
    <Box component="section" aria-label={PROGRESS_REGION_LABEL} sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, lineHeight: 'normal' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, px: 1 }}>
        <RbmEyebrow>{NAME}</RbmEyebrow>
        {onCollapsedChange && <RbmRegionToggle region={NAME} collapsed={false} onChange={onCollapsedChange} />}
      </Box>
      <Box
        data-testid="rbm-progress-cards"
        sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${PROGRESS_CARD_MIN_WIDTH[d.level]}px), 1fr))`, gap: `${d.gap}px`, alignItems: 'start' }}
      >
        <RbmRunbookProgress items={runbooks} loading={loading} timeZone={timeZone} />
        <RbmWorkstreamProgress items={workstreams} loading={loading} timeZone={timeZone} />
      </Box>
    </Box>
  );
}
