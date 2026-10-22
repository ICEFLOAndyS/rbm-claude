import { useEffect, useState, type ReactNode } from 'react';
import { Box, Button, Skeleton } from '@mui/material';
import { colour, radius, stroke } from '../../theme/tokens';
import { useDensity } from '../../theme/RbmDensity';
import { GRID_HEADER_HEIGHT } from '../RbmDataGrid/RbmDataGrid';
import { ListDataError } from '../../data/list/types';

/**
 * The four states every page covers (Page templates board, "States every page covers"):
 * - Loading: a skeleton that matches the layout. No full-page spinner. Under 300 ms, show nothing.
 * - Empty: say why it is empty and offer the one action that fixes it.
 * - Error: a short message, a Retry button and a reference number for support.
 * - No access: say what the user cannot see and who to ask. Never a blank page.
 *
 * The board gives the rules but draws none of the four (flagged). Built from the rules with MUI's
 * Skeleton and Button and the RBM tokens, at the region's density (D2 on the list page). The empty
 * and no-access states show the object's icon, as the Icons board says ("empty states").
 */

const visuallyHidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, p: 0, m: '-1px' } as const;

/** Under this, a load shows nothing (board rule). */
export const LOADING_DELAY_MS = 300;

/** A 24-unit outline glyph from the Icons board, decorative. */
function Glyph({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {children}
    </svg>
  );
}

/** The Event object icon (Icons board, Objects). */
export const eventIcon = (
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M12.5 12l-2.5 3.5h4l-2 3.5" />
  </>
);
/** The Lock icon (Icons board, Generic actions). */
const lockIcon = (
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </>
);
/** The Issue icon (Icons board, Objects): a flag. */
const issueIcon = (
  <>
    <path d="M5 21V4" />
    <path d="M5 4h12l-2 4 2 4H5" />
  </>
);

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export interface RbmListLoadingProps {
  /** What is loading, for screen readers: "Loading events". */
  label: string;
  /** The grid's column widths, so the skeleton matches the layout. */
  columns: readonly number[];
  /** Rows to draw: the page size, up to what fits. 8 by default. */
  rows?: number;
  /** Draw the toolbar row too (the first load of the page). True by default. */
  toolbar?: boolean;
  /** Under this, show nothing. 300 ms by default (board rule). */
  delayMs?: number;
}

/** True once `delayMs` has passed. */
function useDelayed(delayMs: number) {
  const [shown, setShown] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    const t = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return shown;
}

