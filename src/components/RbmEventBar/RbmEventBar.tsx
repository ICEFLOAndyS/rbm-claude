import { Box, ButtonBase, Slide, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { RbmStatusPill } from '../RbmStatusPill/RbmStatusPill';
import { RbmAlertCounter, type RbmAlert } from '../RbmAlertCounter/RbmAlertCounter';
import type { RbmEventVitalsData, RbmRag } from '../RbmEventVitals/RbmEventVitals';
import { colour, radius, type RbmState, stroke } from '../../theme/tokens';

export interface RbmEventSummary {
  /** The event number, for example "E12345". */
  number: string;
  name: string;
  state: RbmState;
}

export interface RbmEventBarProps {
  event: RbmEventSummary;
  vitals: RbmEventVitalsData;
  alerts: RbmAlert[];
  /** Shown only while the Event vitals are off screen, so nothing is shown twice. */
  visible: boolean;
  timeZone?: string;
  onOpenProgress?: () => void;
  onOpenIssues?: () => void;
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

function Link({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <ButtonBase onClick={onClick} disabled={!onClick} aria-label={label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 2.5, fontFamily: 'inherit', whiteSpace: 'nowrap', borderRadius: 1, color: 'inherit', '&.Mui-disabled': { color: 'inherit' } }}>
      {children}
    </ButtonBase>
  );
}

/**
 * The compact event bar, as drawn on the Command board: 48 px, pinned under the top bar once the
 * Event vitals scroll away. It carries the event name and state, the alert counter, progress, open
 * issues and Forecast end time.
 */
export function RbmEventBar({ event, vitals, alerts, visible, timeZone, onOpenProgress, onOpenIssues, onOpenForecast, onBackToTop }: RbmEventBarProps) {
  const { palette } = useTheme();
  const s = palette.status;
  const { progress, issues, forecast } = vitals;
  const share = (n: number) => (progress.total > 0 ? (n / progress.total) * 100 : 0);
  const percent = Math.round(share(progress.complete));
  const open = issues.high + issues.medium + issues.low;
  const ragText: Record<RbmRag, string> = { green: s.complete.text, amber: s.atRisk.text, red: s.blocked.text };
  const worst = issues.high > 0 ? 'high' : issues.medium > 0 ? 'medium' : issues.low > 0 ? 'low' : undefined;

  return (
    <Slide in={visible} direction="down" mountOnEnter unmountOnExit>
      <Box
        component="header"
        aria-label="Event summary"
        sx={{ display: 'flex', alignItems: 'center', gap: 5, height: 48, px: 4, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', boxShadow: '0 4px 12px rgba(35,50,111,0.10)', boxSizing: 'border-box', lineHeight: 'normal', overflow: 'hidden' }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em' }}>{event.number}</Box>
          <Box component="span" sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.name}</Box>
        </Box>
        <RbmStatusPill state={event.state} size="compact" />
        <RbmAlertCounter alerts={alerts} size="compact" />
        <Box aria-hidden="true" sx={{ width: '1px', height: 24, bgcolor: 'divider', flex: 'none' }} />

        <Link label={`Progress, ${percent}% complete`} onClick={onOpenProgress}>
          <Box component="span" aria-hidden="true" sx={{ width: 96, height: 8, borderRadius: `${radius.pill}px`, bgcolor: 'divider', overflow: 'hidden', display: 'flex' }}>
            <Box component="span" sx={{ width: `${share(progress.complete)}%`, bgcolor: s.complete.signal }} />
            <Box component="span" sx={{ width: `${share(progress.active)}%`, bgcolor: s.active.signal }} />
            <Box component="span" sx={{ width: `${share(progress.blocked)}%`, bgcolor: s.blocked.signal }} />
          </Box>
          <Box component="span" sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary' }}>{percent}%</Box>
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>complete</Box>
        </Link>

        <Link label={`${open} open ${open === 1 ? 'issue' : 'issues'}`} onClick={onOpenIssues}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: 13, color: 'text.secondary' }}>
            {worst === 'medium' ? (
              <Box component="span" aria-hidden="true" sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.atRisk.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
              </Box>
            ) : worst ? (
              <Box component="span" aria-hidden="true" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: worst === 'high' ? s.blocked.signal : s.pending.signal }} />
            ) : null}
            <Box component="strong" sx={{ color: 'text.primary' }}>{open}</Box> open {open === 1 ? 'issue' : 'issues'}
          </Box>
        </Link>

        <Box sx={{ flex: 1 }} />

        <Link label={`Forecast end ${timeOf(forecast.end, timeZone)}, ${barGap(forecast.gapMinutes)}`} onClick={onOpenForecast}>
          <Box component="span" aria-hidden="true" data-rag={forecast.rag} sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: discTint[forecast.rag], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ragText[forecast.rag]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </Box>
          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, textAlign: 'left' }}>
            <Box component="span" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'text.secondary' }}>FORECAST END</Box>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
              <Box component="span" sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{timeOf(forecast.end, timeZone)}</Box>
              <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: ragText[forecast.rag] }}>{barGap(forecast.gapMinutes)}</Box>
            </Box>
          </Box>
        </Link>

        <ButtonBase onClick={onBackToTop} aria-label="Back to top" sx={{ borderRadius: 1, color: 'primary.main' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M6 15l6-6 6 6" />
          </svg>
        </ButtonBase>
      </Box>
    </Slide>
  );
}
