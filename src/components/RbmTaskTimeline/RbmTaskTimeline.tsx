import { Box, ButtonBase, Snackbar, useTheme } from '@mui/material';
import { useDeferredValue, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type CSSProperties } from 'react';
import { RbmTaskRow, type RbmTask } from '../RbmTaskRow/RbmTaskRow';
import type { RbmTaskActionEvent } from '../RbmTaskRow/RbmTaskAction';
import type { RbmSpine } from '../RbmNode/RbmNode';
import type { RbmRag } from '../RbmEventVitals/RbmEventVitals';
import { colour, hairline, radius, surfaceTint, type RbmState, stroke } from '../../theme/tokens';
import { RbmRunbookFilter } from './RbmRunbookFilter';
import { RbmTaskSearch } from './RbmTaskSearch';
import { RbmBusyOverlay, useRbmBusy, type RbmBusyOptions } from '../RbmBusy/RbmBusy';
import { DEFAULT_SEARCH_FIELDS, matchesSearch, searchWords, type RbmSearchField } from './taskSearch';
import { RbmRegionCollapsed, RbmRegionToggle, RbmSummaryChip } from '../RbmRegion/RbmRegion';
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
  /** From the planning engine: the stage's planned end and its forecast against it, as for a runbook. */
  plannedEnd?: Date;
  gapMinutes?: number;
  rag?: RbmRag;
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
  /**
   * Fetches every task before Show all, All, "more outside Focus" or Expand all applies: a server
   * query on the platform. While it runs (and while the rows are drawn), "Loading all tasks" shows
   * over the timeline, with Cancel.
   */
  onLoadAll?: (signal: AbortSignal) => Promise<void>;
  /** Timing of that feedback; tests set it to 0. */
  busyOptions?: RbmBusyOptions;
  /** The fields the search looks in. The task title only by default; add more as they become available. */
  searchFields?: RbmSearchField[];
  /** Open by default. Collapsed, it is one line with the focus, late and blocked counts. Pass with onCollapsedChange to remember the choice. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/** Progress as a whole percentage, rounded down so nothing looks further on than it is. */
const progressOf = (complete: number, total: number) => ({ complete, total, percent: total ? Math.floor((complete / total) * 100) : 0 });

/** A runbook's progress: tasks complete of all its tasks, from its stages' counts. */
export function runbookProgress(r: Pick<RbmTimelineRunbook, 'stages'>) {
  return progressOf(r.stages.reduce((n, s) => n + s.complete, 0), r.stages.reduce((n, s) => n + s.total, 0));
}

/** A stage's progress: tasks complete of all its tasks. */
export const stageProgress = (s: Pick<RbmTimelineStage, 'complete' | 'total'>) => progressOf(s.complete, s.total);

type Tone = 'dark' | 'light';

// The summaries are plain elements with inline styles, not MUI sx: with hundreds of stages open,
// each styled element costs a generated class, and Show all on a large event slowed by seconds.
const eyebrow = (dark: boolean): CSSProperties => ({ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: dark ? colour.blueLight : colour.slate });
const column: CSSProperties = { display: 'flex', flexDirection: 'column' };
const row: CSSProperties = { display: 'inline-flex', alignItems: 'center', fontVariantNumeric: 'tabular-nums' };

/**
 * PROGRESS: a 160 px bar, the percentage and "complete of total". On the dark runbook band and the
 * light stage row, with the same widths so the bars line up down the timeline. Not drawn (flagged).
 */
function ProgressSummary({ complete, total, percent, tone }: { complete: number; total: number; percent: number; tone: Tone }) {
  const { palette } = useTheme();
  const dark = tone === 'dark';
  return (
    <span aria-hidden="true" data-testid={dark ? 'rbm-runbook-progress' : 'rbm-stage-progress'} style={{ ...column, gap: 3, marginRight: 32, flex: 'none' }}>
      <span style={eyebrow(dark)}>PROGRESS</span>
      <span style={{ ...row, gap: 10 }}>
        <span style={{ width: 160, height: dark ? 8 : 6, borderRadius: 4, background: dark ? 'rgba(255,255,255,0.22)' : palette.divider, overflow: 'hidden', display: 'inline-block' }}>
          <span style={{ display: 'block', width: `${percent}%`, height: '100%', borderRadius: 4, background: palette.status.complete.signal }} />
        </span>
        <span style={{ fontSize: dark ? 16 : 14, fontWeight: 800, minWidth: 44, textAlign: 'right', color: dark ? colour.white : palette.text.primary }}>{percent}%</span>
        <span style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.72)' : palette.text.secondary, whiteSpace: 'nowrap', minWidth: 76 }}>
          {complete} of {total}
        </span>
      </span>
    </span>
  );
}

