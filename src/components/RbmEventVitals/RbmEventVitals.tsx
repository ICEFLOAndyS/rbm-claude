import { Box, ButtonBase, useTheme } from '@mui/material';
import { useId, type ReactNode } from 'react';
import { colour, hairline, radius, stroke, type DensityLevel } from '../../theme/tokens';
import { hitTarget, useDensity } from '../../theme/RbmDensity';
import { RbmRing } from './RbmRing';

/** The event RAG status. The RBM planning engine sets it; the page displays it and never works it out. */
export type RbmRag = 'green' | 'amber' | 'red';

/** Data from the RBM planning engine for one Event. ServiceNow attribute names are bound later. */
export interface RbmEventVitalsData {
  /** Work done and to do, in minutes: each task's effective duration (planned, forecast or actual). From the Planning engine. */
  work: { doneMinutes: number; todoMinutes: number };
  /** The Event is Complete: Work Progress turns Brand Green, with a tick and the word. */
  eventComplete: boolean;
  /** Task counts: Task progress measures tasks, not Work. */
  tasks: { complete: number; active: number; blocked: number; total: number };
  /** Open issues by severity. */
  issues: { high: number; medium: number; low: number };
  start: { time: Date; elapsedMinutes: number; plannedMinutes: number };
  forecast: {
    end: Date;
    plannedEnd: Date;
    rag: RbmRag;
    /** The gap to plan in minutes, from the engine: positive is behind, negative is ahead. */
    gapMinutes: number;
  };
}

export interface RbmEventVitalsProps {
  data: RbmEventVitalsData;
  /** Grey blocks in every card while the data loads, announced as loading. */
  loading?: boolean;
  /** IANA time zone for the times, for example "Europe/London". Defaults to the browser's. */
  timeZone?: string;
  /** Each card is a link when given a handler. Work Progress and Task progress open the task list. */
  onOpenWork?: () => void;
  onOpenProgress?: () => void;
  /** Opens the issue list in the slide-in. */
  onOpenIssues?: () => void;
  /** Not drawn: what Start of event opens. It is a link only when given a handler. */
  onOpenStart?: () => void;
  /** Opens the late tasks and the critical path. */
  onOpenForecast?: () => void;
  /** Shown only when the user may raise issues; permissions come from the platform. */
  onRaiseIssue?: () => void;
}

/** The narrowest a card may be. Below five of these (with the gaps) the row wraps 3 + 2, then 2 + 2 + 1. */
export const VITALS_CARD_MIN_WIDTH = 185;

const pad = (n: number) => String(n).padStart(2, '0');

