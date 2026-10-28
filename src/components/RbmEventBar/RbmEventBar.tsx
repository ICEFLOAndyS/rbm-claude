import { Box, ButtonBase, Slide, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { RbmStatusPill } from '../RbmStatusPill/RbmStatusPill';
import { RbmAlertCounter, type RbmAlert } from '../RbmAlertCounter/RbmAlertCounter';
import { workPercent, type RbmEventVitalsData, type RbmRag } from '../RbmEventVitals/RbmEventVitals';
import { colour, density, radius, stroke, type RbmState } from '../../theme/tokens';
import { hitTarget, useDensity } from '../../theme/RbmDensity';

export interface RbmEventSummary {
  /** The event number, for example "REV000001". */
  number: string;
  name: string;
  state: RbmState;
}

export interface RbmEventBarProps {
  event: RbmEventSummary;
  /** The same data the Event vitals show: one key fact from each card. */
  vitals: RbmEventVitalsData;
  alerts: RbmAlert[];
  /** Shown only while the Event vitals are off screen, so nothing is shown twice. */
  visible: boolean;
  timeZone?: string;
  /** Each fact is a link when given a handler: Work and Tasks to the task list, Issues to the issue list, Forecast to the late tasks and critical path. */
  onOpenWork?: () => void;
  onOpenProgress?: () => void;
  onOpenIssues?: () => void;
  /** Not drawn: what Started opens, as on the Start of event card. A link only when given a handler. */
  onOpenStart?: () => void;
  onOpenForecast?: () => void;
  /** The chevron scrolls back to the top. */
  onBackToTop?: () => void;
}

function timeOf(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "+12 min", "−08 min" or "On Schedule". */
export function barGap(minutes: number) {
  if (minutes === 0) return 'On Schedule';
  return minutes > 0 ? `+${pad(minutes)} min` : `−${pad(-minutes)} min`;
}

const discTint: Record<RbmRag, string> = { green: 'rgba(132,204,22,0.28)', amber: 'rgba(255,159,28,0.30)', red: 'rgba(240,0,52,0.14)' };

/** The bars in the bar: 56 px by 8 px, as drawn. */
const BAR_WIDTH = 56;

/**
 * One key fact. With a handler it is a link, one tab stop named for the whole fact; without one it is plain text,
 * and its bar (if any) is a progress bar carrying the same name.
 */
function Fact({ label, onClick, progress, children }: { label: string; onClick?: () => void; progress?: number; children: ReactNode }) {
  const d = useDensity();
  const sx = { display: 'inline-flex', alignItems: 'center', gap: 2, fontFamily: 'inherit', whiteSpace: 'nowrap', color: 'inherit', flex: 'none' } as const;
  if (onClick) {
    return (
      <ButtonBase onClick={onClick} aria-label={label} sx={{ ...sx, borderRadius: 1, ...hitTarget(d.target) }}>
        {children}
      </ButtonBase>
    );
  }
  return (
    <Box
      component="span"
      {...(progress !== undefined ? { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress, 'aria-label': label } : { role: 'group', 'aria-label': label })}
      sx={sx}
    >
      {children}
    </Box>
  );
}

/** A short visible label: "Work", "Tasks", "Started". */
function Label({ children }: { children: ReactNode }) {
  const { caption } = useDensity();
  return (
    <Box component="span" aria-hidden="true" sx={{ fontSize: caption, color: 'text.secondary' }}>
      {children}
    </Box>
  );
}

/** A figure in the bar: the body size (14 px at D2, as drawn), bold, tabular. */
function Value({ children }: { children: ReactNode }) {
  const { body } = useDensity();
  return (
    <Box component="span" aria-hidden="true" sx={{ fontSize: body, fontWeight: 800, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </Box>
  );
}

function Track({ children }: { children: ReactNode }) {
  return (
    <Box component="span" aria-hidden="true" sx={{ width: BAR_WIDTH, height: 8, borderRadius: `${radius.pill}px`, bgcolor: 'divider', overflow: 'hidden', display: 'flex', flex: 'none' }}>
      {children}
    </Box>
  );
}

/**
 * The bar's height at a density: the FORECAST END eyebrow over the time at the KPI figure size, with
 * 4 px above and below. 56 px at D2 (drawn 48 px with a 20 px time; grown to the D2 figure size by
 * Andy Smith, 22 Oct 2026, to assess the visual impact).
 */
export const eventBarHeight = (d: { caption: number; figure: number }) => Math.ceil(d.caption * 1.15 + d.figure * 1.05) + 8;

/** The bar's height in the Command Centre, where it is a D2 Compact region. Regions pinned under it use it. */
export const EVENT_BAR_HEIGHT = eventBarHeight(density.compact);

/**
 * The Compact event bar (Command board, "Compact event bar, one key fact for each vital", version 136): pinned at the
 * top once the Event vitals scroll away. The Event's number and name, its state, the alert counter, then one key fact
 * for each Event vital: Work, Tasks, open issues, Started and Forecast end. A universal region: it takes the same
 * RbmEventVitalsData as the Event vitals and assumes no particular Centre.
 */
export function RbmEventBar({ event, vitals, alerts, visible, timeZone, onOpenWork, onOpenProgress, onOpenIssues, onOpenStart, onOpenForecast, onBackToTop }: RbmEventBarProps) {
  const { palette } = useTheme();
  // The bar is a D2 Compact region; it is as tall as its forecast time at the D2 figure size needs.
  const d = useDensity();
  const s = palette.status;
  const { work, tasks, issues, start, forecast } = vitals;
  const share = (n: number) => (tasks.total > 0 ? (n / tasks.total) * 100 : 0);
  const taskPercent = Math.round(share(tasks.complete));
  const workShare = workPercent(work);
  const open = issues.high + issues.medium + issues.low;
  const ragText: Record<RbmRag, string> = { green: s.complete.text, amber: s.atRisk.text, red: s.blocked.text };
  // Proposed, not drawn (21 Oct): the dot follows the worst open issue, and is left out when there are none.
  const worst = issues.high > 0 ? 'high' : issues.medium > 0 ? 'medium' : issues.low > 0 ? 'low' : undefined;
  const started = timeOf(start.time, timeZone);
  const forecastTime = timeOf(forecast.end, timeZone);

  return (
    <Slide in={visible} direction="down" mountOnEnter unmountOnExit>
      <Box
        component="header"
        aria-label="Event summary"
        sx={{ display: 'flex', alignItems: 'center', gap: `${d.gap}px`, height: eventBarHeight(d), px: `${d.padX}px`, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', boxShadow: '0 4px 12px rgba(35,50,111,0.10)', boxSizing: 'border-box', lineHeight: 'normal', overflow: 'hidden' }}
      >
        {/* The name gives way first: it is cut with an ellipsis, so the facts stay on one line. */}
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexShrink: 1 }}>
          <Box component="span" sx={{ fontSize: d.caption, fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em' }}>{event.number}</Box>
          <Box component="span" title={event.name} sx={{ fontSize: d.body, fontWeight: 800, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.name}</Box>
        </Box>
        <Box sx={{ flex: 'none' }}><RbmStatusPill state={event.state} size="compact" /></Box>
        <Box sx={{ flex: 'none' }}><RbmAlertCounter alerts={alerts} size="compact" /></Box>
        <Box aria-hidden="true" sx={{ width: '1px', height: 24, bgcolor: 'divider', flex: 'none' }} />

        {/* Work Progress: Blue Dark until the Event is Complete, then Brand Green. */}
        <Fact label={workShare === null ? 'Work Progress, no work planned yet' : `Work Progress, ${workShare}%${vitals.eventComplete ? ', Complete' : ''}`} onClick={onOpenWork} progress={workShare ?? undefined}>
          <Label>Work</Label>
          <Track>
            <Box component="span" data-testid="rbm-bar-work-fill" data-fill={vitals.eventComplete ? 'complete' : 'active'} sx={{ width: `${workShare ?? 0}%`, bgcolor: vitals.eventComplete ? s.complete.signal : s.active.signal }} />
          </Track>
          <Value>{workShare === null ? '–' : `${workShare}%`}</Value>
        </Fact>

        {/* Task progress: the segmented bar of the earlier design. */}
        <Fact label={`Task progress, ${taskPercent}%`} onClick={onOpenProgress} progress={taskPercent}>
          <Label>Tasks</Label>
          <Track>
            <Box component="span" data-testid="rbm-bar-task-segment" sx={{ width: `${share(tasks.complete)}%`, bgcolor: s.complete.signal }} />
            <Box component="span" data-testid="rbm-bar-task-segment" sx={{ width: `${share(tasks.active)}%`, bgcolor: s.active.signal }} />
            <Box component="span" data-testid="rbm-bar-task-segment" sx={{ width: `${share(tasks.blocked)}%`, bgcolor: s.blocked.signal }} />
          </Track>
          <Value>{taskPercent}%</Value>
        </Fact>

        <Fact label={`Open issues, ${open}${worst ? `, ${issues[worst]} ${worst}` : ''}`} onClick={onOpenIssues}>
          <Box component="span" aria-hidden="true" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
            {worst === 'medium' ? (
              <Box component="span" data-testid="rbm-bar-issue-dot" data-severity="medium" sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.atRisk.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
              </Box>
            ) : worst ? (
              <Box component="span" data-testid="rbm-bar-issue-dot" data-severity={worst} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: worst === 'high' ? s.blocked.signal : s.pending.signal, flex: 'none' }} />
            ) : null}
            <Value>{open}</Value>
            <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary' }}>{open === 1 ? 'issue' : 'issues'}</Box>
          </Box>
        </Fact>

        <Fact label={`Start of event, ${started}`} onClick={onOpenStart}>
          <Label>Started</Label>
          <Value>{started}</Value>
        </Fact>

        <Box sx={{ flex: 1 }} />

        <Fact label={`Forecast end time, ${forecastTime}, ${barGap(forecast.gapMinutes)}`} onClick={onOpenForecast}>
          <Box component="span" aria-hidden="true" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2.5 }}>
            <Box component="span" data-rag={forecast.rag} sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: discTint[forecast.rag], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={ragText[forecast.rag]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </Box>
            <Box component="span" sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, textAlign: 'left' }}>
              <Box component="span" sx={{ fontSize: d.caption, fontWeight: 700, letterSpacing: '0.08em', color: 'text.secondary' }}>FORECAST END</Box>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
                {/* A KPI figure, at the density's figure size (32 px at D2; drawn 20). */}
                <Box component="span" sx={{ fontSize: d.figure, lineHeight: 1.05, fontWeight: 800, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{forecastTime}</Box>
                <Box component="span" sx={{ fontSize: d.caption, fontWeight: 700, color: ragText[forecast.rag] }}>{barGap(forecast.gapMinutes)}</Box>
              </Box>
            </Box>
          </Box>
        </Fact>

        <ButtonBase onClick={onBackToTop} aria-label="Back to the top of the page" sx={{ borderRadius: 1, color: 'primary.main', flex: 'none', ...hitTarget(d.target) }}>
          <svg width={d.icon} height={d.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M6 15l6-6 6 6" />
          </svg>
        </ButtonBase>
      </Box>
    </Slide>
  );
}
