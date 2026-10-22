import { Box, ButtonBase, Menu, MenuItem, Popover } from '@mui/material';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { RbmStatusPill } from '../RbmStatusPill/RbmStatusPill';
import { RbmAlertCounter, type RbmAlert } from '../RbmAlertCounter/RbmAlertCounter';
import { RbmEventBar, type RbmEventSummary } from '../RbmEventBar/RbmEventBar';
import type { RbmEventVitalsData } from '../RbmEventVitals/RbmEventVitals';
import { DEFAULT_LAYOUT, RbmLayoutPanel, type RbmRegion } from '../RbmLayoutPanel/RbmLayoutPanel';
import { colour, elevation, hairline, radius } from '../../theme/tokens';

/** Event-level actions in the menu at the right of the page header, in the drawn order. */
export type RbmEventAction = 'raiseIssue' | 'raiseBlocker' | 'addNote' | 'notifyStakeholders' | 'pauseEvent' | 'exportLog' | 'settings';

export interface RbmCommandCentreEvent extends RbmEventSummary {
  owner: string;
  window: { start: Date; end: Date };
}

export interface RbmCommandCentreProps {
  event: RbmCommandCentreEvent;
  alerts: RbmAlert[];
  /** The same data the Event vitals show; the compact event bar reads it too. */
  vitalsData: RbmEventVitalsData;
  /** Typed slots, keyed by region name. The Page header and Event vitals are fixed at the top. */
  vitals: ReactNode;
  ribbon: ReactNode;
  timeline: ReactNode;
  hotTopics: ReactNode;
  /** The user's order for the movable regions, saved to their profile by the page. */
  layout?: RbmRegion[];
  onLayoutChange?: (order: RbmRegion[]) => void;
  /** Which movable regions are collapsed. With onCollapsedChange, the Layout panel can open and collapse them. */
  collapsed?: Partial<Record<RbmRegion, boolean>>;
  onCollapsedChange?: (region: RbmRegion, collapsed: boolean) => void;
  /** Reset to default in the Layout panel. Without it, only the order is put back. */
  onLayoutReset?: () => void;
  /** Only the actions the user may take are shown; permissions come from the platform. Layout is always there. */
  eventActions?: Partial<Record<RbmEventAction, () => void>>;
  /** Links in the compact event bar. */
  onOpenProgress?: () => void;
  onOpenIssues?: () => void;
  onOpenForecast?: () => void;
  timeZone?: string;
}

/** The Task Timeline keeps a minimum of 8 rows while open: toolbar 64 + summary 40 + 8 rows of 52. Collapsed, it is one line (agreed 22 Oct 2026). */
export const TIMELINE_MIN_HEIGHT = 64 + 40 + 8 * 52;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colour.ink} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {children}
    </svg>
  );
}

const actions: { key: RbmEventAction | 'layout'; text: string; sub?: string; icon: ReactNode }[] = [
  { key: 'raiseIssue', text: 'Raise issue', icon: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></> },
  { key: 'raiseBlocker', text: 'Raise blocker', icon: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></> },
  { key: 'addNote', text: 'Add event note', icon: <><path d="M5 4h14v12l-5 5H5z" /><path d="M14 21v-5h5M8 9h8M8 13h4" /></> },
  { key: 'notifyStakeholders', text: 'Notify stakeholders', icon: <path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4" /> },
  { key: 'pauseEvent', text: 'Pause event', sub: 'Holds every active task', icon: <path d="M9 6v12M15 6v12" /> },
  { key: 'exportLog', text: 'Export event log', icon: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" /> },
  { key: 'layout', text: 'Layout', sub: 'Order the page regions', icon: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></> },
  { key: 'settings', text: 'Event settings', icon: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></> },
];

/** "Sat 24 May 22:00 – Sun 25 May 06:00" */
export function formatWindow(start: Date, end: Date, timeZone?: string) {
  const f = (d: Date) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })
        .formatToParts(d)
        .map((x) => [x.type, x.value]),
    );
    return `${p.weekday} ${p.day} ${p.month} ${p.hour}:${p.minute}`;
  };
  return `${f(start)} – ${f(end)}`;
}

/** True while the element is on screen. Without IntersectionObserver (tests, old browsers) it stays true. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => e && setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, onScreen] as const;
}

/**
 * The Command & Control Centre page template, as drawn on the Command board: the Page header and
 * Event vitals fixed at the top, then the Event ribbon, Task Timeline and Hot-topics strip in the
 * user's order. A compact event bar pins to the top once the Event vitals scroll away.
 */
