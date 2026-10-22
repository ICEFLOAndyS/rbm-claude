import { Box, ButtonBase, useTheme } from '@mui/material';
import { useId, type ReactNode } from 'react';
import { colour, radius, stroke } from '../../theme/tokens';
import { hitTarget, ringSize, useDensity } from '../../theme/RbmDensity';
import { RbmRing } from './RbmRing';

/** The event RAG status. The RBM planning engine sets it; the page displays it and never works it out. */
export type RbmRag = 'green' | 'amber' | 'red';

/** Data from the RBM planning engine. ServiceNow attribute names are bound later. */
export interface RbmEventVitalsData {
  progress: { complete: number; active: number; blocked: number; total: number };
  /** Open issues by severity. */
  issues: { high: number; medium: number; low: number };
  start: { at: Date; elapsedMinutes: number; plannedMinutes: number };
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
  /** IANA time zone for the times, for example "Europe/London". Defaults to the browser's. */
  timeZone?: string;
  /** Each card is a link. Progress opens the task list. */
  onOpenProgress?: () => void;
  /** Opens the issue list in the slide-in. */
  onOpenIssues?: () => void;
  onOpenStart?: () => void;
  /** Opens the late tasks and the critical path. */
  onOpenForecast?: () => void;
  /** Shown only when the user may raise issues; permissions come from the platform. */
  onRaiseIssue?: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Minutes as hh:mm, for example 340 gives "05:40". */
export function formatDuration(minutes: number) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** The gap in words: "On Schedule", "+12 min Behind Schedule", "−08 min Ahead of Schedule". */
export function formatGap(minutes: number) {
  if (minutes === 0) return 'On Schedule';
  return minutes > 0 ? `+${pad(minutes)} min Behind Schedule` : `−${pad(-minutes)} min Ahead of Schedule`;
}

function timeOf(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

function Eyebrow({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <Box component="h3" id={id} sx={{ m: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
      {children}
    </Box>
  );
}

/** A KPI figure, at the density's figure size (40 px at D1; drawn 32 and 36). */
function Figure({ children }: { children: ReactNode }) {
  const { figure } = useDensity();
  return (
    <Box component="span" sx={{ fontSize: figure, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums', color: 'text.primary' }}>
      {children}
    </Box>
  );
}

function Footnote({ children }: { children: ReactNode }) {
  const { caption } = useDensity();
  return (
    <Box component="span" sx={{ fontSize: caption, color: 'text.secondary', '& strong': { color: 'text.primary' } }}>
      {children}
    </Box>
  );
}

/**
 * A vitals card. When it opens something, a button stretched over the card makes the
 * whole card the link, so a button inside it (Raise issue) stays its own control.
 */
function Card({ label, action, onOpen, openLabel, children }: { label: string; action?: ReactNode; onOpen?: () => void; openLabel: string; children: ReactNode }) {
  const id = useId();
  const d = useDensity();
  return (
    <Box
      component="section"
      aria-labelledby={id}
      sx={{ position: 'relative', border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', px: `${d.padX}px`, py: 4, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, lineHeight: 'normal' }}
    >
      {onOpen && <ButtonBase aria-label={openLabel} onClick={onOpen} sx={{ position: 'absolute', inset: 0, borderRadius: `${radius.card}px` }} />}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Eyebrow id={id}>{label}</Eyebrow>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function Legend({ rows }: { rows: { mark: ReactNode; label: string; value: number; colour: string }[] }) {
  const { caption } = useDensity();
  return (
    <Box component="dl" sx={{ m: 0, display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
      {rows.map((r) => (
        <Box key={r.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5, fontSize: caption }}>
          <Box component="dt" sx={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: r.colour }}>
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

/** A status dot at the density's dot size. */
function Dot({ bg }: { bg: string }) {
  const { dot: size } = useDensity();
  return <Box component="span" aria-hidden="true" sx={{ width: size, height: size, borderRadius: '50%', bgcolor: bg, flex: 'none' }} />;
}
const dot = (bg: string) => <Dot bg={bg} />;

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

/**
 * Event vitals: Progress, Issues, Start of event and Forecast end time, left to right
 * from context to consequence. Forecast end time is the most important number on the page.
 */
export function RbmEventVitals({ data, timeZone, onOpenProgress, onOpenIssues, onOpenStart, onOpenForecast, onRaiseIssue }: RbmEventVitalsProps) {
  const { palette } = useTheme();
  // The Event vitals are a D1 Comfortable region of the Command Centre.
  const d = useDensity();
  const s = palette.status;
  const { progress, issues, start, forecast } = data;
  const percent = progress.total > 0 ? Math.round((progress.complete / progress.total) * 100) : 0;
  const open = issues.high + issues.medium + issues.low;
  const ragText: Record<RbmRag, string> = { green: s.complete.text, amber: s.atRisk.text, red: s.blocked.text };
  const rag = ragText[forecast.rag];
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone }).format(start.at).toUpperCase();
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone }).format(start.at);

  const gapIcon =
    forecast.gapMinutes === 0 ? (
      <path d="M5 12.5l4.5 4.5L19 7" />
    ) : forecast.gapMinutes > 0 ? (
      <path d="M7 17L17 7M9 7h8v8" />
    ) : (
      // Not drawn: the arrow for ahead of schedule, mirrored from the behind arrow.
      <path d="M7 7l10 10M17 9v8H9" />
    );

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1.55fr 1.3fr 1fr 1.65fr', gap: 4 }}>
      <Card label="Progress" onOpen={onOpenProgress} openLabel="Open the task list">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5 }}>
          <RbmRing
            total={progress.total}
            centre={`${percent}%`}
            segments={[
              { value: progress.complete, colour: s.complete.signal },
              { value: progress.active, colour: s.active.signal },
              { value: progress.blocked, colour: s.blocked.signal },
            ]}
          />
          <Legend
            rows={[
              { mark: dot(s.complete.signal), label: 'Complete', value: progress.complete, colour: s.complete.text },
              { mark: dot(s.active.signal), label: 'In progress', value: progress.active, colour: s.active.text },
              { mark: dot(s.blocked.signal), label: 'Blocked', value: progress.blocked, colour: s.blocked.text },
              { mark: dot('transparent'), label: 'Total', value: progress.total, colour: palette.text.secondary },
            ]}
          />
        </Box>
      </Card>

      <Card
        label="Issues"
        onOpen={onOpenIssues}
        openLabel="Open the issue list"
        action={
          onRaiseIssue && (
            <ButtonBase onClick={onRaiseIssue} sx={{ ...hitTarget(d.target), position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 1, fontFamily: 'inherit', fontSize: d.caption, fontWeight: 700, color: 'primary.light', whiteSpace: 'nowrap', borderRadius: 1 }}>
              <Icon d={<path d="M12 5v14M5 12h14" />} size={14} stroke="currentColor" width={2.5} />
              Raise issue
            </ButtonBase>
          )
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5 }}>
          <RbmRing
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
                  <Box component="span" aria-hidden="true" sx={{ width: ringSize(d.dot), height: ringSize(d.dot), borderRadius: '50%', bgcolor: s.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Box component="span" sx={{ width: d.dot, height: d.dot, borderRadius: '50%', bgcolor: s.atRisk.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
                  </Box>
                ),
                label: 'Medium',
                value: issues.medium,
                colour: s.atRisk.text,
              },
              { mark: dot(s.pending.signal), label: 'Low', value: issues.low, colour: s.pending.text },
              { mark: <Box component="span" sx={{ width: 8 }} />, label: 'Open', value: open, colour: palette.text.secondary },
            ]}
          />
        </Box>
      </Card>

      <Card label="Start of event" onOpen={onOpenStart} openLabel="Open the event start">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box component="span" aria-hidden="true" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 42, border: `${stroke.thin}px solid ${colour.silver}`, borderRadius: '10px', overflow: 'hidden', flex: 'none' }}>
            <Box component="span" sx={{ width: '100%', textAlign: 'center', bgcolor: 'primary.main', color: colour.white, fontSize: d.caption, fontWeight: 800, letterSpacing: '0.08em', py: 0.5 }}>
              {month}
            </Box>
            <Box component="span" sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', lineHeight: 1.3 }}>
              {day}
            </Box>
          </Box>
          <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            {`${day} ${month.charAt(0)}${month.slice(1).toLowerCase()}, `}
          </Box>
          <Figure>{timeOf(start.at, timeZone)}</Figure>
        </Box>
        <Footnote>
          Elapsed <strong>{formatDuration(start.elapsedMinutes)}</strong> of {formatDuration(start.plannedMinutes)}
        </Footnote>
      </Card>

      <Card label="Forecast end time" onOpen={onOpenForecast} openLabel="Open the late tasks and the critical path">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5 }}>
          <Box component="span" aria-hidden="true" data-testid="rbm-rag-disc" data-rag={forecast.rag} sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: discTint[forecast.rag], display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} size={30} stroke={rag} width={2} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
            <Figure>{timeOf(forecast.end, timeZone)}</Figure>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: d.caption, fontWeight: 700, color: rag, whiteSpace: 'nowrap' }}>
              <Icon d={gapIcon} size={16} stroke={rag} width={2.5} />
              {formatGap(forecast.gapMinutes)}
            </Box>
          </Box>
        </Box>
        <Footnote>
          Planned end <strong>{timeOf(forecast.plannedEnd, timeZone)}</strong>
        </Footnote>
      </Card>
    </Box>
  );
}
