import { Box, useTheme } from '@mui/material';
import { createContext, useContext, useId, type ReactNode } from 'react';
import { colour, hairline, radius, type DensityLevel } from '../../theme/tokens';
import { useDensity } from '../../theme/RbmDensity';
import { RbmIcon } from '../../icons/RbmIcon';
import { suiteStates, type RbmSuiteState } from '../../icons/states';
import { RbmAvatar, type RbmAvatarSize } from '../RbmAvatar/RbmAvatar';

/** One row: a workstream, a runbook or the like. Data from the RBM planning engine; ServiceNow attribute names are bound later. */
export interface RbmExecProgressItem {
  id: string;
  name: string;
  owner: { name: string; initials: string };
  /** The card is ordered by it, earliest first. */
  start: Date;
  /** Start and end are shown as given: the system decides from the state whether they are planned, forecast or actual (Andy Smith, 27 Oct 2026). */
  end: Date;
  /** An Icon suite state. The data gives it; the card never derives it. */
  state: RbmSuiteState;
  /** Tasks Complete. */
  complete: number;
  /** Tasks in the item. */
  total: number;
  /** Open issues by severity. */
  issues: { high: number; medium: number; low: number };
  /** Set by the Planning engine. The card only displays it. */
  late: boolean;
}

/** What one row is, in lower case, for example { one: 'workstream', many: 'workstreams' }. */
export interface RbmExecProgressNoun {
  one: string;
  many: string;
}

/** The name column's width in px at D1, D2 and D3. At D0 it is always 280 px. */
export type RbmExecProgressNameWidth = Record<'comfortable' | 'compact' | 'dense', number>;

export interface RbmExecProgressProps {
  items: RbmExecProgressItem[];
  title: string;
  /** Used in the name heading, "+n more", the empty text and the loading label. */
  noun: RbmExecProgressNoun;
  /** Defaults to Workstream progress's drawn 180, 170 and 150 px. */
  nameWidth?: RbmExecProgressNameWidth;
  loading?: boolean;
  /** IANA time zone for start and end, for example "Europe/London". Defaults to the browser's. */
  timeZone?: string;
}

/** Ten rows at most (decided by Andy Smith, 26 Oct 2026), then "+n more workstreams" or "+n more runbooks". */
export const EXEC_PROGRESS_ROW_LIMIT = 10;

/** Percent Complete, rounded (28 of 60 is 47%, as drawn), but never 100% until every task is Complete. A total of 0 is 0%. */
export function percentComplete(complete: number, total: number) {
  if (total <= 0) return 0;
  if (complete >= total) return 100;
  return Math.min(99, Math.round((complete / total) * 100));
}

/** Earliest start first. Ties keep the name order (not decided: flagged). */
export function byStart(a: RbmExecProgressItem, b: RbmExecProgressItem) {
  return a.start.getTime() - b.start.getTime() || a.name.localeCompare(b.name);
}