export function RbmCommandCentre(props: RbmCommandCentreProps) {
  const { event, alerts, vitalsData, vitals, ribbon, timeline, hotTopics, eventActions = {}, timeZone } = props;
  const [layoutState, setLayoutState] = useState<RbmRegion[]>(DEFAULT_LAYOUT);
  const layout = props.layout ?? layoutState;
  const setLayout = (order: RbmRegion[]) => {
    setLayoutState(order);
    props.onLayoutChange?.(order);
  };
  const menuButton = useRef<HTMLButtonElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [vitalsRef, vitalsOnScreen] = useOnScreen<HTMLDivElement>();
  const titleId = useId();

  const regions: Record<RbmRegion, ReactNode> = {
    ribbon,
    timeline: props.collapsed?.timeline ? timeline : <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: TIMELINE_MIN_HEIGHT, '& > *': { flex: 1 } }}>{timeline}</Box>,
    hotTopics,
  };
  const shown = actions.filter((a) => a.key === 'layout' || eventActions[a.key as RbmEventAction]);

  return (
    <Box component="section" aria-labelledby={titleId} sx={{ bgcolor: 'grey.100', p: 8, display: 'flex', flexDirection: 'column', gap: 6, boxSizing: 'border-box', minWidth: 0, lineHeight: 'normal' }}>
      {/* The compact event bar: pinned without taking space, shown only while the Event vitals are off screen. */}
      {/* -32 px to reach the page edge, then 8 px so that with the 24 px gap the header stays where it was. */}
      <Box sx={{ position: 'sticky', top: 0, height: 0, zIndex: 10, mx: -8, mt: -8, mb: 2 }}>
        <Box sx={{ position: 'absolute', inset: '0 0 auto 0' }}>
          <RbmEventBar
            event={event}
            vitals={vitalsData}
            alerts={alerts}
            visible={!vitalsOnScreen}
            timeZone={timeZone}
            onOpenProgress={props.onOpenProgress}
            onOpenIssues={props.onOpenIssues}
            onOpenForecast={props.onOpenForecast}
            onBackToTop={() => top.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}
          />
        </Box>
      </Box>

      {/* Page header (fixed) */}
      <Box ref={top} component="header" sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, scrollMarginTop: 32 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <Box component="nav" aria-label="Breadcrumb" sx={{ fontSize: 13, fontWeight: 600 }}>
            <Box component="span" sx={{ color: 'primary.main' }}>Run</Box> <Box component="span" aria-hidden="true" sx={{ color: colour.silver }}>/</Box>{' '}
            <Box component="span" aria-current="page" sx={{ color: 'text.secondary' }}>{event.name}</Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box component="h1" id={titleId} sx={{ m: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.025em', color: 'text.primary' }}>
              {event.number} · {event.name}
            </Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2.5, ml: 0.5 }}>
              <RbmStatusPill state={event.state} />
              <RbmAlertCounter alerts={alerts} />
            </Box>
          </Box>
          <Box sx={{ fontSize: 13, color: 'text.secondary' }}>
            Owner <Box component="strong" sx={{ color: 'text.primary' }}>{event.owner}</Box> · Window {formatWindow(event.window.start, event.window.end, timeZone)}
          </Box>
        </Box>
        <ButtonBase
          ref={menuButton}
          onClick={() => setMenuOpen(true)}
          aria-label="Event actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          sx={{ width: 40, height: 40, borderRadius: `${radius.control}px`, border: `1px solid ${colour.silver}`, bgcolor: colour.white, color: 'primary.main', flex: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </ButtonBase>
      </Box>

      <Menu
        open={menuOpen}
        anchorEl={menuButton.current}
        onClose={() => setMenuOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1.5, width: 300, border: 1, borderColor: 'divider', borderRadius: `${radius.control}px`, boxShadow: elevation.menu } }, list: { 'aria-label': 'Event actions', sx: { py: 0 } } }}
      >
        {shown.map((a, n) => (
          <MenuItem
            key={a.key}
            onClick={() => {
              setMenuOpen(false);
              if (a.key === 'layout') setLayoutOpen(true);
              else eventActions[a.key]?.();
            }}
            sx={{ gap: 3, minHeight: 40, px: 4, py: 1.5, fontSize: 13, fontWeight: 600, color: 'text.primary', borderTop: n > 0 ? `1px solid ${hairline}` : 0, '&.Mui-focusVisible': { outlineOffset: -2 } }}
          >
            <Icon>{a.icon}</Icon>
            <Box component="span" sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <span>{a.text}</span>
              {a.sub && <Box component="span" sx={{ fontSize: 12, fontWeight: 400, color: 'text.secondary' }}>{a.sub}</Box>}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Layout opens a small panel beside the menu, not a new page, so the user watches the page change. */}
      <Popover
        open={layoutOpen}
        anchorEl={menuButton.current}
        onClose={() => setLayoutOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
        slotProps={{ paper: { sx: { mt: 1.5, bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}
      >
        <RbmLayoutPanel order={layout} onChange={setLayout} onClose={() => setLayoutOpen(false)} collapsed={props.collapsed} onCollapsedChange={props.onCollapsedChange} onReset={props.onLayoutReset} />
      </Popover>

      {/* Event vitals (fixed) */}
      <Box ref={vitalsRef}>{vitals}</Box>

      {layout.map((r) => (
        <Box key={r} data-region={r} sx={{ minWidth: 0 }}>
          {regions[r]}
        </Box>
      ))}
    </Box>
  );
}
