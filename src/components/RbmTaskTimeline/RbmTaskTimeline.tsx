import { Box, ButtonBase, Snackbar, useTheme } from '@mui/material';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { RbmTaskRow, type RbmTask } from '../RbmTaskRow/RbmTaskRow';
import type { RbmTaskActionEvent } from '../RbmTaskRow/RbmTaskAction';
import type { RbmSpine } from '../RbmNode/RbmNode';
import type { RbmRag } from '../RbmEventVitals/RbmEventVitals';
import { colour, hairline, radius, surfaceTint, type RbmState } from '../../theme/tokens';
import { RbmRunbookFilter } from './RbmRunbookFilter';
import { byStart, capUpNext, focusReasons, formatLinger, lingerLeft, type RbmTimelineTask } from './focusRule';

export interface RbmTimelineStage {
  id: string;
  wbs: string;
  name: string;
  start: Date;
  end: Date;
  state: RbmState;
  complete: number;
  total: number;
}

export interface RbmTimelineRunbook {
  id: string;
  wbs: string;
  name: string;
  /** The record number, for example "RBK0000001". */
  recordId: string;
  forecastEnd: Date;
  rag: RbmRag;
  gapMinutes: number;
  stages: RbmTimelineStage[];
  /** Counts the server sends with the focus set, so hidden work stays honest. */
  hidden: { complete: number; notAvailable: number };
}

export type RbmTimelineScope = 'focus' | 'all';
type Narrow = 'mine' | 'late' | 'blocked';

export interface RbmTaskTimelineProps {
  runbooks: RbmTimelineRunbook[];
  /** The focus set from the server (or every task, for the All scope). */
  tasks: RbmTimelineTask[];
  now: Date;
  timeZone?: string;
  /** How long a completed task stays, in seconds. 60 by default; an Event Setting later. */
  lingerSeconds?: number;
  /** Selected runbook ids; empty means all. Pass with onRunbookFilterChange to remember the choice per user and event. */
  runbookFilter?: string[];
  onRunbookFilterChange?: (ids: string[]) => void;
  onAction?: (task: RbmTask, event: RbmTaskActionEvent) => void;
  onOpen?: (task: RbmTask) => void;
  /** A conflict or refusal from the API, for example "1.3.5 was already completed by L. Chen at 03:41". */
  notice?: { message: string; actionLabel?: string; onAction?: () => void };
  onNoticeClose?: () => void;
  /** When set, the toolbar and summary line stick this far from the top (under the compact event bar). */
  stickyTop?: number;
}

/** Above this many tasks in view, rows are drawn only near the screen and quiet runbooks start collapsed. */
export const LARGE_TIMELINE = 200;
const ROW = 52;

/**
 * A stage's rows, drawn only near the screen when the timeline is large. Rows are 52 px, so the
 * stage keeps its full height and the page scrolls as if every row were there.
 */