/** Minutes as hh:mm, for example 340 gives "05:40". */
export function formatDuration(minutes: number) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Work in hours and minutes: "18 h 30 min", "11 h", "45 min", "0 min". */
export function formatWork(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

/**
 * Work progress, derived: done ÷ (done + to do), to the nearest whole percent, but never 100% while any work is left
 * and never 0% once any is done (to confirm). Null when there is no work at all ("No work planned").
 */
export function workPercent({ doneMinutes, todoMinutes }: RbmEventVitalsData['work']): number | null {
  const total = doneMinutes + todoMinutes;
  if (total <= 0) return null;
  const p = Math.round((doneMinutes / total) * 100);
  if (todoMinutes > 0 && p >= 100) return 99;
  if (doneMinutes > 0 && p <= 0) return 1;
  return p;
}

/** The Work Progress bar's accessible name: "Work Progress, 62%, 18 h 30 min done, 11 h 15 min to do" (", Complete"). */
export function workSummary(work: RbmEventVitalsData['work'], complete: boolean) {
  const p = workPercent(work);
  if (p === null) return 'Work Progress, no work planned yet';
  return `Work Progress, ${p}%, ${formatWork(work.doneMinutes)} done, ${formatWork(work.todoMinutes)} to do${complete ? ', Complete' : ''}`;
}

/** The gap in words: "On Schedule", "+12 min Behind Schedule", "−08 min Ahead of Schedule". */
export function formatGap(minutes: number) {
  if (minutes === 0) return 'On Schedule';
  return minutes > 0 ? `+${pad(minutes)} min Behind Schedule` : `−${pad(-minutes)} min Ahead of Schedule`;
}

function timeOf(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

/**
 * Sizes drawn for the five-card row (Command board, version 136), by density. They are smaller than the density's KPI
 * figure token so five cards fit at the 185 px minimum (flagged). Work Progress is drawn at every density; the other
 * cards only at D1, so they follow the same figure size elsewhere (not drawn).
 */
const drawn: Record<DensityLevel, { padY: number; padX: number; gap: number; figure: number; forecast: number }> = {
  command: { padY: 20, padX: 18, gap: 12, figure: 44, forecast: 44 },
  comfortable: { padY: 16, padX: 14, gap: 8, figure: 32, forecast: 34 },
  compact: { padY: 12, padX: 12, gap: 8, figure: 28, forecast: 30 },
  dense: { padY: 8, padX: 12, gap: 8, figure: 20, forecast: 22 },
};

/** Read by screen readers, not shown. In sx, width: 1 would mean 100%: the size is given in px. */
const visuallyHidden = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const;

function Eyebrow({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <Box component="h3" id={id} sx={{ m: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}

function Figure({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Box component="span" sx={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums', color: 'text.primary', whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}

/** A right-aligned line at the foot of the card (Start of event and Forecast end time; Andy Smith, 26 Oct 2026). */
function Footnote({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ fontSize: 13, color: 'text.secondary', mt: 'auto', textAlign: 'right', '& strong': { color: 'text.primary' } }}>
      {children}
    </Box>
  );
}

/** A grey block standing in for content while loading. */
const Block = ({ w, h }: { w: number | string; h: number }) => <Box component="span" sx={{ display: 'block', width: w, height: h, borderRadius: h <= 8 ? `${radius.pill}px` : '8px', bgcolor: hairline, flex: w === '100%' ? 'none' : undefined }} />;

/**
 * A vitals card: a region named by its heading. When it opens something, a button stretched over the card makes the
 * whole card the link, so a button inside it (Raise issue) stays its own control.
 */
function Card({ label, action, onOpen, openLabel, row, loading, children }: { label: string; action?: ReactNode; onOpen?: () => void; openLabel: string; row?: boolean; loading?: boolean; children: ReactNode }) {
  const id = useId();
  const { level } = useDensity();
  const size = drawn[level];
  return (
    <Box
      component="section"
      aria-labelledby={id}
      aria-busy={loading || undefined}
      sx={{
        position: 'relative',
        border: 1,
        borderColor: 'divider',
        borderRadius: `${radius.card}px`,
        bgcolor: 'background.paper',
        px: `${size.padX}px`,
        py: `${size.padY}px`,
        display: 'flex',
        flexDirection: row ? 'row' : 'column',
        alignItems: row ? 'center' : undefined,
        gap: `${row ? 12 : size.gap}px`,
        minWidth: 0,
        boxSizing: 'border-box',
        lineHeight: 'normal',
        ...(row && { height: 40 }),
      }}
    >
      {onOpen && <ButtonBase aria-label={openLabel} onClick={onOpen} sx={{ position: 'absolute', inset: 0, borderRadius: `${radius.card}px` }} />}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, minWidth: 0 }}>
        <Eyebrow id={id}>{label}</Eyebrow>
        {!loading && action}
      </Box>
      {loading ? (
        <>
          <Box component="span" sx={visuallyHidden}>
            Loading {label}
          </Box>
          <Block w={80} h={row ? 20 : size.figure} />
          {!row && <Block w="100%" h={8} />}
          {!row && level !== 'command' && (
            <Box component="span" sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 1 }}><Block w="100%" h={30} /></Box>
              <Box sx={{ flex: 1 }}><Block w="100%" h={30} /></Box>
            </Box>
          )}
        </>
      ) : (
        children
      )}
    </Box>
  );
}

/** The drawn legend: 12 px text at every density (so it fits the 185 px card), 8 px dots, the figures in bold (a definition list). */
function Legend({ rows }: { rows: { mark: ReactNode; label: string; value: number; colour: string }[] }) {
  const fontSize = 12;
  return (
    <Box component="dl" sx={{ m: 0, display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
      {rows.map((r) => (
        <Box key={r.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, fontSize }}>
          <Box component="dt" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: r.colour, whiteSpace: 'nowrap' }}>
            {r.mark}
            {r.label}
          </Box>
          <Box component="dd" sx={{ m: 0, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {r.value}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

const DOT = 8;
const dot = (bg: string) => <Box component="span" aria-hidden="true" sx={{ width: DOT, height: DOT, borderRadius: '50%', bgcolor: bg, flex: 'none' }} />;

function Icon({ d, size, stroke, width }: { d: ReactNode; size: number; stroke: string; width: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {d}
    </svg>
  );
}

// The disc tint behind the clock, as drawn for each RAG state.
const discTint: Record<RbmRag, string> = {
  green: 'rgba(132,204,22,0.28)',
  amber: 'rgba(255,159,28,0.30)',
  red: 'rgba(240,0,52,0.14)',
};

/** Work Progress: the share of Work done, a bar, and Done and To do in hours and minutes. No Late indicator. */
function WorkProgress({ work, complete }: { work: RbmEventVitalsData['work']; complete: boolean }) {
  const { palette } = useTheme();
  const { level } = useDensity();
  const size = drawn[level];
  const percent = workPercent(work);
  const s = palette.status;
  // D0 and D3 show the percentage alone (Essential only); D3 is one line, without the bar.
  const oneLine = level === 'dense';
  if (percent === null) {
    return (
      <>
        <Box component="span" aria-label="No percentage" sx={{ fontSize: oneLine ? 20 : size.figure, fontWeight: 800, lineHeight: 1.05, color: 'text.secondary', ml: oneLine ? 'auto' : undefined }}>
          –
        </Box>
        {!oneLine && <Box component="span" aria-hidden="true" sx={{ height: 8, borderRadius: `${radius.pill}px`, bgcolor: 'divider' }} />}
        {!oneLine && (
          <Box component="span" sx={{ fontSize: 13, color: 'text.secondary', mt: 'auto' }}>
            No work planned yet.
          </Box>
        )}
      </>
    );
  }
  const bar = (
    <Box
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={workSummary(work, complete)}
      sx={oneLine ? visuallyHidden : { height: 8, borderRadius: `${radius.pill}px`, bgcolor: 'divider', overflow: 'hidden' }}
    >
      {/* Blue Dark while under way; Brand Green only when the Event is Complete (decided). */}
      <Box data-testid="rbm-work-fill" data-fill={complete ? 'complete' : 'active'} sx={{ width: `${percent}%`, height: '100%', bgcolor: complete ? s.complete.signal : s.active.signal }} />
    </Box>
  );
  if (oneLine) {
    return (
      <>
        <Box component="span" sx={{ ml: 'auto', fontSize: 20, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'text.primary' }}>
          {percent}%
        </Box>
        {bar}
      </>
    );
  }
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
        <Figure size={size.figure}>{percent}%</Figure>
        {complete && (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: 13, fontWeight: 700, color: s.complete.text, whiteSpace: 'nowrap' }}>
            <Icon d={<path d="M5 12.5l4.5 4.5L19 7" />} size={16} stroke={s.complete.text} width={2.5} />
            Complete
          </Box>
        )}
      </Box>
      {bar}
      {level !== 'command' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', mt: 'auto' }}>
          {[
            ['Done', work.doneMinutes],
            ['To do', work.todoMinutes],
          ].map(([label, minutes]) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, fontSize: 12 }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {label}
              </Box>
              <Box component="strong" sx={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {formatWork(minutes as number)}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}

/**
 * Event vitals: Work Progress, Task progress, Issues, Start of event and Forecast end time, five equal cards from
 * context to consequence (Command board, version 136). A universal region: it shows one Event's data and assumes no
 * particular Centre. The grid sets every card's width, the same at every density; below 185 px a card wraps to the
 * next line, in equal widths (3 + 2, then 2 + 2 + 1). The cards stretch to one height.
 */
export function RbmEventVitals({ data, loading = false, timeZone, onOpenWork, onOpenProgress, onOpenIssues, onOpenStart, onOpenForecast, onRaiseIssue }: RbmEventVitalsProps) {
  const { palette } = useTheme();
  const d = useDensity();
  const size = drawn[d.level];
  const s = palette.status;
  const { work, tasks, issues, start, forecast } = data;
  const taskPercent = tasks.total > 0 ? Math.round((tasks.complete / tasks.total) * 100) : 0;
  const open = issues.high + issues.medium + issues.low;
  const ragText: Record<RbmRag, string> = { green: s.complete.text, amber: s.atRisk.text, red: s.blocked.text };
  const rag = ragText[forecast.rag];
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone }).format(start.time).toUpperCase();
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone }).format(start.time);

  const gapIcon =
    forecast.gapMinutes === 0 ? (
      <path d="M5 12.5l4.5 4.5L19 7" />
    ) : forecast.gapMinutes > 0 ? (
      <path d="M7 17L17 7M9 7h8v8" />
    ) : (
      // Not drawn: the arrow for ahead of schedule, mirrored from the behind arrow.
      <path d="M7 7l10 10M17 9v8H9" />
    );

  const ring = { size: 60, centreSize: 16 };

  return (
    <Box
      data-testid="rbm-vitals-row"
      aria-busy={loading || undefined}
      sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${VITALS_CARD_MIN_WIDTH}px), 1fr))`, gap: `${d.gap}px`, alignItems: 'stretch' }}
    >
      <Card label="Work Progress" onOpen={onOpenWork} openLabel="Open the task list" row={d.level === 'dense'} loading={loading}>
        <WorkProgress work={work} complete={data.eventComplete} />
      </Card>

      <Card label="Task progress" onOpen={onOpenProgress} openLabel="Open the task list" loading={loading}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <RbmRing
            {...ring}
            total={tasks.total}
            centre={`${taskPercent}%`}
            segments={[
              { value: tasks.complete, colour: s.complete.signal },
              { value: tasks.active, colour: s.active.signal },
              { value: tasks.blocked, colour: s.blocked.signal },
            ]}
          />
          <Legend
            rows={[
              { mark: dot(s.complete.signal), label: 'Complete', value: tasks.complete, colour: s.complete.text },
              { mark: dot(s.active.signal), label: 'In progress', value: tasks.active, colour: s.active.text },
              { mark: dot(s.blocked.signal), label: 'Blocked', value: tasks.blocked, colour: s.blocked.text },
              { mark: dot('transparent'), label: 'Total', value: tasks.total, colour: palette.text.secondary },
            ]}
          />
        </Box>
      </Card>

      <Card
        label="Issues"
        onOpen={onOpenIssues}
        openLabel="Open the issue list"
        loading={loading}
        action={
          onRaiseIssue && (
            <ButtonBase onClick={onRaiseIssue} sx={{ ...hitTarget(d.target), position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'primary.light', whiteSpace: 'nowrap', borderRadius: 1 }}>
              <Icon d={<path d="M12 5v14M5 12h14" />} size={14} stroke="currentColor" width={2.5} />
              Raise issue
            </ButtonBase>
          )
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <RbmRing
            {...ring}
            total={open}
            centre={String(open)}
            segments={[
              { value: issues.high, colour: s.blocked.signal },
              { value: issues.medium, colour: s.atRisk.signal },
              { value: issues.low, colour: s.pending.signal },
            ]}
          />
          <Legend
            rows={[
              { mark: dot(s.blocked.signal), label: 'High', value: issues.high, colour: s.blocked.text },
              {
                mark: (
                  <Box component="span" aria-hidden="true" sx={{ width: DOT + 4, height: DOT + 4, borderRadius: '50%', bgcolor: s.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Box component="span" sx={{ width: DOT, height: DOT, borderRadius: '50%', bgcolor: s.atRisk.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
                  </Box>
                ),
                label: 'Medium',
                value: issues.medium,
                colour: s.atRisk.text,
              },
              { mark: dot(s.pending.signal), label: 'Low', value: issues.low, colour: s.pending.text },
              { mark: dot('transparent'), label: 'Open', value: open, colour: palette.text.secondary },
            ]}
          />
        </Box>
      </Card>

      <Card label="Start of event" onOpen={onOpenStart} openLabel="Open the event start" loading={loading}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minHeight: 60 }}>
          <Box component="span" aria-hidden="true" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 42, border: `${stroke.thin}px solid ${colour.silver}`, borderRadius: '10px', overflow: 'hidden', flex: 'none' }}>
            <Box component="span" sx={{ width: '100%', textAlign: 'center', bgcolor: 'primary.main', color: colour.white, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', py: '2px' }}>
              {month}
            </Box>
            <Box component="span" sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', lineHeight: 1.3 }}>
              {day}
            </Box>
          </Box>
          <Box component="span" sx={visuallyHidden}>
            {`${day} ${month.charAt(0)}${month.slice(1).toLowerCase()}, `}
          </Box>
          <Box sx={{ ml: 'auto', alignSelf: 'flex-start' }}>
            <Figure size={size.figure}>{timeOf(start.time, timeZone)}</Figure>
          </Box>
        </Box>
        <Footnote>
          Elapsed <strong>{formatDuration(start.elapsedMinutes)}</strong> of {formatDuration(start.plannedMinutes)}
        </Footnote>
      </Card>

      <Card label="Forecast end time" onOpen={onOpenForecast} openLabel="Open the late tasks and the critical path" loading={loading}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, minHeight: 48 }}>
          <Box component="span" aria-hidden="true" data-testid="rbm-rag-disc" data-rag={forecast.rag} sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: discTint[forecast.rag], display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} size={26} stroke={rag} width={2} />
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Figure size={size.forecast}>{timeOf(forecast.end, timeZone)}</Figure>
          </Box>
        </Box>
        {/* Under the time, so it fits the narrower card (was beside it). */}
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', fontSize: 13, fontWeight: 700, color: rag, whiteSpace: 'nowrap' }}>
          <Icon d={gapIcon} size={16} stroke={rag} width={2.5} />
          {formatGap(forecast.gapMinutes)}
        </Box>
        <Footnote>
          Planned end <strong>{timeOf(forecast.plannedEnd, timeZone)}</strong>
        </Footnote>
      </Card>
    </Box>
  );
}