/** FORECAST END: the time, the RAG mark and the gap, on the dark band or the light stage row. */
function ForecastSummary({ end, rag, gapMinutes, tone, timeZone }: { end: Date; rag?: RbmRag; gapMinutes?: number; tone: Tone; timeZone?: string }) {
  const { palette } = useTheme();
  const dark = tone === 'dark';
  const signal: Record<RbmRag, string> = { green: palette.status.complete.signal, amber: palette.status.atRisk.signal, red: palette.status.blocked.signal };
  // On white, the gap is written in the darker text colours, which are easier to read.
  const text: Record<RbmRag, string> = dark ? signal : { green: palette.status.complete.text, amber: palette.status.atRisk.text, red: palette.status.blocked.text };
  return (
    <span aria-hidden="true" style={{ ...column, alignItems: 'flex-end', gap: 1, minWidth: 124 }}>
      <span style={eyebrow(dark)}>FORECAST END</span>
      <span style={{ ...row, gap: 7 }}>
        <span style={{ fontSize: dark ? 16 : 14, fontWeight: 800, color: dark ? colour.white : palette.text.primary }}>{timeOf(end, timeZone)}</span>
        {rag === 'amber' && (
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: palette.status.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: palette.status.atRisk.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
          </span>
        )}
        {rag && rag !== 'amber' && <span style={{ width: 9, height: 9, borderRadius: '50%', background: signal[rag] }} />}
        {rag && gapMinutes !== undefined && <span style={{ fontSize: 12, fontWeight: 700, color: text[rag] }}>{shortGap(gapMinutes)}</span>}
      </span>
    </span>
  );
}

/** A runbook's own filters, inside its panel: they narrow only that runbook. */
interface RunbookTools {
  query: string;
  narrow: ReadonlySet<Narrow>;
}
const NO_TOOLS: RunbookTools = { query: '', narrow: new Set() };

/** Above this many tasks in view, rows are drawn only near the screen and quiet runbooks start collapsed. */
export const LARGE_TIMELINE = 200;
const ROW = 52;

/**
 * A stage's rows, drawn only near the screen when the timeline is large. Rows are 52 px, so the
 * stage keeps its full height and the page scrolls as if every row were there.
 */