function StageRows({ count, virtual, render }: { count: number; virtual: boolean; render: (i: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<[number, number]>(() => [0, virtual ? Math.min(count, 20) : count]);
  useEffect(() => {
    if (!virtual) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const overscan = 8;
      // Keep the range inside the stage, so its spacers never add up to more than its rows.
      const from = Math.min(count, Math.max(0, Math.floor(-top / ROW) - overscan));
      const to = Math.max(from, Math.min(count, Math.ceil((window.innerHeight - top) / ROW) + overscan));
      setRange((r) => (r[0] === from && r[1] === to ? r : [from, to]));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [virtual, count]);
  if (!virtual) return <>{Array.from({ length: count }, (_, i) => render(i))}</>;
  const [from, to] = range;
  return (
    <Box ref={ref} sx={{ position: 'relative' }}>
      <Box aria-hidden="true" sx={{ height: from * ROW }} />
      {Array.from({ length: Math.max(0, to - from) }, (_, k) => render(from + k))}
      <Box aria-hidden="true" sx={{ height: Math.max(0, count - to) * ROW }} />
    </Box>
  );
}

function timeOf(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

const pad = (n: number) => String(n).padStart(2, '0');
const shortGap = (m: number) => (m === 0 ? 'On Schedule' : m > 0 ? `+${pad(m)}m` : `−${pad(-m)}m`);

function Icon({ size = 18, stroke = 'currentColor', width = 1.75, children }: { size?: number; stroke?: string; width?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {children}
    </svg>
  );
}

const chevron = (open: boolean) => <path d={open ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />;

function Chip({ label, count, on, onClick }: { label: string; count: number; on: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={on}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 32, px: 3, borderRadius: `${radius.pill}px`, border: `1px solid ${on ? colour.deepBlue : colour.silver}`, bgcolor: on ? 'rgba(35,50,111,0.08)' : colour.white, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'primary.main', whiteSpace: 'nowrap' }}
    >
      {label}
      {count > 0 && (
        <Box component="span" sx={{ fontSize: 11, fontWeight: 800, bgcolor: 'primary.main', color: colour.white, borderRadius: `${radius.pill}px`, px: '7px', py: '1px' }}>
          {count}
        </Box>
      )}
    </ButtonBase>
  );
}

function Toast({ tone, message, actionLabel, onAction }: { tone: 'done' | 'warning'; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <Box role="status" sx={{ bgcolor: 'text.primary', color: colour.white, borderRadius: `${radius.control}px`, px: 4, py: 3, display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, minWidth: 320, maxWidth: 520 }}>
      {tone === 'done' ? (
        <Icon stroke={colour.green} width={3}><path d="M5 12.5l4.5 4.5L19 7" /></Icon>
      ) : (
        <Icon stroke={colour.amber}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></Icon>
      )}
      <Box component="span" sx={{ flex: 1 }}>{message}</Box>
      {actionLabel && onAction && (
        <ButtonBase onClick={onAction} sx={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: colour.blueLight, borderRadius: 1, px: 0.5 }}>
          {actionLabel}
        </ButtonBase>
      )}
    </Box>
  );
}

/**
 * The Task Timeline, as drawn on the Command board: only the tasks that need attention, grouped
 * by runbook then stage, sorted by start time, with one action per row, bulk Start and Complete,
 * and Undo for the linger.
 */
export function RbmTaskTimeline(props: RbmTaskTimelineProps) {
  const { runbooks, tasks, now, timeZone, lingerSeconds = 60, onAction, onOpen, notice, onNoticeClose, stickyTop } = props;
  const { palette } = useTheme();
  const [filterState, setFilterState] = useState<string[]>([]);
  const runbookFilter = props.runbookFilter ?? filterState;
  const setRunbookFilter = (ids: string[]) => {
    setFilterState(ids);
    props.onRunbookFilterChange?.(ids);
  };
  const [scope, setScope] = useState<RbmTimelineScope>('focus');
  const [narrow, setNarrow] = useState<ReadonlySet<Narrow>>(new Set());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [upNextOpen, setUpNextOpen] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; undo: RbmTask[] } | null>(null);
  const body = useRef<HTMLDivElement>(null);

  const filtered = runbookFilter.length > 0 && runbookFilter.length < runbooks.length;
  const inFilter = (id: string) => !filtered || runbookFilter.includes(id);
  const flip = <T,>(set: ReadonlySet<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  // The tasks in scope, before Mine, Late and Blocked narrow them.
  const scoped = tasks
    .filter((t) => inFilter(t.runbookId) && t.state !== 'skipped')
    .map((t) => ({ t, reasons: focusReasons(t, now, lingerSeconds) }))
    .filter(({ reasons }) => scope === 'all' || reasons.length > 0);
  const matches: Record<Narrow, (t: RbmTimelineTask) => boolean> = {
    mine: (t) => !!t.assignedToMe,
    late: (t) => !!(t.flags?.lateToStart || t.flags?.lateToFinish),
    blocked: (t) => !!t.flags?.blocked || t.state === 'blocked',
  };
  const counts = { mine: 0, late: 0, blocked: 0 };
  for (const { t } of scoped) for (const k of ['mine', 'late', 'blocked'] as const) if (matches[k](t)) counts[k]++;
  // Filters combine, and they only ever narrow the set.
  const shown = scoped.filter(({ t }) => [...narrow].every((k) => matches[k](t)));

  // A lingering task keeps its Green tick and counts down "leaves in 0:42".
  const rowTask = (t: RbmTimelineTask, lingering: boolean): RbmTimelineTask =>
    lingering ? { ...t, tag: { kind: 'complete', label: `Complete · leaves in ${formatLinger(lingerLeft(t, now, lingerSeconds))}` } } : t;

  // Group once by runbook and stage, so a large event is not scanned once per stage.
  const byStage = new Map<string, typeof shown>();
  const byRunbook = new Map<string, number>();
  for (const x of shown) {
    (byStage.get(x.t.stageId) ?? byStage.set(x.t.stageId, []).get(x.t.stageId)!).push(x);
    byRunbook.set(x.t.runbookId, (byRunbook.get(x.t.runbookId) ?? 0) + 1);
  }
  const large = shown.length > LARGE_TIMELINE;
  // In a large timeline, runbooks with nothing blocked or late start collapsed, so the trouble stays on screen.
  const troubled = new Set(shown.filter(({ t }) => matches.blocked(t) || matches.late(t)).map(({ t }) => t.runbookId));
  const isClosed = (key: string, runbookId?: string) => collapsed.has(key) !== (large && runbookId !== undefined && !troubled.has(runbookId));

  const groups = runbooks
    .filter((r) => inFilter(r.id))
    .map((r) => {
      const stages = r.stages
        .map((s) => {
          const sorted = (byStage.get(s.id) ?? []).slice().sort((a, b) => byStart(a.t, b.t));
          const { shown: capped, more } = capUpNext(sorted.map((x) => x.t), new Set([...upNextOpen].filter((k) => k.startsWith(`${s.id}|`)).map((k) => k.slice(s.id.length + 1))));
          const lingering = new Set(sorted.filter((x) => x.reasons.includes('lingering')).map((x) => x.t.id));
          return { s, rows: capped.map((t) => rowTask(t, lingering.has(t.id))), more };
        })
        .filter((g) => g.rows.length > 0 || g.more.size > 0);
      return { r, stages, inFocus: byRunbook.get(r.id) ?? 0 };
    })
    .filter((g) => g.stages.length > 0);

  const allRows = groups.flatMap((g) => (isClosed(g.r.id, g.r.id) ? [] : g.stages.flatMap((s) => (isClosed(`${g.r.id}/${s.s.id}`) ? [] : s.rows))));
  const focusCount = new Map<string, number>();
  for (const t of tasks) if (focusReasons(t, now, lingerSeconds).length > 0) focusCount.set(t.runbookId, (focusCount.get(t.runbookId) ?? 0) + 1);
  const shownCount = groups.reduce((n, g) => n + g.inFocus, 0);
  const consideredRunbooks = runbooks.filter((r) => inFilter(r.id));
  const hiddenComplete = consideredRunbooks.reduce((n, r) => n + r.hidden.complete, 0);
  const hiddenNotReady = consideredRunbooks.reduce((n, r) => n + r.hidden.notAvailable, 0);
  const total = shownCount + (scope === 'focus' ? hiddenComplete + hiddenNotReady : 0);
  const rovingId = focusedId && allRows.some((t) => t.id === focusedId) ? focusedId : allRows[0]?.id;

  const selectedTasks = allRows.filter((t) => selected.has(t.id));
  const canBulk = (a: 'start' | 'complete') => selectedTasks.length > 0 && selectedTasks.every((t) => t.action === a);

  const act = (task: RbmTask, event: RbmTaskActionEvent) => {
    onAction?.(task, event);
    if (event.type === 'complete') setToast({ message: `${task.wbs} completed at ${timeOf(now, timeZone)}`, undo: [task] });
  };
  const bulk = (a: 'start' | 'complete') => {
    for (const t of selectedTasks) onAction?.(t, { type: a });
    if (a === 'complete') setToast({ message: `${selectedTasks.length} ${selectedTasks.length === 1 ? 'task' : 'tasks'} completed at ${timeOf(now, timeZone)}`, undo: selectedTasks });
    setSelected(new Set());
  };

  // J and K move between tasks, N jumps to now (the first active task). Enter, S and C belong to the row.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const rows = Array.from(body.current?.querySelectorAll<HTMLElement>('[data-task]') ?? []);
    const i = rows.indexOf(e.target as HTMLElement);
    const key = e.key.toLowerCase();
    if ((key === 'j' || key === 'k') && i >= 0) {
      e.preventDefault();
      rows[Math.min(Math.max(i + (key === 'j' ? 1 : -1), 0), rows.length - 1)]?.focus();
    } else if (key === 'n' && (i >= 0 || e.target === e.currentTarget)) {
      e.preventDefault();
      const first = rows.find((r) => r.dataset.state === 'active');
      first?.focus();
      first?.scrollIntoView?.({ block: 'center' });
    }
  };

  const spineFor = (rows: RbmTimelineTask[], i: number): { above?: RbmSpine; below?: RbmSpine } => ({
    above: i === 0 ? undefined : rows[i - 1]!.state === 'complete' ? 'done' : 'todo',
    below: i === rows.length - 1 ? undefined : rows[i]!.state === 'complete' ? 'done' : 'todo',
  });

  const ragOnDark: Record<RbmRag, string> = { green: palette.status.complete.signal, amber: palette.status.atRisk.signal, red: palette.status.blocked.signal };

  return (
    // overflow: clip (not hidden) keeps the rounded corners without stopping the toolbar from sticking.
    <Box component="section" aria-label="Task Timeline" sx={{ position: 'relative', border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', overflow: 'clip', minWidth: 0, lineHeight: 'normal' }}>
      <Box sx={stickyTop === undefined ? undefined : { position: 'sticky', top: stickyTop, zIndex: 4, bgcolor: 'background.paper' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: 64, px: 4, borderBottom: 1, borderColor: 'divider', boxSizing: 'border-box' }}>
        <RbmRunbookFilter
          runbooks={runbooks.map((r) => ({ id: r.id, wbs: r.wbs, name: r.name, recordId: r.recordId, rag: r.rag, inFocus: focusCount.get(r.id) ?? 0 }))}
          selected={runbookFilter}
          onChange={setRunbookFilter}
        />
        <Chip label="Mine" count={counts.mine} on={narrow.has('mine')} onClick={() => setNarrow(flip(narrow, 'mine'))} />
        <Chip label="Late" count={counts.late} on={narrow.has('late')} onClick={() => setNarrow(flip(narrow, 'late'))} />
        <Chip label="Blocked" count={counts.blocked} on={narrow.has('blocked')} onClick={() => setNarrow(flip(narrow, 'blocked'))} />
        <Box sx={{ flex: 1 }} />
        <Box role="group" aria-label="Scope" sx={{ display: 'inline-flex', gap: '2px', p: '3px', borderRadius: `${radius.pill}px`, bgcolor: hairline }}>
          {(['focus', 'all'] as const).map((sc) => (
            <ButtonBase
              key={sc}
              aria-pressed={scope === sc}
              onClick={() => setScope(sc)}
              sx={{ height: 32, px: 3, borderRadius: `${radius.pill}px`, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: scope === sc ? 'primary.main' : 'text.secondary', bgcolor: scope === sc ? colour.white : 'transparent', boxShadow: scope === sc ? '0 1px 3px rgba(31,36,48,0.18)' : 'none' }}
            >
              {sc === 'focus' ? 'Focus' : 'All'}
            </ButtonBase>
          ))}
        </Box>
      </Box>

      {/* Summary line: nothing is hidden silently */}
      <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 2, height: 40, px: 5, bgcolor: surfaceTint, borderBottom: 1, borderColor: 'divider', boxSizing: 'border-box', fontSize: 13, color: 'text.secondary' }}>
        <Icon size={16}><path d="M4 6h16M7 12h10M10 18h4" /></Icon>
        <span>
          Showing{' '}
          <Box component="strong" sx={{ color: 'text.primary' }}>
            {shownCount} of {total} tasks
          </Box>{' '}
          in {groups.length}
          {filtered ? '' : ` of ${runbooks.length}`} {groups.length === 1 && filtered ? 'runbook' : 'runbooks'}
          {scope === 'focus' && ` · ${hiddenComplete} complete and ${hiddenNotReady} not ready hidden`}
        </span>
        <Box sx={{ flex: 1 }} />
        {(scope === 'focus' || narrow.size > 0) && (
          <ButtonBase onClick={() => { setScope('all'); setNarrow(new Set()); }} sx={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, whiteSpace: 'nowrap' }}>
            Show all
          </ButtonBase>
        )}
      </Box>
      </Box>

      {/* Runbook panels */}
      <Box ref={body} onKeyDown={onKeyDown} sx={{ p: 3, bgcolor: hairline, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {groups.length === 0 && (
          <Box sx={{ p: 6, textAlign: 'center', fontSize: 14, color: 'text.secondary', bgcolor: 'background.paper', borderRadius: `${radius.control}px` }}>No tasks match.</Box>
        )}
        {groups.map(({ r, stages, inFocus }) => {
          const rOpen = !isClosed(r.id, r.id);
          return (
            <Box key={r.id} data-runbook={r.id} sx={{ border: `1px solid ${colour.silver}`, borderRadius: `${radius.control}px`, overflow: 'hidden', bgcolor: 'background.paper', boxShadow: '0 1px 2px rgba(31,36,48,0.06)' }}>
              <ButtonBase
                onClick={() => setCollapsed(flip(collapsed, r.id))}
                aria-expanded={rOpen}
                aria-label={`${r.wbs} ${r.name}, ${r.recordId}, ${inFocus} in focus, forecast end ${timeOf(r.forecastEnd, timeZone)}, ${shortGap(r.gapMinutes)}`}
                sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 3, height: 60, px: 5, bgcolor: 'primary.main', color: colour.white, textAlign: 'left', fontFamily: 'inherit', '&.Mui-focusVisible': { outlineOffset: -4, outlineColor: colour.white } }}
              >
                <Icon stroke={colour.white}>{chevron(rOpen)}</Icon>
                <Box component="span" sx={{ fontSize: 14, fontWeight: 800, color: colour.blueLight, fontVariantNumeric: 'tabular-nums', minWidth: 20 }}>{r.wbs}</Box>
                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2.5, fontSize: 14, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {r.name}
                    <Box component="span" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', px: 2, py: 0.5, borderRadius: `${radius.pill}px`, border: '1px solid rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{r.recordId}</Box>
                  </Box>
                  <Box component="span" sx={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap' }}>
                    {inFocus} in focus
                    {scope === 'focus' && (r.hidden.complete > 0 || r.hidden.notAvailable > 0) &&
                      ` · ${[r.hidden.complete > 0 ? `${r.hidden.complete} complete` : '', r.hidden.notAvailable > 0 ? `${r.hidden.notAvailable} not yet available` : ''].filter(Boolean).join(' and ')} hidden`}
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }} />
                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                  <Box component="span" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: colour.blueLight }}>FORECAST END</Box>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontVariantNumeric: 'tabular-nums' }}>
                    <Box component="span" sx={{ fontSize: 16, fontWeight: 800 }}>{timeOf(r.forecastEnd, timeZone)}</Box>
                    {r.rag === 'amber' ? (
                      <Box component="span" sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: palette.status.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box component="span" sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: palette.status.atRisk.core, border: `2px solid ${colour.white}`, boxSizing: 'border-box' }} />
                      </Box>
                    ) : (
                      <Box component="span" sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: ragOnDark[r.rag] }} />
                    )}
                    <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: ragOnDark[r.rag] }}>{shortGap(r.gapMinutes)}</Box>
                  </Box>
                </Box>
              </ButtonBase>

              {rOpen &&
                stages.map(({ s, rows, more }) => {
                  const key = `${r.id}/${s.id}`;
                  const sOpen = !isClosed(key);
                  return (
                    <Box key={s.id} role="list" aria-label={`Stage ${s.wbs} ${s.name}`}>
                      <ButtonBase
                        onClick={() => setCollapsed(flip(collapsed, key))}
                        aria-expanded={sOpen}
                        aria-label={`Stage ${s.wbs} ${s.name}, ${timeOf(s.start, timeZone)} to ${timeOf(s.end, timeZone)}, ${s.complete} of ${s.total} complete`}
                        sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 3, height: 44, px: 5, bgcolor: 'grey.100', borderTop: 1, borderBottom: 1, borderColor: 'divider', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'inherit', '&.Mui-focusVisible': { outlineOffset: -2 } }}
                      >
                        <Icon stroke={colour.slate}>{chevron(sOpen)}</Icon>
                        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: palette.status[s.state].signal, flex: 'none' }} />
                        <Box component="span" sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{s.wbs}</Box>
                        <Box component="span" sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', color: 'primary.main', textTransform: 'uppercase' }}>{s.name}</Box>
                        <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{timeOf(s.start, timeZone)} – {timeOf(s.end, timeZone)}</Box>
                        <Box sx={{ flex: 1 }} />
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: 'text.secondary' }}>
                          <Box component="span" sx={{ width: 72, height: 6, borderRadius: '3px', bgcolor: 'divider', overflow: 'hidden', display: 'inline-block' }}>
                            <Box component="span" sx={{ display: 'block', width: `${s.total ? (s.complete / s.total) * 100 : 0}%`, height: '100%', bgcolor: palette.status[s.state === 'complete' ? 'complete' : 'active'].signal }} />
                          </Box>
                          {s.complete} of {s.total}
                        </Box>
                      </ButtonBase>
                      {sOpen && (
                        <StageRows
                          count={rows.length}
                          virtual={large}
                          render={(i) => {
                            const t = rows[i]!;
                            return (
                              <Box key={t.id} role="listitem" onFocusCapture={(e) => (e.target as HTMLElement).dataset.task && setFocusedId(t.id)}>
                                <RbmTaskRow
                                  task={t}
                                  now={now}
                                  timeZone={timeZone}
                                  spine={spineFor(rows, i)}
                                  tabIndex={t.id === rovingId ? 0 : -1}
                                  selected={selected.has(t.id)}
                                  onSelectedChange={(on) => setSelected(on === selected.has(t.id) ? selected : flip(selected, t.id))}
                                  onAction={act}
                                  onOpen={onOpen}
                                />
                              </Box>
                            );
                          }}
                        />
                      )}
                      {sOpen &&
                        [...more].map(([after, n]) => (
                          <Box key={after} sx={{ display: 'flex', alignItems: 'center', height: 40, pl: '192px', borderBottom: `1px solid ${hairline}` }}>
                            <ButtonBase onClick={() => setUpNextOpen(new Set(upNextOpen).add(`${s.id}|${after}`))} sx={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5 }}>
                              +{n} more up next after {after}
                            </ButtonBase>
                          </Box>
                        ))}
                    </Box>
                  );
                })}
            </Box>
          );
        })}
      </Box>

      {/* Bulk bar: only actions valid for every selected row are enabled */}
      {selectedTasks.length > 0 && (
        <Box sx={{ position: 'sticky', bottom: 16, mx: 4, mb: 4, bgcolor: 'primary.main', borderRadius: `${radius.card}px`, px: 3.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 2.5, color: colour.white, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(31,36,48,0.25)' }}>
          <Box component="span" aria-live="polite" sx={{ bgcolor: 'rgba(255,255,255,0.16)', borderRadius: `${radius.pill}px`, px: 2.5, py: '3px' }}>
            {selectedTasks.length} selected
          </Box>
          <Box sx={{ flex: 1 }} />
          <ButtonBase disabled={!canBulk('start')} onClick={() => bulk('start')} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 32, px: 3, borderRadius: `${radius.control}px`, border: '1px solid rgba(255,255,255,0.45)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colour.white, '&.Mui-disabled': { opacity: 0.45 } }}>
            <Icon size={14} stroke={colour.white} width={2.5}><path d="M8 5l11 7-11 7z" /></Icon>
            Start
          </ButtonBase>
          <ButtonBase disabled={!canBulk('complete')} onClick={() => bulk('complete')} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 32, px: 3, borderRadius: `${radius.control}px`, bgcolor: colour.green, fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: colour.deepBlue, '&.Mui-disabled': { opacity: 0.45 } }}>
            <Icon size={15} stroke={colour.deepBlue} width={3}><path d="M5 12.5l4.5 4.5L19 7" /></Icon>
            Complete
          </ButtonBase>
          <ButtonBase onClick={() => setSelected(new Set())} sx={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colour.blueLight, borderRadius: 1, px: 0.5 }}>
            Clear
          </ButtonBase>
        </Box>
      )}

      <Snackbar open={toast !== null} autoHideDuration={lingerSeconds * 1000} onClose={(_, reason) => reason !== 'clickaway' && setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Box>
          {toast && (
            <Toast
              tone="done"
              message={toast.message}
              actionLabel="Undo"
              onAction={() => {
                for (const t of toast.undo) onAction?.(t, { type: 'undo' });
                setToast(null);
              }}
            />
          )}
        </Box>
      </Snackbar>
      <Snackbar open={!!notice} onClose={(_, reason) => reason !== 'clickaway' && onNoticeClose?.()} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Box>{notice && <Toast tone="warning" message={notice.message} actionLabel={notice.actionLabel} onAction={notice.onAction} />}</Box>
      </Snackbar>
    </Box>
  );
}
