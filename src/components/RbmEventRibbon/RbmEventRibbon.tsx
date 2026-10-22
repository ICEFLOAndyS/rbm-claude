import { Box, ButtonBase, Tooltip, useTheme } from '@mui/material';
import { useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import { RbmNode } from '../RbmNode/RbmNode';
import { RbmRegionCollapsed, RbmRegionToggle, RbmSummaryChip, RbmToggleLink } from '../RbmRegion/RbmRegion';
import { colour, hairline, radius, type RbmState } from '../../theme/tokens';
import type { RbmRag } from '../RbmEventVitals/RbmEventVitals';
import { defaultWindow, hourTicks, lane, laneHeight, packStages, timeScale } from './ribbonLayout';

/** Data from the RBM planning engine. Times are forecast times. */
export interface RbmRibbonStage {
  id: string;
  /** WBS, for example "1.3". */
  wbs: string;
  name: string;
  start: Date;
  end: Date;
  /** Complete (Green), Active (Blue Dark, the current stage) or Not started (Silver), as drawn. */
  state: RbmState;
  /** Set by the planning engine: true when any of the stage's tasks is on the critical path. */
  critical?: boolean;
}

export interface RbmRibbonMarker {
  id: string;
  kind: 'milestone' | 'checkpoint';
  wbs: string;
  name: string;
  at: Date;
  state: RbmState;
  /** On the critical path, from the planning engine. */
  critical?: boolean;
}

export interface RbmRibbonRunbook {
  id: string;
  /** WBS, for example "1". */
  wbs: string;
  name: string;
  plannedEnd: Date;
  forecastEnd: Date;
  rag: RbmRag;
  /** The gap to plan in minutes, from the engine: positive is behind. */
  gapMinutes: number;
  stages: RbmRibbonStage[];
  markers?: RbmRibbonMarker[];
}

export interface RbmEventRibbonProps {
  /** Every runbook, always: the ribbon ignores the runbook filter. */
  runbooks: RbmRibbonRunbook[];
  now: Date;
  /** The shared clock. Defaults to the hour before the first start to the half hour after the last end. */
  windowStart?: Date;
  windowEnd?: Date;
  timeZone?: string;
  /** Open by default. Pass it with onCollapsedChange to remember the user's choice. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSelectStage?: (stage: RbmRibbonStage) => void;
  onSelectMarker?: (marker: RbmRibbonMarker) => void;
  /**
   * The Critical path filter: when on, only stages (and milestones and checkpoints) on the critical
   * path are shown. Every lane stays. Pass with onCriticalOnlyChange to control it from the page.
   */
  criticalOnly?: boolean;
  onCriticalOnlyChange?: (criticalOnly: boolean) => void;
}

// Horizontal geometry at the board's 1136 px: names to the left of 188 px, forecasts in the right 125 px.
const X0 = 188;
const RIGHT = 125;
const HEADER = 64;
const BOTTOM = 14;

const pad = (n: number) => String(n).padStart(2, '0');

function timeOf(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

/** The short gap beside a lane's forecast: "+12m", "On Schedule", "−08m". */
export function shortGap(minutes: number) {
  if (minutes === 0) return 'On Schedule';
  return minutes > 0 ? `+${pad(minutes)}m` : `−${pad(-minutes)}m`;
}

/** The lane's text alternative, for example "Interfaces, forecast end 05:27, 27 minutes behind". */
export function laneSummary(r: RbmRibbonRunbook, timeZone?: string) {
  const gap =
    r.gapMinutes === 0
      ? 'on schedule'
      : `${Math.abs(r.gapMinutes)} ${Math.abs(r.gapMinutes) === 1 ? 'minute' : 'minutes'} ${r.gapMinutes > 0 ? 'behind' : 'ahead'}`;
  const name = r.name.charAt(0).toUpperCase() + r.name.slice(1).toLowerCase();
  return `${name}, forecast end ${timeOf(r.forecastEnd, timeZone)}, ${gap}`;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1136);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => e && e.contentRect.width > 0 && setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** The RAG mark: a Red or Green dot, or the At risk ringed dot for Amber. */
function RagMark({ rag, size }: { rag: RbmRag; size: 'lane' | 'chip' }) {
  const { status } = useTheme().palette;
  if (rag === 'amber') {
    const outer = size === 'lane' ? 14 : 11;
    const inner = size === 'lane' ? 9 : 7;
    return (
      <Box component="span" aria-hidden="true" data-rag="amber" sx={{ width: outer, height: outer, borderRadius: '50%', bgcolor: status.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Box component="span" sx={{ width: inner, height: inner, borderRadius: '50%', bgcolor: status.atRisk.core, border: `2px solid ${colour.white}`, boxSizing: 'border-box' }} />
      </Box>
    );
  }
  return <Box component="span" aria-hidden="true" data-rag={rag} sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: rag === 'red' ? status.blocked.signal : status.complete.signal, flex: 'none' }} />;
}

const hatch = (c: string) => `repeating-linear-gradient(135deg,${c} 0,${c} 3px,${colour.white} 3px,${colour.white} 6px)`;

/**
 * The Event ribbon: the whole event on one shared clock, one lane per runbook, each forecast
 * end set against its plan. It shows stages, not tasks.
 */
export function RbmEventRibbon(props: RbmEventRibbonProps) {
  const { runbooks, now, timeZone, collapsed: collapsedProp, onCollapsedChange, onSelectStage, onSelectMarker } = props;
  const [criticalState, setCriticalState] = useState(false);
  const criticalOnly = props.criticalOnly ?? criticalState;
  const setCriticalOnly = (on: boolean) => {
    setCriticalState(on);
    props.onCriticalOnlyChange?.(on);
  };
  const { palette } = useTheme();
  const [ref, width] = useWidth();
  const [collapsedState, setCollapsedState] = useState(false);
  const collapsed = collapsedProp ?? collapsedState;
  const setCollapsed = (c: boolean) => {
    setCollapsedState(c);
    onCollapsedChange?.(c);
  };
  const [expandedLanes, setExpandedLanes] = useState<ReadonlySet<string>>(new Set());
  // Sub-rows from the last render, so each stage keeps its row as the forecast moves.
  const rowMemory = useRef(new Map<string, ReadonlyMap<string, number>>());
  // One tooltip for the whole ribbon, following the stage or marker under the pointer or focus.
  // Hundreds of separate tooltips made every clock tick slow on a large event.
  const [tip, setTip] = useState<{ el: HTMLElement; text: string } | null>(null);
  const tipFor = (text: string) => ({
    onMouseEnter: (e: MouseEvent<HTMLElement>) => setTip({ el: e.currentTarget, text }),
    onMouseLeave: () => setTip(null),
    onFocus: (e: FocusEvent<HTMLElement>) => setTip({ el: e.currentTarget, text }),
    onBlur: () => setTip(null),
  });

  const ragText: Record<RbmRag, string> = { green: palette.status.complete.text, amber: palette.status.atRisk.text, red: palette.status.blocked.text };
  const ragSignal: Record<RbmRag, string> = { green: palette.status.complete.signal, amber: palette.status.atRisk.signal, red: palette.status.blocked.signal };

  if (collapsed) {
    return (
      <Box ref={ref}>
        <RbmRegionCollapsed title="Event ribbon" onExpand={() => setCollapsed(false)}>
          {runbooks.map((r) => (
            <RbmSummaryChip key={r.id} label={laneSummary(r, timeZone)}>
              <RagMark rag={r.rag} size="chip" />
              <Box component="strong" sx={{ color: 'text.primary', textTransform: 'uppercase' }}>
                {r.wbs} {r.name}
              </Box>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                ends
              </Box>
              <Box component="strong" sx={{ color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                {timeOf(r.forecastEnd, timeZone)}{' '}
                <Box component="span" sx={{ color: ragText[r.rag] }}>
                  {shortGap(r.gapMinutes)}
                </Box>
              </Box>
            </RbmSummaryChip>
          ))}
        </RbmRegionCollapsed>
      </Box>
    );
  }

  const allTimes = [now, ...runbooks.flatMap((r) => [r.plannedEnd, r.forecastEnd, ...r.stages.flatMap((s) => [s.start, s.end]), ...(r.markers ?? []).map((m) => m.at)])];
  const fallback = defaultWindow(allTimes);
  const windowStart = props.windowStart ?? fallback.start;
  const windowEnd = props.windowEnd ?? fallback.end;
  const x1 = Math.max(width - RIGHT, X0 + 100);
  const scale = timeScale(windowStart, windowEnd, X0, x1);
  const x = (t: Date) => Math.min(Math.max(scale(t), X0), x1);
  const pxPerHour = (x1 - X0) / ((windowEnd.getTime() - windowStart.getTime()) / 3_600_000);

  // Pack each lane once, remembering rows between renders.
  const lanes = runbooks.map((all) => {
    // With the Critical path filter on, a lane keeps only its critical stages and markers.
    const r = criticalOnly ? { ...all, stages: all.stages.filter((s) => s.critical), markers: (all.markers ?? []).filter((m) => m.critical) } : all;
    const memoryKey = `${r.id}|${criticalOnly ? 'critical' : 'all'}`;
    const packed = packStages(r.stages, rowMemory.current.get(memoryKey));
    rowMemory.current.set(memoryKey, packed.rows);
    const expanded = expandedLanes.has(r.id);
    const shownRows = expanded ? packed.count : Math.min(packed.count, lane.maxRows);
    const hidden = r.stages.filter((s) => (packed.rows.get(s.id) ?? 0) >= shownRows).length;
    return { r, packed, shownRows, hidden, expanded, height: laneHeight(shownRows) };
  });
  let top = HEADER;
  const placed = lanes.map((l) => {
    const p = { ...l, top };
    top += l.height;
    return p;
  });
  const height = top + BOTTOM;
  const nowX = scale(now);
  const nowShown = nowX >= X0 && nowX <= x1;
  const toggleLane = (id: string) =>
    setExpandedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Box ref={ref} component="section" aria-label="Event ribbon" sx={{ border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', lineHeight: 'normal' }}>
      <Box sx={{ position: 'relative', height }}>
        {tip && (
          <Tooltip open title={tip.text} slotProps={{ popper: { anchorEl: tip.el } }}>
            <Box component="span" aria-hidden="true" sx={{ position: 'absolute', width: 0, height: 0 }} />
          </Tooltip>
        )}
        {/* Hour grid */}
        {hourTicks(windowStart, windowEnd, pxPerHour).map((t) => (
          <Box key={t.getTime()} aria-hidden="true">
            <Box style={{ left: scale(t) }} sx={{ position: 'absolute', top: 60, bottom: 12, width: '1px', bgcolor: hairline }} />
            <Box style={{ left: scale(t) }} sx={{ position: 'absolute', top: 38, transform: 'translateX(-50%)', fontSize: 11, color: 'text.secondary', fontVariantNumeric: 'tabular-nums', bgcolor: 'background.paper', px: '3px' }}>
              {timeOf(t, timeZone)}
            </Box>
          </Box>
        ))}

        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {placed.map(({ r, packed, shownRows, hidden, expanded, top: laneTop }) => {
            const rowTop = (row: number) => laneTop + lane.firstRow + lane.subRow * row;
            const barTop = (row: number) => rowTop(row) + lane.labelHeight;
            const lastStage = [...r.stages].sort((a, b) => b.end.getTime() - a.end.getTime())[0];
            const lastRow = lastStage ? Math.min(packed.rows.get(lastStage.id) ?? 0, shownRows - 1) : 0;
            const spanStart = r.stages.length ? new Date(Math.min(...r.stages.map((s) => s.start.getTime()))) : r.plannedEnd;
            const late = r.forecastEnd > r.plannedEnd;
            // A filtered lane with no stages left shows only its forecast at the right, not a floating overrun.
            const showEnd = !criticalOnly || r.stages.length > 0;
            return (
              <Box component="li" key={r.id} role="group" aria-label={laneSummary(r, timeZone)} data-lane={r.id}>
                <Box aria-hidden="true" style={{ top: laneTop }} sx={{ position: 'absolute', left: 0, right: 0, height: '1px', bgcolor: hairline }} />
                <Box
                  aria-hidden="true"
                  style={{ top: laneTop + 2 }}
                  sx={{ position: 'absolute', left: 20, height: 50, display: 'flex', alignItems: 'center', gap: 2, maxWidth: X0 - 28, fontSize: 12, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'primary.main', whiteSpace: 'nowrap', overflow: 'hidden' }}
                >
                  <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                    {r.wbs}
                  </Box>
                  {r.name}
                </Box>
                {(hidden > 0 || expanded) && (
                  <RbmToggleLink onClick={() => toggleLane(r.id)} style={{ top: laneTop + 44 }} sx={{ position: 'absolute', left: 20, fontSize: 11 }}>
                    {expanded ? 'Show fewer stages' : `+${hidden} more ${hidden === 1 ? 'stage' : 'stages'} overlapping`}
                  </RbmToggleLink>
                )}

                {criticalOnly && r.stages.length === 0 && (
                  <Box style={{ top: laneTop + lane.firstRow + lane.labelHeight - 2 }} sx={{ position: 'absolute', left: X0 + 8, fontSize: 12, color: 'text.secondary' }}>
                    No stages on the critical path
                  </Box>
                )}

                {/* Milestones and checkpoints sit on a thin line above the stage rows, never on a bar. */}
                {(r.markers ?? []).length > 0 && (
                  <Box aria-hidden="true" style={{ left: x(spanStart), width: Math.max(x(r.forecastEnd) - x(spanStart), 0), top: laneTop + lane.markerLine }} sx={{ position: 'absolute', height: '1px', bgcolor: 'divider' }} />
                )}

                {r.stages
                  .filter((s) => (packed.rows.get(s.id) ?? 0) < shownRows && s.end > windowStart && s.start < windowEnd)
                  .map((s) => {
                    const row = packed.rows.get(s.id) ?? 0;
                    const clippedStart = s.start < windowStart;
                    const clippedEnd = s.end > windowEnd;
                    const left = x(s.start) + (clippedStart ? 0 : 1);
                    const barWidth = Math.max(x(s.end) - left - (clippedEnd ? 0 : 1), 2);
                    const label = `Stage ${s.wbs} ${s.name}, ${timeOf(s.start, timeZone)} to ${timeOf(s.end, timeZone)}, ${palette.status[s.state].label}${s.critical ? ', on the critical path' : ''}`;
                    return (
                      <Box key={s.id}>
                        <Box aria-hidden="true" style={{ left: left + 3, top: rowTop(row) }} sx={{ position: 'absolute', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {s.wbs}
                        </Box>
                        <ButtonBase
                          aria-label={label}
                          data-stage={s.id}
                          data-row={row}
                          data-critical={s.critical ? 'true' : undefined}
                          onClick={() => onSelectStage?.(s)}
                          {...tipFor(label)}
                          style={{
                            left,
                            top: barTop(row),
                            width: barWidth,
                            backgroundColor: palette.status[s.state].signal,
                            borderRadius: `${clippedStart ? 0 : 7}px ${clippedEnd ? 0 : 7}px ${clippedEnd ? 0 : 7}px ${clippedStart ? 0 : 7}px`,
                            // Not drawn on the board (flagged): a critical stage carries an Ink outline, so it reads without colour.
                            ...(s.critical ? { outline: `2px solid ${palette.text.primary}`, outlineOffset: 1 } : {}),
                          }}
                          sx={{ position: 'absolute', height: lane.barHeight }}
                        />
                      </Box>
                    );
                  })}

                {/* A late finish is a shape: the overrun hatched in the lane's RAG colour, then the planned end tick. */}
                {late && showEnd && (
                  <Box
                    aria-hidden="true"
                    data-testid="rbm-overrun"
                    style={{ left: x(r.plannedEnd), top: barTop(lastRow), width: Math.max(x(r.forecastEnd) - x(r.plannedEnd), 0), background: hatch(ragSignal[r.rag]) }}
                    sx={{ position: 'absolute', height: lane.barHeight, borderRadius: '0 7px 7px 0', pointerEvents: 'none' }}
                  />
                )}
                {showEnd && (
                <Box
                  aria-hidden="true"
                  data-testid="rbm-planned-end"
                  style={{ left: x(r.plannedEnd) - 1, top: barTop(0) - 4, height: barTop(Math.max(shownRows - 1, 0)) - barTop(0) + lane.barHeight + 8 }}
                  sx={{ position: 'absolute', width: 2, bgcolor: 'text.primary' }}
                />
                )}

                {(r.markers ?? [])
                  .filter((m) => m.at >= windowStart && m.at <= windowEnd)
                  .map((m) => {
                    const label = `${m.kind === 'milestone' ? 'Milestone' : 'Checkpoint'} ${m.wbs} ${m.name}, ${timeOf(m.at, timeZone)}, ${palette.status[m.state].label}`;
                    return (
                      <ButtonBase
                        key={m.id}
                        aria-label={label}
                        data-marker={m.id}
                        onClick={() => onSelectMarker?.(m)}
                        {...tipFor(label)}
                        style={{ left: scale(m.at), top: laneTop + lane.markerLine }}
                        sx={{ position: 'absolute', transform: 'translate(-50%, -50%)', borderRadius: 1 }}
                      >
                        <RbmNode kind={m.kind} state={m.state} size={18} decorative />
                      </ButtonBase>
                    );
                  })}

                <Box style={{ top: laneTop + 2 }} sx={{ position: 'absolute', right: 20, height: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '1px' }}>
                  <Box component="span" aria-hidden="true" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
                    FORECAST
                  </Box>
                  <Box component="span" aria-hidden="true" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, fontVariantNumeric: 'tabular-nums' }}>
                    <Box component="span" sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary' }}>
                      {timeOf(r.forecastEnd, timeZone)}
                    </Box>
                    <RagMark rag={r.rag} size="lane" />
                    <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: ragText[r.rag] }}>
                      {shortGap(r.gapMinutes)}
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {nowShown && (
          <>
            <Box aria-hidden="true" style={{ left: nowX - 1 }} sx={{ position: 'absolute', top: 30, bottom: 12, width: 2, bgcolor: 'text.primary' }} />
            <Box style={{ left: nowX }} sx={{ position: 'absolute', top: 6, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', height: 22, px: 2.5, borderRadius: `${radius.pill}px`, bgcolor: 'text.primary', color: colour.white, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
              NOW {timeOf(now, timeZone)}
            </Box>
          </>
        )}

        {/* Not drawn: the ribbon's filters, in the Task Timeline toolbar's chip style at 24 px. */}
        <ButtonBase
          onClick={() => setCriticalOnly(!criticalOnly)}
          aria-pressed={criticalOnly}
          sx={{ position: 'absolute', left: 20, top: 6, display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 24, px: 2.5, borderRadius: `${radius.pill}px`, border: `1px solid ${criticalOnly ? colour.deepBlue : colour.silver}`, bgcolor: criticalOnly ? 'rgba(35,50,111,0.08)' : colour.white, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'primary.main', whiteSpace: 'nowrap' }}
        >
          {criticalOnly && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          )}
          Critical path
        </ButtonBase>
        <RbmRegionToggle region="Event ribbon" collapsed={false} onChange={setCollapsed} sx={{ position: 'absolute', right: 16, top: 8 }} />
      </Box>

      <Box aria-hidden="true" sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'center', fontSize: 12, color: 'text.secondary', px: 5, pb: 3.5 }}>
        {(
          [
            ['task', 'complete', 'Complete stage'],
            ['task', 'active', 'Current stage'],
            ['task', 'pending', 'Not started'],
            ['milestone', 'pending', 'Milestone'],
            ['checkpoint', 'pending', 'Checkpoint'],
          ] as const
        ).map(([kind, state, text]) => (
          <Box key={text} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
            <RbmNode kind={kind} state={state} size={18} decorative />
            {text}
          </Box>
        ))}
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
          <Box component="span" sx={{ width: 2, height: 16, bgcolor: 'text.primary', display: 'inline-block' }} />
          Planned end of the runbook
        </Box>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
          <Box component="span" sx={{ width: 22, height: 12, borderRadius: '6px', background: hatch(palette.status.atRisk.signal), display: 'inline-block' }} />
          Forecast overrun
        </Box>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
          <Box component="span" sx={{ width: 22, height: 12, borderRadius: '6px', bgcolor: palette.status.pending.signal, outline: `2px solid ${palette.text.primary}`, outlineOffset: '1px', display: 'inline-block' }} />
          On the critical path
        </Box>
      </Box>
    </Box>
  );
}
