import { Box, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { colour, radius, stroke } from '../../theme/tokens';

/**
 * Why a task is in focus, as drawn on the Command board ("Task row", "Acting on tasks").
 * A row has at most one. Any kind of item (task, milestone, checkpoint) can carry any tag.
 */
export type RbmTagKind =
  | 'lateToStart'
  | 'lateToFinish'
  | 'readyToStart'
  | 'upNext'
  | 'blocked'
  | 'issue'
  | 'needsResult'
  | 'complete'
  | 'atRisk'
  | 'paused'
  /** Not drawn: the focus rule's "Test result: Fail", styled like Blocked. */
  | 'failedCheck';

export interface RbmTagProps {
  kind: RbmTagKind;
  /** The text. Defaults to the kind's name; give the record for a blocker or an issue, for example "Blocked by BLK-102". */
  label?: string;
}

type Look = 'late' | 'ready' | 'upNext' | 'blocked' | 'issue' | 'complete' | 'atRisk' | 'paused';

const kinds: Record<RbmTagKind, { label: string; look: Look }> = {
  lateToStart: { label: 'Late to start', look: 'late' },
  lateToFinish: { label: 'Late to finish', look: 'late' },
  readyToStart: { label: 'Ready to start', look: 'ready' },
  upNext: { label: 'Up next', look: 'upNext' },
  blocked: { label: 'Blocked', look: 'blocked' },
  issue: { label: 'Issue', look: 'issue' },
  needsResult: { label: 'Needs a result', look: 'ready' },
  complete: { label: 'Complete', look: 'complete' },
  atRisk: { label: 'At risk', look: 'atRisk' },
  paused: { label: 'Paused', look: 'paused' },
  failedCheck: { label: 'Test result: Fail', look: 'blocked' },
};

// 13 px icons on a 24-unit grid, as drawn. They take the label's colour.
function Icon({ children, width = 2.5 }: { children: ReactNode; width?: number }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {children}
    </svg>
  );
}

const icons: Partial<Record<Look, ReactNode>> = {
  late: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  ),
  issue: (
    <Icon>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </Icon>
  ),
  upNext: (
    <Icon>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  ),
  complete: (
    <Icon width={3}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Icon>
  ),
};

/** The 11 px ringed dot drawn on the At risk and Paused reason tags ("Acting on tasks"). */
function RingedDot({ signal, core }: { signal: string; core: string }) {
  return (
    <Box component="span" aria-hidden="true" data-testid="rbm-tag-ring" sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
    </Box>
  );
}

/** A small tag that says why a task needs attention. It always has a label. */
export function RbmTag({ kind, label }: RbmTagProps) {
  const { palette } = useTheme();
  const { look, label: defaultLabel } = kinds[kind];
  const s = palette.status;
  const text: Record<Look, string> = {
    late: s.atRisk.text,
    ready: s.pending.text,
    upNext: s.pending.text,
    blocked: s.blocked.text,
    issue: s.atRisk.text,
    complete: s.complete.text,
    atRisk: s.atRisk.text,
    paused: s.paused.text,
  };
  const dot = look === 'ready' ? s.pending.signal : look === 'blocked' ? s.blocked.signal : undefined;
  const ring = look === 'atRisk' ? s.atRisk : look === 'paused' ? s.paused : undefined;
  return (
    <Box
      component="span"
      data-kind={kind}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot || ring ? '6px' : '5px',
        height: 22,
        px: 2,
        borderRadius: `${radius.pill}px`,
        border: look === 'upNext' ? `1px dashed ${s.pending.signal}` : `${stroke.thin}px solid ${palette.divider}`,
        fontSize: 12,
        fontWeight: 600,
        color: text[look],
        whiteSpace: 'nowrap',
      }}
    >
      {dot ? (
        <Box component="span" aria-hidden="true" data-testid="rbm-tag-dot" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dot, flex: 'none' }} />
      ) : ring ? (
        <RingedDot signal={ring.signal} core={ring.core!} />
      ) : (
        icons[look]
      )}
      {label ?? defaultLabel}
    </Box>
  );
}
