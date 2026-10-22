import { Box, ButtonBase, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { elevation, radius } from '../../theme/tokens';

/**
 * Feedback for a request that can take a while: "Loading all tasks" over the region it affects.
 * Generic, for any action that may run a large query (Show all, Expand all, and later ones).
 * Not drawn on the board (flagged): built from drawn tokens and MUI's spinner.
 */

export interface RbmBusyOptions {
  /** Wait this long before showing anything, so quick actions do not flash. 250 ms by default. */
  delayMs?: number;
  /** Once shown, stay at least this long, so the feedback does not flicker. 400 ms by default. */
  minVisibleMs?: number;
}

export interface RbmBusyRequest {
  /** What is happening, for example "Loading all tasks". */
  label: string;
  /** One more line, for example "This can take a moment on a large event." */
  detail?: string;
  /**
   * The slow part, if there is one: a server query. It gets an AbortSignal; when given, the user
   * can cancel. Without it, only the screen update is waited for.
   */
  load?: (signal: AbortSignal) => Promise<void>;
  /** Applies the result: the state change that shows the new data. It runs after load. */
  apply: () => void;
  /**
   * The result is large to draw (thousands of rows): show the feedback at once rather than after
   * the delay, because the page will be busy while it draws.
   */
  heavy?: boolean;
  /** Says what went wrong when load fails. "Could not finish. Try again." by default. */
  errorText?: string;
}

export interface RbmBusy {
  /** Starts a request. A new one replaces any still running. */
  run: (request: RbmBusyRequest) => void;
  /** True while the feedback is on screen. */
  visible: boolean;
  label: string;
  detail?: string;
  /** Set when load failed; the overlay shows it until dismissed. */
  error?: string;
  /** Present while a cancellable request is running. */
  cancel?: () => void;
  dismiss: () => void;
  /** Spread onto the content the request will change: it is marked busy and cannot be used meanwhile. */
  contentProps: { 'aria-busy': boolean; inert: boolean };
}

/** Resolves once the browser has painted, so feedback is on screen before a heavy update blocks the page. */
const nextPaint = () => new Promise<void>((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(resolve, 0)) : setTimeout(resolve, 0)));

/**
 * Runs a request in steps: the query (if any), then the feedback painted, then the result applied
 * in one go. The feedback goes once React has drawn the result. Not a React transition: a large
 * render in a transition restarts whenever anything else updates, and could be starved.
 */
export function useRbmBusy({ delayMs = 250, minVisibleMs = 400 }: RbmBusyOptions = {}): RbmBusy {
  const [request, setRequest] = useState<{ label: string; detail?: string; cancellable: boolean } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'applying'>('idle');
  const [error, setError] = useState<string>();
  const [shown, setShown] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const shownAt = useRef(0);
  const shownNow = useRef(false);
  shownNow.current = shown;
  const active = phase !== 'idle';

  const show = () => {
    shownAt.current = Date.now();
    shownNow.current = true;
    setShown(true);
  };
  useEffect(() => {
    if (active && !shown) {
      const t = setTimeout(show, delayMs);
      return () => clearTimeout(t);
    }
    if (!active && shown) {
      const t = setTimeout(() => setShown(false), Math.max(0, minVisibleMs - (Date.now() - shownAt.current)));
      return () => clearTimeout(t);
    }
  }, [active, shown, delayMs, minVisibleMs]);

  // The result is on screen once React has committed the render that applied it.
  useEffect(() => {
    if (phase === 'applying') setPhase('idle');
  }, [phase]);

  const run = async ({ label, detail, load, apply, heavy, errorText = 'Could not finish. Try again.' }: RbmBusyRequest) => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setRequest({ label, detail, cancellable: !!load });
    setError(undefined);
    setPhase('loading');
    if (heavy) show();
    if (load) {
      try {
        // Stop waiting the moment it is cancelled or replaced, even if the query ignores the signal.
        await Promise.race([load(ac.signal), new Promise<never>((_, reject) => ac.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError'))))]);
      } catch {
        if (ac.signal.aborted) return;
        setError(errorText);
        setShown(false);
        setPhase('idle');
        return;
      }
    }
    if (ac.signal.aborted) return;
    // Drawing the result may hold the page for a moment: make sure the feedback is painted first.
    if (shownNow.current) await nextPaint();
    if (ac.signal.aborted) return;
    setRequest((r) => r && { ...r, cancellable: false });
    apply();
    setPhase('applying');
  };

  const visible = shown || !!error;
  return {
    run: (r) => void run(r),
    visible,
    label: request?.label ?? '',
    detail: request?.detail,
    error,
    cancel:
      request?.cancellable && phase === 'loading'
        ? () => {
            controller.current?.abort();
            setShown(false);
            setPhase('idle');
          }
        : undefined,
    dismiss: () => setError(undefined),
    contentProps: { 'aria-busy': visible && !error, inert: visible && !error },
  };
}

/**
 * The feedback itself: a light scrim over the region, and a card held in the middle of the screen
 * while the region scrolls. The parent must be positioned (position: relative). Not a full-page
 * modal: the rest of the page stays readable.
 */
export function RbmBusyOverlay({ busy }: { busy: RbmBusy }) {
  if (!busy.visible) return null;
  const linkSx = { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, alignSelf: 'flex-start' } as const;
  return (
    <Box data-testid="rbm-busy" sx={{ position: 'absolute', inset: 0, zIndex: 5, bgcolor: 'rgba(255,255,255,0.6)', lineHeight: 'normal' }}>
      <Box sx={{ position: 'sticky', top: 'calc(50vh - 48px)', display: 'flex', justifyContent: 'center', pt: 6, px: 4 }}>
        <Box
          role={busy.error ? 'alert' : 'status'}
          sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, maxWidth: 380, p: 4, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, boxShadow: elevation.menu }}
        >
          {!busy.error && <CircularProgress size={20} thickness={5} aria-hidden="true" sx={{ flex: 'none', mt: '1px' }} />}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box component="strong" sx={{ fontSize: 14, color: 'text.primary' }}>
              {busy.error ?? `${busy.label}…`}
            </Box>
            {!busy.error && busy.detail && <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{busy.detail}</Box>}
            {busy.cancel && (
              <ButtonBase onClick={busy.cancel} sx={linkSx}>
                Cancel
              </ButtonBase>
            )}
            {busy.error && (
              <ButtonBase onClick={busy.dismiss} sx={linkSx}>
                Close
              </ButtonBase>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