/** The skeleton of the list: the toolbar row, then the grid card with its header and rows. */
export function RbmListLoading({ label, columns, rows = 8, toolbar = true, delayMs = LOADING_DELAY_MS }: RbmListLoadingProps) {
  const d = useDensity();
  const shown = useDelayed(delayMs);
  // The status is there from the start, so a screen reader hears it once; the skeleton follows the delay.
  return (
    <Box role="status" aria-busy="true" sx={{ display: 'flex', flexDirection: 'column', gap: `${d.gap}px` }}>
      <Box component="span" sx={visuallyHidden}>
        {label}
      </Box>
      {shown && (
        <Box aria-hidden="true" data-testid="rbm-list-skeleton" sx={{ display: 'contents' }}>
          {toolbar && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: `${d.gap}px`, height: d.row }}>
              <Skeleton variant="rounded" width={260} height={d.control} />
              {[96, 96, 120].map((w, i) => (
                <Skeleton key={i} variant="rounded" width={w} height={d.control} />
              ))}
              <Box sx={{ flex: 1 }} />
              <Skeleton variant="rounded" width={d.control} height={d.control} />
            </Box>
          )}
          <Box sx={{ border: `${stroke.thin}px solid ${colour.rule}`, borderRadius: `${radius.card}px`, bgcolor: colour.white, overflow: 'hidden' }}>
            <SkeletonRow height={GRID_HEADER_HEIGHT} columns={columns} header />
            {Array.from({ length: rows }, (_, i) => (
              <SkeletonRow key={i} height={d.row} columns={columns} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function SkeletonRow({ height, columns, header }: { height: number; columns: readonly number[]; header?: boolean }) {
  const d = useDensity();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', height, borderTop: header ? 0 : `${stroke.thin}px solid ${colour.rule}`, bgcolor: header ? colour.mist : undefined }}>
      {/* The checkbox column. */}
      <Box sx={{ width: 52, flex: 'none', display: 'flex', justifyContent: 'center' }}>
        <Skeleton variant="rounded" width={18} height={18} />
      </Box>
      {columns.map((w, i) => (
        <Box key={i} sx={{ width: w, flex: 'none', px: `${d.padX}px`, boxSizing: 'border-box' }}>
          <Skeleton variant="text" width={header ? '50%' : `${60 + ((i * 17) % 30)}%`} sx={{ fontSize: header ? d.caption : d.body }} />
        </Box>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Empty, error and no access
// ---------------------------------------------------------------------------

/** The shared layout: the icon, a short title, one or two lines, and the one action. */
function Message({ icon, title, children, action, role }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode; role?: 'alert' }) {
  const d = useDensity();
  return (
    <Box
      role={role}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: `${d.gap}px`,
        py: 12,
        px: `${d.padX}px`,
        border: `${stroke.thin}px solid ${colour.rule}`,
        borderRadius: `${radius.card}px`,
        bgcolor: colour.white,
      }}
    >
      {/* Object icons are drawn at 32 px on the Icons board. */}
      <Box sx={{ color: 'text.secondary' }}>
        <Glyph size={32}>{icon}</Glyph>
      </Box>
      <Box component="h2" sx={{ m: 0, fontSize: d.body, fontWeight: 700, color: 'text.primary', lineHeight: 1.4 }}>
        {title}
      </Box>
      <Box sx={{ maxWidth: 440, fontSize: d.body, color: 'text.secondary', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</Box>
      {action}
    </Box>
  );
}

export interface RbmListAction {
  label: string;
  onClick: () => void;
}

export interface RbmListEmptyProps {
  /** Why it is empty, as a title: "No events yet" or "No events match these filters". */
  title: string;
  /** One line more: what to do. */
  reason: string;
  /** The one action that fixes it: "New event", or "Clear filters". */
  action?: RbmListAction;
  /** The object's icon (Icons board). The Event icon by default. */
  icon?: ReactNode;
  /** "New …" is the page's green CTA (board); Clear filters is outlined. */
  actionKind?: 'cta' | 'outlined';
}

export function RbmListEmpty({ title, reason, action, icon = eventIcon, actionKind = 'outlined' }: RbmListEmptyProps) {
  return (
    <Message
      icon={icon}
      title={title}
      action={
        action && (
          <Button variant={actionKind === 'cta' ? 'contained' : 'outlined'} color={actionKind === 'cta' ? 'secondary' : 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        )
      }
    >
      <span>{reason}</span>
    </Message>
  );
}

export interface RbmListErrorProps {
  /** A short message: "Could not load events." */
  message: string;
  /** The reference number for support: "REF-20261025-0001". */
  reference: string;
  onRetry: () => void;
}

export function RbmListError({ message, reference, onRetry }: RbmListErrorProps) {
  return (
    <Message
      role="alert"
      icon={issueIcon}
      title={message}
      action={
        <Button variant="outlined" color="primary" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      <span>Try again. If it keeps happening, give support this reference.</span>
      <Box component="span" sx={{ color: 'text.primary', fontWeight: 600, fontVariantNumeric: 'tabular-nums', userSelect: 'all' }}>
        Reference: {reference}
      </Box>
    </Message>
  );
}

export interface RbmListNoAccessProps {
  /** What the user cannot see: "You do not have access to events." */
  message: string;
  /** Who to ask: "Ask your RBM administrator for the Event reader role." */
  contact: string;
  /** For support, if the server gave one. */
  reference?: string;
}

export function RbmListNoAccess({ message, contact, reference }: RbmListNoAccessProps) {
  return (
    <Message icon={lockIcon} title={message}>
      <span>{contact}</span>
      {reference && <span>Reference: {reference}</span>}
    </Message>
  );
}

/** The right state for a failed load: no access when the server says so, otherwise the error with Retry. */
export function RbmListFailure({ error, onRetry, noun }: { error: unknown; onRetry: () => void; noun: string }) {
  if (error instanceof ListDataError && error.kind === 'noAccess') {
    return <RbmListNoAccess message={error.message} contact={error.contact ?? 'Ask your RBM administrator for access.'} reference={error.reference} />;
  }
  if (error instanceof ListDataError) return <RbmListError message={error.message} reference={error.reference} onRetry={onRetry} />;
  // Not from the server (a network failure): the page makes its own reference, so support can still match the logs.
  return <RbmListError message={`Could not load ${noun}.`} reference={clientReference()} onRetry={onRetry} />;
}

/** "REF-C-LX4K2A9F": a time-based reference made in the browser, for failures the server never saw. */
export function clientReference(now = Date.now()) {
  return `REF-C-${now.toString(36).toUpperCase()}`;
}