function StageRows({ count, virtual, render }: { count: number; virtual: boolean; render: (i: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Nothing is drawn until the stage has measured where it is (before the first paint): drawing 20 rows
  // in each of hundreds of stages first made showing every task on a large event take many seconds.
  const [range, setRange] = useState<[number, number]>(() => [0, virtual ? 0 : count]);
  useLayoutEffect(() => {
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

function Chip({ label, count, on, onClick, small, ariaLabel }: { label: string; count: number; on: boolean; onClick: () => void; small?: boolean; ariaLabel?: string }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={on}
      aria-label={ariaLabel}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: small ? 28 : 32, px: small ? 2.5 : 3, borderRadius: `${radius.pill}px`, border: `${stroke.thin}px solid ${on ? colour.deepBlue : colour.silver}`, bgcolor: on ? 'rgba(35,50,111,0.08)' : colour.white, fontFamily: 'inherit', fontSize: small ? 12 : 13, fontWeight: 600, color: 'primary.main', whiteSpace: 'nowrap' }}
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

function SummaryCount({ n, text }: { n: number; text: string }) {
  return (
    <RbmSummaryChip label={`${n} ${text}`}>
      <span>
        <Box component="strong" sx={{ color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{n}</Box>{' '}
        <Box component="span" sx={{ color: 'text.secondary' }}>{text}</Box>
      </span>
    </RbmSummaryChip>
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
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  // Typing stays quick on a large event: the list catches up a moment later.
  const words = searchWords(useDeferredValue(query));
  const searching = words.length > 0;
  const searchFields = props.searchFields ?? DEFAULT_SEARCH_FIELDS;
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [tools, setTools] = useState<ReadonlyMap<string, RunbookTools>>(new Map());
  const toolsFor = (id: string) => tools.get(id) ?? NO_TOOLS;
  const changeTools = (id: string, change: Partial<RunbookTools>) => setTools((prev) => new Map(prev).set(id, { ...(prev.get(id) ?? NO_TOOLS), ...change }));
  const busy = useRbmBusy(props.busyOptions);
  // Everything that widens the timeline to all tasks can mean a large query, so it says so while it runs.
  // heavy: the result will be large to draw, so the feedback shows at once.
  const loadAll = (label: string, apply: () => void, heavy: boolean) => busy.run({ label, detail: 'This can take a moment on a large event.', load: props.onLoadAll, apply, heavy, errorText: 'Could not load all tasks. Try again.' });
  const [regionCollapsedState, setRegionCollapsedState] = useState(false);
  const regionCollapsed = props.collapsed ?? regionCollapsedState;
  const setRegionCollapsed = (c: boolean) => {
    setRegionCollapsedState(c);
    props.onCollapsedChange?.(c);
  };

  const filtered = runbookFilter.length > 0 && runbookFilter.length < runbooks.length;
  const inFilter = (id: string) => !filtered || runbookFilter.includes(id);
  const flip = <T,>(set: ReadonlySet<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  // The tasks that match the runbook filter and the search, then those in scope, before Mine, Late and Blocked narrow them.
  // The search narrows like every other filter: matches outside Focus are counted, not shown.
  const searchable = tasks
    .filter((t) => inFilter(t.runbookId) && t.state !== 'skipped' && matchesSearch(t, words, searchFields))
    .map((t) => ({ t, reasons: focusReasons(t, now, lingerSeconds) }));
  const scoped = searchable.filter(({ reasons }) => scope === 'all' || reasons.length > 0);
  const outsideFocus = searching && scope === 'focus' ? searchable.length - scoped.length : 0;
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
  // While searching, every runbook with a match starts open, so no match is tucked away.
  const closedByDefault = (runbookId: string) => large && !searching && !troubled.has(runbookId);
  const isClosed = (key: string, runbookId?: string) => collapsed.has(key) !== (runbookId !== undefined && closedByDefault(runbookId));

  const groups = runbooks
    .filter((r) => inFilter(r.id))
    .map((r) => {
      const own = toolsFor(r.id);
      const ownWords = searchWords(own.query);
      const ownFiltered = ownWords.length > 0 || own.narrow.size > 0;
      const keep = (x: (typeof shown)[number]) => matchesSearch(x.t, ownWords, searchFields) && [...own.narrow].every((k) => matches[k](x.t));
      // Counts for the runbook's own chips: its tasks after the main filters, before its own.
      const before = r.stages.flatMap((s) => byStage.get(s.id) ?? []);
      const ownCounts = { mine: 0, late: 0, blocked: 0 };
      for (const { t } of before) for (const k of ['mine', 'late', 'blocked'] as const) if (matches[k](t)) ownCounts[k]++;
      const stages = r.stages
        .map((s) => {
          const sorted = (byStage.get(s.id) ?? []).filter(keep).sort((a, b) => byStart(a.t, b.t));
          // A search shows every match: "+n more up next" never hides one.
          const { shown: capped, more } = searching || ownWords.length > 0
            ? { shown: sorted.map((x) => x.t), more: new Map<string, number>() }
            : capUpNext(sorted.map((x) => x.t), new Set([...upNextOpen].filter((k) => k.startsWith(`${s.id}|`)).map((k) => k.slice(s.id.length + 1))));
          const lingering = new Set(sorted.filter((x) => x.reasons.includes('lingering')).map((x) => x.t.id));
          return { s, rows: capped.map((t) => rowTask(t, lingering.has(t.id))), more, inFocus: sorted.length };
        })
        .filter((g) => g.rows.length > 0 || g.more.size > 0);
      const ownShown = stages.reduce((n, g) => n + g.inFocus, 0);
      return { r, stages, inFocus: byRunbook.get(r.id) ?? 0, own, ownFiltered, ownCounts, ownShown, ownTotal: before.length };
    })
    // A runbook stays while the main filters leave it any task, even if its own filters hide them all, so they can be cleared.
    .filter((g) => g.ownTotal > 0);

  const anyRunbookOpen = groups.some((g) => !isClosed(g.r.id, g.r.id));
  // Collapse all or Expand all: every runbook band, leaving each stage as the user set it.
  const setAllRunbooks = (close: boolean) =>
    setCollapsed(new Set([...[...collapsed].filter((k) => k.includes('/')), ...runbooks.filter((r) => close !== closedByDefault(r.id)).map((r) => r.id)]));
  const setAllStages = (r: RbmTimelineRunbook, close: boolean) => {
    const next = new Set(collapsed);
    for (const st of r.stages) {
      if (close) next.add(`${r.id}/${st.id}`);
      else next.delete(`${r.id}/${st.id}`);
    }
    setCollapsed(next);
  };
  const matchingTasks = groups.flatMap((g) => g.stages.flatMap((s) => s.rows));
  // A suggestion was chosen: narrow to it, open its runbook and stage, then focus its row.
  // From a runbook's own search, that runbook's search narrows; from the toolbar, the main one.
  const pickTask = (t: RbmTimelineTask, inRunbook = false) => {
    if (inRunbook) changeTools(t.runbookId, { query: t.title });
    else setQuery(t.title);
    const next = new Set(collapsed);
    if (closedByDefault(t.runbookId)) next.add(t.runbookId);
    else next.delete(t.runbookId);
    next.delete(`${t.runbookId}/${t.stageId}`);
    setCollapsed(next);
    setPendingFocus(t.id);
  };
  useEffect(() => {
    if (!pendingFocus) return;
    const row = body.current?.querySelector<HTMLElement>(`[data-task="${CSS.escape(pendingFocus)}"]`);
    if (!row) return;
    row.focus();
    row.scrollIntoView?.({ block: 'center' });
    setPendingFocus(null);
  });

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
    if (key === '/') {
      e.preventDefault();
      searchInput.current?.focus();
    } else if ((key === 'j' || key === 'k') && i >= 0) {
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


  // Messages stay on screen when the region is collapsed, so a refusal or Undo is never lost.
  const messages = (
    <>
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
    </>
  );

  if (regionCollapsed) {
    // The focus set within the runbook filter, whatever the scope and chips; the counts match the Late and Blocked chips in Focus.
    const focused = tasks.filter((t) => inFilter(t.runbookId) && t.state !== 'skipped' && focusReasons(t, now, lingerSeconds).length > 0);
    const late = focused.filter(matches.late).length;
    const blocked = focused.filter(matches.blocked).length;
    const runbookCount = runbooks.filter((r) => inFilter(r.id)).length;
    return (
      <>
        <RbmRegionCollapsed title="Task Timeline" onExpand={() => setRegionCollapsed(false)}>
          <SummaryCount n={focused.length} text="in focus" />
          <SummaryCount n={late} text="late" />
          <SummaryCount n={blocked} text="blocked" />
          {filtered && <SummaryCount n={runbookCount} text={`of ${runbooks.length} runbooks`} />}
        </RbmRegionCollapsed>
        {messages}
      </>
    );
  }

  return (
    // overflow: clip (not hidden) keeps the rounded corners without stopping the toolbar from sticking.
    <Box component="section" aria-label="Task Timeline" sx={{ position: 'relative', border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', overflow: 'clip', minWidth: 0, lineHeight: 'normal' }}>
      <RbmBusyOverlay busy={busy} />
      <Box {...busy.contentProps} sx={stickyTop === undefined ? undefined : { position: 'sticky', top: stickyTop, zIndex: 4, bgcolor: 'background.paper' }}>
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
        <Box sx={{ ml: 1, display: 'flex', minWidth: 0 }}>
          <RbmTaskSearch
            ref={searchInput}
            value={query}
            onChange={setQuery}
            suggestions={matchingTasks}
            fields={searchFields}
            runbookNames={new Map(runbooks.map((r) => [r.id, r.name]))}
            onPick={pickTask}
          />
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box role="group" aria-label="Scope" sx={{ display: 'inline-flex', gap: '2px', p: '3px', borderRadius: `${radius.pill}px`, bgcolor: hairline }}>
          {(['focus', 'all'] as const).map((sc) => (
            <ButtonBase
              key={sc}
              aria-pressed={scope === sc}
              onClick={() => (sc === 'all' && scope !== 'all' ? loadAll('Loading all tasks', () => setScope('all'), tasks.length > LARGE_TIMELINE) : setScope(sc))}
              sx={{ height: 32, px: 3, borderRadius: `${radius.pill}px`, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: scope === sc ? 'primary.main' : 'text.secondary', bgcolor: scope === sc ? colour.white : 'transparent', boxShadow: scope === sc ? '0 1px 3px rgba(31,36,48,0.18)' : 'none' }}
            >
              {sc === 'focus' ? 'Focus' : 'All'}
            </ButtonBase>
          ))}
        </Box>
        <RbmRegionToggle region="Task Timeline" collapsed={false} onChange={setRegionCollapsed} sx={{ ml: 2 }} />
      </Box>

      {/* Summary line: nothing is hidden silently */}
      <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 2, height: 40, px: 5, bgcolor: surfaceTint, borderBottom: 1, borderColor: 'divider', boxSizing: 'border-box', fontSize: 13, color: 'text.secondary' }}>
        <Icon size={16}><path d="M4 6h16M7 12h10M10 18h4" /></Icon>
        {searching ? (
          <span>
            Showing{' '}
            <Box component="strong" sx={{ color: 'text.primary' }}>
              {shownCount} {shownCount === 1 ? 'task' : 'tasks'}
            </Box>{' '}
            matching “{query.trim()}” in {groups.length} {groups.length === 1 ? 'runbook' : 'runbooks'}
            {scope === 'focus' ? ' · Focus' : ''}
          </span>
        ) : (
          <span>
            Showing{' '}
            <Box component="strong" sx={{ color: 'text.primary' }}>
              {shownCount} of {total} tasks
            </Box>{' '}
            in {groups.length}
            {filtered ? '' : ` of ${runbooks.length}`} {groups.length === 1 && filtered ? 'runbook' : 'runbooks'}
            {scope === 'focus' && ` · ${hiddenComplete} complete and ${hiddenNotReady} not ready hidden`}
          </span>
        )}
        {outsideFocus > 0 && (
          <ButtonBase onClick={() => loadAll('Loading all tasks', () => setScope('all'), tasks.length > LARGE_TIMELINE)} sx={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, whiteSpace: 'nowrap' }}>
            {outsideFocus} more outside Focus
          </ButtonBase>
        )}
        <Box sx={{ flex: 1 }} />
        {groups.length > 0 && (
          <ButtonBase onClick={() => (anyRunbookOpen ? setAllRunbooks(true) : loadAll('Expanding all runbooks', () => setAllRunbooks(false), shown.length > LARGE_TIMELINE))} aria-label={anyRunbookOpen ? 'Collapse all runbooks' : 'Expand all runbooks'} sx={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, whiteSpace: 'nowrap' }}>
            {anyRunbookOpen ? 'Collapse all' : 'Expand all'}
          </ButtonBase>
        )}
        {(scope === 'focus' || narrow.size > 0) && (
          <ButtonBase onClick={() => loadAll('Loading all tasks', () => { setScope('all'); setNarrow(new Set()); }, tasks.length > LARGE_TIMELINE)} sx={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, whiteSpace: 'nowrap' }}>
            Show all
          </ButtonBase>
        )}
      </Box>
      </Box>

      {/* Runbook panels */}
      <Box ref={body} {...busy.contentProps} onKeyDown={onKeyDown} sx={{ p: 3, bgcolor: hairline, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {groups.length === 0 && (
          <Box sx={{ p: 6, textAlign: 'center', fontSize: 14, color: 'text.secondary', bgcolor: 'background.paper', borderRadius: `${radius.control}px` }}>{searching ? `No tasks match “${query.trim()}”.` : 'No tasks match.'}</Box>
        )}
        {groups.map(({ r, stages, inFocus, own, ownFiltered, ownCounts, ownShown, ownTotal }) => {
          const rOpen = !isClosed(r.id, r.id);
          const progress = runbookProgress(r);
          const anyStageOpen = stages.some((g) => !isClosed(`${r.id}/${g.s.id}`));
          return (
            <Box key={r.id} data-runbook={r.id} sx={{ border: `${stroke.thin}px solid ${colour.silver}`, borderRadius: `${radius.control}px`, overflow: 'hidden', bgcolor: 'background.paper', boxShadow: '0 1px 2px rgba(31,36,48,0.06)' }}>
              <ButtonBase
                onClick={() => setCollapsed(flip(collapsed, r.id))}
                aria-expanded={rOpen}
                aria-label={`${r.wbs} ${r.name}, ${r.recordId}, ${inFocus} in focus${progress.total ? `, ${progress.percent}% complete, ${progress.complete} of ${progress.total} tasks` : ''}, forecast end ${timeOf(r.forecastEnd, timeZone)}, ${shortGap(r.gapMinutes)}`}
                sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 3, height: 60, px: 5, bgcolor: 'primary.main', color: colour.white, textAlign: 'left', fontFamily: 'inherit', '&.Mui-focusVisible': { outlineOffset: -4, outlineColor: colour.white } }}
              >
                <Icon stroke={colour.white}>{chevron(rOpen)}</Icon>
                <Box component="span" sx={{ fontSize: 14, fontWeight: 800, color: colour.blueLight, fontVariantNumeric: 'tabular-nums', minWidth: 20 }}>{r.wbs}</Box>
                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2.5, fontSize: 14, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {r.name}
                    <Box component="span" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', px: 2, py: 0.5, borderRadius: `${radius.pill}px`, border: `${stroke.thin}px solid rgba(255,255,255,0.35)`, fontVariantNumeric: 'tabular-nums' }}>{r.recordId}</Box>
                  </Box>
                  <Box component="span" sx={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap' }}>
                    {inFocus} in focus
                    {scope === 'focus' && (r.hidden.complete > 0 || r.hidden.notAvailable > 0) &&
                      ` · ${[r.hidden.complete > 0 ? `${r.hidden.complete} complete` : '', r.hidden.notAvailable > 0 ? `${r.hidden.notAvailable} not yet available` : ''].filter(Boolean).join(' and ')} hidden`}
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }} />
                {/* Not drawn (flagged): the runbook's progress, so Collapse all still shows how far each runbook has got. Fixed widths keep the bars in one column. */}
                {progress.total > 0 && <ProgressSummary {...progress} tone="dark" />}
                <ForecastSummary end={r.forecastEnd} rag={r.rag} gapMinutes={r.gapMinutes} tone="dark" timeZone={timeZone} />
              </ButtonBase>

              {rOpen && (
                // Not drawn (flagged): the runbook's own filters, which narrow only this runbook.
                <Box role="group" aria-label={`Filter ${r.name}`} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, minHeight: 48, px: 5, py: 1.5, boxSizing: 'border-box', bgcolor: surfaceTint, borderBottom: 1, borderColor: 'divider', fontSize: 12, color: 'text.secondary' }}>
                  <RbmTaskSearch
                    size="small"
                    label={`Search tasks in ${r.name}`}
                    placeholder="Search this runbook"
                    value={own.query}
                    onChange={(q) => changeTools(r.id, { query: q })}
                    suggestions={stages.flatMap((g) => g.rows)}
                    fields={searchFields}
                    runbookNames={new Map([[r.id, r.name]])}
                    onPick={(t) => pickTask(t, true)}
                  />
                  {(['mine', 'late', 'blocked'] as const).map((k) => {
                    const name = { mine: 'Mine', late: 'Late', blocked: 'Blocked' }[k];
                    return (
                      <Chip
                        key={k}
                        small
                        label={name}
                        ariaLabel={`${name} in ${r.name}${ownCounts[k] ? `, ${ownCounts[k]}` : ''}`}
                        count={ownCounts[k]}
                        on={own.narrow.has(k)}
                        onClick={() => changeTools(r.id, { narrow: flip(own.narrow, k) })}
                      />
                    );
                  })}
                  {ownFiltered && (
                    <>
                      <span>
                        Showing <Box component="strong" sx={{ color: 'text.primary' }}>{ownShown} of {ownTotal}</Box> in this runbook
                      </span>
                      <ButtonBase onClick={() => changeTools(r.id, { query: '', narrow: new Set() })} aria-label={`Clear filters in ${r.name}`} sx={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5 }}>
                        Clear
                      </ButtonBase>
                    </>
                  )}
                  <Box sx={{ flex: 1 }} />
                  {stages.length > 0 && (
                    <ButtonBase
                      onClick={() => setAllStages(r, anyStageOpen)}
                      aria-label={`${anyStageOpen ? 'Collapse' : 'Expand'} all stages in ${r.name}`}
                      sx={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, whiteSpace: 'nowrap' }}
                    >
                      {anyStageOpen ? 'Collapse all stages' : 'Expand all stages'}
                    </ButtonBase>
                  )}
                </Box>
              )}
              {rOpen && ownFiltered && stages.length === 0 && (
                <Box sx={{ px: 5, py: 4, fontSize: 13, color: 'text.secondary' }}>No tasks in this runbook match.</Box>
              )}
              {rOpen &&
                stages.map(({ s, rows, more, inFocus: stageInFocus }) => {
                  const key = `${r.id}/${s.id}`;
                  const sOpen = !isClosed(key);
                  const sp = stageProgress(s);
                  return (
                    <Box key={s.id} role="list" aria-label={`Stage ${s.wbs} ${s.name}`}>
                      <ButtonBase
                        onClick={() => setCollapsed(flip(collapsed, key))}
                        aria-expanded={sOpen}
                        aria-label={`Stage ${s.wbs} ${s.name}, ${timeOf(s.start, timeZone)} to ${timeOf(s.end, timeZone)}, ${stageInFocus} in focus, ${sp.percent}% complete, ${s.complete} of ${s.total} tasks, forecast end ${timeOf(s.end, timeZone)}${s.gapMinutes !== undefined ? `, ${shortGap(s.gapMinutes)}` : ''}`}
                        sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 3, height: 52, px: 5, bgcolor: 'grey.100', borderTop: 1, borderBottom: 1, borderColor: 'divider', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'inherit', '&.Mui-focusVisible': { outlineOffset: -2 } }}
                      >
                        <Icon stroke={colour.slate}>{chevron(sOpen)}</Icon>
                        {/* Inline styles: one stage row per stage, hundreds on a large event. */}
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: palette.status[s.state].signal, flex: 'none' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: palette.text.secondary, fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{s.wbs}</span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', color: palette.primary.main, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.name}</span>
                          <span style={{ fontSize: 12, color: palette.text.secondary, whiteSpace: 'nowrap' }}>
                            {timeOf(s.start, timeZone)} – {timeOf(s.end, timeZone)} · {stageInFocus} in focus
                          </span>
                        </span>
                        <span style={{ flex: 1 }} />
                        {/* Not drawn (flagged): the stage's progress and forecast, as on the runbook band, in the same columns. */}
                        {s.total > 0 && <ProgressSummary {...sp} tone="light" />}
                        <ForecastSummary end={s.end} rag={s.rag} gapMinutes={s.gapMinutes} tone="light" timeZone={timeZone} />
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
                          <Box key={after} sx={{ display: 'flex', alignItems: 'center', height: 40, pl: '192px', borderBottom: `${stroke.thin}px solid ${hairline}` }}>
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
          <ButtonBase disabled={!canBulk('start')} onClick={() => bulk('start')} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 32, px: 3, borderRadius: `${radius.control}px`, border: `${stroke.thin}px solid rgba(255,255,255,0.45)`, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colour.white, '&.Mui-disabled': { opacity: 0.45 } }}>
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

      {messages}
    </Box>
  );
}