/** "24 Oct 22:00", 24-hour, as the Event window reads. */
export function formatWhen(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('hour')}:${part('minute')}`;
}

/** "1 high, 2 medium issues", "1 low issue" or "no open issues". */
export function issuesText({ high, medium, low }: RbmExecProgressItem['issues']) {
  const parts = [high && `${high} high`, medium && `${medium} medium`, low && `${low} low`].filter(Boolean);
  if (parts.length === 0) return 'no open issues';
  return `${parts.join(', ')} ${high + medium + low === 1 ? 'issue' : 'issues'}`;
}

/**
 * The progress bar's accessible name, for example "Network, 31% complete, 5 of 16 tasks, Active, Late, 1 high,
 * 2 medium issues, owner R. Patel, 24 Oct 22:30 to 25 Oct 03:00". It carries every field at every density.
 */
export function execProgressSummary(item: RbmExecProgressItem, timeZone?: string) {
  return [
    item.name,
    `${percentComplete(item.complete, item.total)}% complete`,
    `${item.complete} of ${item.total} tasks`,
    suiteStates[item.state].label,
    ...(item.late ? ['Late'] : []),
    issuesText(item.issues),
    `owner ${item.owner.name}`,
    `${formatWhen(item.start, timeZone)} to ${formatWhen(item.end, timeZone)}`,
  ].join(', ');
}

/**
 * Drawn sizes the density scale does not name (Progress board, "Workstream progress" and "Runbook progress";
 * docs/density.md): the columns after the name, bar height, percentage width, status glyph, owner avatar and title
 * size. Row height, text, dots, gap and side padding come from the density tokens.
 */
const drawn: Record<DensityLevel, { rest: string; bar: number; percent: number; glyph: number; avatar: RbmAvatarSize; title: number }> = {
  command: { rest: 'minmax(0,1fr) 300px', bar: 16, percent: 52, glyph: 26, avatar: 20, title: 22 },
  comfortable: { rest: 'minmax(0,1fr) 52px 52px 52px 52px 60px 44px 104px 160px', bar: 10, percent: 40, glyph: 20, avatar: 18, title: 18 },
  compact: { rest: 'minmax(0,1fr) 44px 40px 40px 40px 40px 54px 38px 78px 78px 130px', bar: 8, percent: 40, glyph: 16, avatar: 24, title: 18 },
  dense: { rest: 'minmax(0,1fr) 84px 140px 46px 96px 150px', bar: 6, percent: 40, glyph: 14, avatar: 20, title: 18 },
};

/** The name column at D0, the same on both boards. */
const COMMAND_NAME_WIDTH = 280;

/** Workstream progress's drawn name widths: the default. */
export const DEFAULT_NAME_WIDTH: RbmExecProgressNameWidth = { comfortable: 180, compact: 170, dense: 150 };

/** The card's whole column template at its density, shared by the headers, rows and loading rows. */
const ColumnsContext = createContext('');
const useColumns = () => useContext(ColumnsContext);

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Column headings by density. D0 shows Essential only; D3 is one line. */
const headingsFor = (noun: RbmExecProgressNoun): Record<DensityLevel, { label: string; align?: 'right' }[]> => ({
  command: [{ label: capital(noun.one) }, { label: 'Progress' }, { label: 'Status' }],
  comfortable: [
    { label: `${capital(noun.one)} and owner` }, { label: 'Progress' },
    { label: 'Done', align: 'right' }, { label: 'To do', align: 'right' }, { label: 'Total', align: 'right' },
    { label: 'High', align: 'right' }, { label: 'Medium', align: 'right' }, { label: 'Low', align: 'right' },
    { label: 'Start / end' }, { label: 'Status' },
  ],
  compact: [
    { label: capital(noun.one) }, { label: 'Progress' }, { label: 'Owner' },
    { label: 'Done', align: 'right' }, { label: 'To do', align: 'right' }, { label: 'Total', align: 'right' },
    { label: 'High', align: 'right' }, { label: 'Medium', align: 'right' }, { label: 'Low', align: 'right' },
    { label: 'Start' }, { label: 'End' }, { label: 'Status' },
  ],
  dense: [{ label: capital(noun.one) }, { label: 'Progress' }, { label: 'Done / total', align: 'right' }, { label: 'Issues H · M · L' }, { label: 'Owner' }, { label: 'End' }, { label: 'Status' }],
});

const visuallyHidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const;
const figures = { fontVariantNumeric: 'tabular-nums' } as const;
const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

function Grid({ header, children }: { header?: boolean; children: ReactNode }) {
  const d = useDensity();
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: useColumns(),
        gap: `${d.gap}px`,
        alignItems: 'center',
        px: 1,
        ...(header
          ? { height: 26, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: 1, borderColor: 'divider' }
          : { height: d.row, borderBottom: `1px solid ${hairline}` }),
      }}
    >
      {children}
    </Box>
  );
}

/** The two-level header's top line at D1 and D2: Tasks and Open issues over their three columns. */
function GroupHeader() {
  const d = useDensity();
  const first = d.level === 'compact' ? 4 : 3;
  const group = (label: string, column: number) => (
    <Box component="span" sx={{ gridColumn: `${column} / span 3`, textAlign: 'center', borderBottom: `1px solid ${colour.silver}`, pb: '2px' }}>
      {label}
    </Box>
  );
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: useColumns(), gap: `${d.gap}px`, alignItems: 'center', height: 22, px: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
      {group('Tasks', first)}
      {group('Open issues', first + 3)}
    </Box>
  );
}

function Bar({ percent, complete }: { percent: number; complete: boolean }) {
  const { palette } = useTheme();
  const d = useDensity();
  const size = drawn[d.level];
  // Blue Dark while under way; Brand Green only when the whole item is Complete (decided).
  const fill = complete ? palette.status.complete.signal : palette.status.active.signal;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0, height: size.bar, borderRadius: `${size.bar / 2}px`, bgcolor: 'divider', overflow: 'hidden' }}>
        <Box data-testid="rbm-progress-fill" data-fill={complete ? 'complete' : 'active'} sx={{ width: `${percent}%`, height: '100%', bgcolor: fill }} />
      </Box>
      <Box component="span" sx={{ width: size.percent, flex: 'none', textAlign: 'right', fontSize: d.level === 'command' ? d.body : d.caption, fontWeight: d.level === 'command' ? 800 : 700, color: 'text.primary', ...figures }}>
        {percent}%
      </Box>
    </Box>
  );
}

/** The state (icon and word, in the suite's colours) with Late beside it as an amber clock and the word. */
function Status({ state, late }: { state: RbmSuiteState; late: boolean }) {
  const { palette } = useTheme();
  const d = useDensity();
  const glyph = drawn[d.level].glyph;
  const fontSize = d.level === 'dense' ? d.caption : d.body;
  const word = (icon: Parameters<typeof RbmIcon>[0]['name'], label: string, color: string) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color, fontSize, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <RbmIcon name={icon} size={glyph} />
      {label}
    </Box>
  );
  const style = suiteStates[state];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
      {word(`state.${state}`, style.label, style.text)}
      {/* The suite has no Late icon: the clock is the Pending state's drawing, as on the board. */}
      {late && word('state.pending', 'Late', palette.status.atRisk.text)}
    </Box>
  );
}

/** A count, right-aligned. An open issue count has its severity dot; a zero is plain grey with no dot. */
function Count({ value, bold, severity }: { value: number; bold?: boolean; severity?: 'high' | 'medium' | 'low' }) {
  const { palette } = useTheme();
  const d = useDensity();
  const s = palette.status;
  const mark = severity && { high: s.blocked, medium: s.atRisk, low: s.pending }[severity];
  if (mark && value > 0) {
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', fontSize: d.caption, fontWeight: 700, color: mark.text, ...figures }}>
        <Box component="span" data-testid={`rbm-issue-dot-${severity}`} sx={{ width: d.dot, height: d.dot, borderRadius: '50%', bgcolor: mark.signal, flex: 'none' }} />
        {value}
      </Box>
    );
  }
  return (
    <Box component="span" sx={{ textAlign: 'right', fontSize: d.caption, fontWeight: bold ? 700 : 400, color: severity ? 'text.secondary' : 'text.primary', ...figures }}>
      {value}
    </Box>
  );
}

function When({ date, timeZone }: { date: Date; timeZone?: string }) {
  const d = useDensity();
  return (
    <Box component="span" sx={{ fontSize: d.caption, color: 'text.primary', whiteSpace: 'nowrap', ...figures }}>
      {formatWhen(date, timeZone)}
    </Box>
  );
}

function Row({ item, timeZone }: { item: RbmExecProgressItem; timeZone?: string }) {
  const d = useDensity();
  const size = drawn[d.level];
  const percent = percentComplete(item.complete, item.total);
  const name = (
    <Box component="span" title={item.name} sx={{ fontSize: d.body, fontWeight: d.level === 'command' ? 700 : 600, color: 'text.primary', ...ellipsis }}>
      {item.name}
    </Box>
  );
  const owner = <RbmAvatar name={item.owner.name} initials={item.owner.initials} size={size.avatar} decorative />;
  const counts = (
    <>
      <Count value={item.complete} />
      <Count value={item.total - item.complete} />
      <Count value={item.total} bold />
    </>
  );
  const issues = (
    <>
      <Count value={item.issues.high} severity="high" />
      <Count value={item.issues.medium} severity="medium" />
      <Count value={item.issues.low} severity="low" />
    </>
  );

  let cells: ReactNode;
  if (d.level === 'command') {
    cells = (
      <>
        {name}
        <Bar percent={percent} complete={item.state === 'complete'} />
        <Status state={item.state} late={item.late} />
      </>
    );
  } else if (d.level === 'comfortable') {
    cells = (
      <>
        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          {name}
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: d.caption, color: 'text.secondary', ...ellipsis }}>
            {owner}
            {item.owner.name}
          </Box>
        </Box>
        <Bar percent={percent} complete={item.state === 'complete'} />
        {counts}
        {issues}
        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: 1.2 }}>
          <When date={item.start} timeZone={timeZone} />
          <When date={item.end} timeZone={timeZone} />
        </Box>
        <Status state={item.state} late={item.late} />
      </>
    );
  } else if (d.level === 'compact') {
    cells = (
      <>
        {name}
        <Bar percent={percent} complete={item.state === 'complete'} />
        {owner}
        {counts}
        {issues}
        <When date={item.start} timeZone={timeZone} />
        <When date={item.end} timeZone={timeZone} />
        <Status state={item.state} late={item.late} />
      </>
    );
  } else {
    cells = (
      <>
        {name}
        <Bar percent={percent} complete={item.state === 'complete'} />
        <Box component="span" sx={{ textAlign: 'right', fontSize: d.caption, color: 'text.primary', ...figures }}>
          {item.complete} / {item.total}
        </Box>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
          {issues}
        </Box>
        {owner}
        <When date={item.end} timeZone={timeZone} />
        <Status state={item.state} late={item.late} />
      </>
    );
  }

  return (
    <Box component="li" sx={{ position: 'relative', listStyle: 'none' }}>
      {/* The progress bar carries the whole row for a screen reader; the cells are for the eye. */}
      <Box role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={execProgressSummary(item, timeZone)} sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <Box aria-hidden="true">
        <Grid>{cells}</Grid>
      </Box>
    </Box>
  );
}

function LoadingRow() {
  const d = useDensity();
  const block = (width: number | string, height = 12) => <Box component="span" sx={{ display: 'block', width, height, borderRadius: '6px', bgcolor: 'divider' }} />;
  const widths: Record<DensityLevel, (number | string)[]> = {
    command: [180, '100%', 120],
    comfortable: [110, '100%', 24, 24, 24, 20, 20, 20, 70, 90],
    compact: [110, '100%', 24, 24, 24, 24, 20, 20, 20, 60, 60, 80],
    dense: [100, '100%', 50, 80, 20, 60, 80],
  };
  return (
    <Box component="li" aria-hidden="true" sx={{ listStyle: 'none' }}>
      <Grid>{widths[d.level].map((w, i) => <span key={i}>{block(w, i === 1 ? drawn[d.level].bar : 12)}</span>)}</Grid>
    </Box>
  );
}

/**
 * Executive progress: for each item (a workstream, a runbook), how far it has got, its tasks, its open issues by
 * severity, its owner, its start and end, its state and whether it is late. The shared card behind
 * RbmWorkstreamProgress and RbmRunbookProgress, for the Executive Briefing Centre (Progress board, Proposed; one
 * component decided by Andy Smith, 27 Oct 2026). Ordered by start time, ten rows at most, no click-through. Density
 * comes from the region (RbmDensity): D0 shows Essential only; D1 and D2 show all; D3 is one line.
 */
export function RbmExecProgress({ items, title, noun, nameWidth = DEFAULT_NAME_WIDTH, loading = false, timeZone }: RbmExecProgressProps) {
  const id = useId();
  const d = useDensity();
  const size = drawn[d.level];
  const columns = `${d.level === 'command' ? COMMAND_NAME_WIDTH : nameWidth[d.level]}px ${size.rest}`;
  const sorted = [...items].sort(byStart);
  const shown = sorted.slice(0, EXEC_PROGRESS_ROW_LIMIT);
  const more = sorted.length - shown.length;
  const empty = !loading && items.length === 0;
  const caption = loading ? 'Ordered by start time' : empty ? '' : `Ordered by start time · ${shown.length} of ${sorted.length} shown`;
  const twoLevel = d.level === 'comfortable' || d.level === 'compact';

  return (
    <ColumnsContext.Provider value={columns}>
      <Box
        component="section"
        aria-labelledby={id}
        aria-busy={loading || undefined}
        sx={{ border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', py: '20px', px: `${d.padX}px`, minWidth: 0 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4, mb: 3 }}>
          <Box component="h3" id={id} sx={{ m: 0, fontSize: size.title, lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.01em', color: 'text.primary' }}>
            {title}
          </Box>
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
            {caption}
          </Box>
        </Box>

        {empty ? (
          <Box sx={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: d.body, color: 'text.secondary' }}>No {noun.many} yet.</Box>
        ) : (
          <>
            <Box aria-hidden="true">
              {twoLevel && <GroupHeader />}
              <Grid header>
                {headingsFor(noun)[d.level].map((h) => (
                  <Box component="span" key={h.label} sx={{ textAlign: h.align ?? 'left', ...ellipsis }}>
                    {h.label}
                  </Box>
                ))}
              </Grid>
            </Box>
            {loading ? (
              <Box component="ul" sx={{ m: 0, p: 0 }}>
                <Box component="li" sx={visuallyHidden}>
                  Loading {noun.many}
                </Box>
                <LoadingRow />
                <LoadingRow />
                <LoadingRow />
              </Box>
            ) : (
              <Box component="ul" aria-labelledby={id} sx={{ m: 0, p: 0 }}>
                {shown.map((item) => (
                  <Row key={item.id} item={item} timeZone={timeZone} />
                ))}
              </Box>
            )}
            {!loading && more > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', height: d.row, px: 1, fontSize: d.body, color: 'text.secondary' }}>
                +{more} more {more === 1 ? noun.one : noun.many}
              </Box>
            )}
          </>
        )}
      </Box>
    </ColumnsContext.Provider>
  );
}
