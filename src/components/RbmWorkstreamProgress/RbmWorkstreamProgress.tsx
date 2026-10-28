import { EXEC_PROGRESS_ROW_LIMIT, RbmExecProgress, execProgressSummary, type RbmExecProgressItem, type RbmExecProgressNoun } from '../RbmExecProgress/RbmExecProgress';

export { byStart, formatWhen, issuesText, percentComplete } from '../RbmExecProgress/RbmExecProgress';

/** One workstream. */
export type RbmWorkstreamProgressItem = RbmExecProgressItem;

export interface RbmWorkstreamProgressProps {
  items: RbmWorkstreamProgressItem[];
  /** Defaults to "Workstream progress". */
  title?: string;
  loading?: boolean;
  /** IANA time zone for start and end, for example "Europe/London". Defaults to the browser's. */
  timeZone?: string;
  /** Shows the task and issue stats; shown by default (RbmExecProgress). */
  showStats?: boolean;
  onShowStatsChange?: (show: boolean) => void;
}

/** Ten rows at most, then "+n more workstreams". */
export const WORKSTREAM_ROW_LIMIT = EXEC_PROGRESS_ROW_LIMIT;

/** The progress bar's accessible name, for example "Network, 31% complete, 5 of 16 tasks, Active, Late, …". */
export const workstreamSummary = execProgressSummary;

const noun: RbmExecProgressNoun = { one: 'workstream', many: 'workstreams' };

/**
 * Workstream progress (Progress board, "Workstream progress", Proposed): RbmExecProgress with the workstream words
 * and the drawn name column (180, 170 and 150 px at D1, D2 and D3).
 */
export function RbmWorkstreamProgress({ title = 'Workstream progress', ...props }: RbmWorkstreamProgressProps) {
  return <RbmExecProgress title={title} noun={noun} {...props} />;
}
