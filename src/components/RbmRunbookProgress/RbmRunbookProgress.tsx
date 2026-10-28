import {
  EXEC_PROGRESS_ROW_LIMIT,
  RbmExecProgress,
  execProgressSummary,
  type RbmExecProgressItem,
  type RbmExecProgressNameWidth,
  type RbmExecProgressNoun,
} from '../RbmExecProgress/RbmExecProgress';

export { byStart, formatWhen, issuesText, percentComplete } from '../RbmExecProgress/RbmExecProgress';

/** One runbook of the selected Event. */
export type RbmRunbookProgressItem = RbmExecProgressItem;

export interface RbmRunbookProgressProps {
  /** The selected Event's runbooks only (decided). The Event's name comes from the page, so the card does not show it. */
  items: RbmRunbookProgressItem[];
  /** Defaults to "Runbook progress". */
  title?: string;
  loading?: boolean;
  /** IANA time zone for start and end, for example "Europe/London". Defaults to the browser's. */
  timeZone?: string;
  /** Shows the task and issue stats; hidden by default (RbmExecProgress). */
  showStats?: boolean;
  onShowStatsChange?: (show: boolean) => void;
}

/** Ten rows at most, then "+n more runbooks". */
export const RUNBOOK_ROW_LIMIT = EXEC_PROGRESS_ROW_LIMIT;

/** The progress bar's accessible name, for example "Core network cutover, 31% complete, 5 of 16 tasks, Active, Late, …". */
export const runbookSummary = execProgressSummary;

const noun: RbmExecProgressNoun = { one: 'runbook', many: 'runbooks' };

/** Runbook names are longer: the name column is drawn wider. */
export const RUNBOOK_NAME_WIDTH: RbmExecProgressNameWidth = { comfortable: 230, compact: 190, dense: 190 };

/**
 * Runbook progress (Progress board, "Runbook progress", Proposed): RbmExecProgress with the runbook words and the
 * wider name column (230, 190 and 190 px at D1, D2 and D3).
 */
export function RbmRunbookProgress({ title = 'Runbook progress', ...props }: RbmRunbookProgressProps) {
  return <RbmExecProgress title={title} noun={noun} nameWidth={RUNBOOK_NAME_WIDTH} {...props} />;
}
