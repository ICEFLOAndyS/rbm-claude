import { Box, ButtonBase, Popover, useTheme } from '@mui/material';
import { useId, useState } from 'react';
import { colour, elevation, radius, stroke } from '../../theme/tokens';

/**
 * Red: a blocker, a failed check or a Red forecast. Amber: the forecast is late and nothing is blocked.
 * The planning engine raises the alerts and decides their severity.
 */
export type RbmAlertSeverity = 'red' | 'amber';

export interface RbmAlert {
  id: string;
  severity: RbmAlertSeverity;
  /** What and its effect, for example "2 blockers are holding 3 tasks". */
  title: string;
  /** Why, for example "The forecast end has moved 12 minutes late." */
  detail?: string;
  /** A link that filters the Task Timeline or opens the record. The popover closes when it is chosen. */
  action?: { label: string; onSelect: () => void };
}

export interface RbmAlertCounterProps {
  alerts: RbmAlert[];
  /** Normal in the page header; compact (24 px) in the compact event bar. */
  size?: 'normal' | 'compact';
}

const sizes = {
  normal: { height: 30, fontSize: 15 },
  compact: { height: 24, fontSize: 12 },
} as const;

const rank: Record<RbmAlertSeverity, number> = { red: 0, amber: 1 };

/** Most serious first. The sort is stable, so the engine's order holds within a severity. */
export function sortAlerts(alerts: RbmAlert[]) {
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function Bell({ stroke }: { stroke: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** The alert's mark: a Red dot, or the small At risk ringed dot for a late forecast. */
function Mark({ severity }: { severity: RbmAlertSeverity }) {
  const { status } = useTheme().palette;
  if (severity === 'red') {
    return <Box component="span" aria-hidden="true" data-testid="rbm-alert-mark" sx={{ width: 10, height: 10, mt: 1, borderRadius: '50%', bgcolor: status.blocked.signal, flex: 'none' }} />;
  }
  return (
    <Box component="span" aria-hidden="true" data-testid="rbm-alert-mark" sx={{ width: 12, height: 12, mt: 0.75, borderRadius: '50%', bgcolor: status.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: status.atRisk.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
    </Box>
  );
}

/**
 * The alert counter, beside the state pill in the page header and in the compact event bar.
 * Hidden when the event is healthy. Colour follows the worst alert; the count is always in
 * words and digits. A click opens the alerts, most serious first.
 */
export function RbmAlertCounter({ alerts, size = 'normal' }: RbmAlertCounterProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const popoverId = useId();
  if (alerts.length === 0) return null;

  const sorted = sortAlerts(alerts);
  const worst = sorted[0]!.severity;
  const fill = worst === 'red' ? colour.redInner : colour.amber;
  const ink = worst === 'red' ? colour.white : colour.ink;
  const count = `${alerts.length} ${alerts.length === 1 ? 'alert' : 'alerts'}`;
  const open = anchor !== null;

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        // Red and Amber differ only in colour, so the name also says the most serious alert.
        // It starts with the visible count, so speech commands that use the label still work.
        aria-label={`${count}, most serious: ${sorted[0]!.title}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        data-severity={worst}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          height: sizes[size].height,
          pl: '11px',
          pr: '14px',
          borderRadius: `${radius.pill}px`,
          bgcolor: fill,
          color: ink,
          fontFamily: 'inherit',
          fontSize: sizes[size].fontSize,
          fontWeight: 800,
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
        }}
      >
        <Bell stroke={ink} />
        {count}
      </ButtonBase>
      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-label': 'Alerts',
            sx: {
              mt: 2,
              width: 520,
              maxWidth: 'calc(100vw - 32px)',
              border: 1,
              borderColor: 'divider',
              borderRadius: `${radius.card}px`,
              boxShadow: elevation.menu,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4, py: 3 }}>
          <Box component="span" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Alerts
          </Box>
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
            Most serious first
          </Box>
        </Box>
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {sorted.map((a) => (
            <Box component="li" key={a.id} data-severity={a.severity} sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, px: 4, py: 3, borderTop: 1, borderColor: 'divider' }}>
              <Mark severity={a.severity} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0, lineHeight: 'normal' }}>
                <Box component="span" sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary' }}>
                  {a.title}
                </Box>
                {a.detail && (
                  <Box component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {a.detail}
                  </Box>
                )}
              </Box>
              {a.action && (
                <ButtonBase
                  onClick={() => {
                    setAnchor(null);
                    a.action!.onSelect();
                  }}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', borderRadius: 1 }}
                >
                  {a.action.label}
                  <Chevron />
                </ButtonBase>
              )}
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
