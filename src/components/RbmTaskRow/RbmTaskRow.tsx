import { Box, Checkbox, useTheme } from '@mui/material';
import type { KeyboardEvent } from 'react';
import { RbmAvatar } from '../RbmAvatar/RbmAvatar';
import { RbmNode, type RbmNodeKind, type RbmSpine } from '../RbmNode/RbmNode';
import { RbmTag, type RbmTagKind } from '../RbmTag/RbmTag';
import { hairline, type RbmState, stroke } from '../../theme/tokens';
import { RbmTaskAction, type RbmCompleteOption, type RbmTaskActionEvent, type RbmTaskActionKind } from './RbmTaskAction';

/** A task as the Task Timeline shows it. Data from the RBM planning engine; actions from the API. */
export interface RbmTask {
  id: string;
  /** WBS, for example "1.3.5". It is the task's identity and never changes when the list is sorted. */
  wbs: string;
  title: string;
  kind: RbmNodeKind;
  state: RbmState;
  /** The start time: actual once the task has started, forecast until then. Tasks sort by it. */
  start: Date;
  startIsActual: boolean;
  plannedMinutes: number;
  /** Late is positive, early is negative. */
  deltaMinutes?: number;
  deltaIsForecast?: boolean;
  /** At most one: why the task is in focus. */
  tag?: { kind: RbmTagKind; label?: string };
  assignee?: { name: string; initials?: string };
  /** The one next step the user may take, decided by the engine and the user's platform role. */
  action?: RbmTaskActionKind;
  completeOptions?: RbmCompleteOption[];
}

export interface RbmTaskRowProps {
  task: RbmTask;
  /** Used for "5m elapsed" on an active row and "Actual end" in the Complete menu. */
  now?: Date;
  timeZone?: string;
  /** The spine through the node: Green where work is done, Rule grey after the current task. */
  spine?: { above?: RbmSpine; below?: RbmSpine };
  /** With onSelectedChange, a checkbox appears when the row is hovered, focused or selected. */
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  onAction?: (task: RbmTask, event: RbmTaskActionEvent) => void;
  /** Enter on the row opens the task in the slide-in. */
  onOpen?: (task: RbmTask) => void;
  /** For roving focus in the Task Timeline. */
  tabIndex?: number;
}

function timeOf(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

/** "+5m" late, "−3m" early, with "fc" when it is a forecast. */
export function formatDelta(minutes: number, forecast?: boolean) {
  const sign = minutes > 0 ? '+' : '−';
  return `${sign}${Math.abs(minutes)}m${forecast ? ' fc' : ''}`;
}

/** The row's name for screen readers: what it is, where it stands, when, and who. */
export function taskSummary(t: RbmTask, statusLabel: string, timeZone?: string) {
  const when = `${t.startIsActual ? 'started' : 'forecast start'} ${timeOf(t.start, timeZone)}`;
  return [`${t.wbs} ${t.title}`, statusLabel, t.tag?.label ?? undefined, when, t.assignee ? `assigned to ${t.assignee.name}` : 'unassigned'].filter(Boolean).join(', ');
}

/**
 * A row in the Task Timeline, as drawn on the Command board ("Task row", "Acting on tasks"):
 * time, node, WBS, title, tag, assignee, duration and delta, and one action. Active rows are the
 * only ones with a tint.
 */
export function RbmTaskRow({ task, now, timeZone, spine, selected = false, onSelectedChange, onAction, onOpen, tabIndex = 0 }: RbmTaskRowProps) {
  const { palette } = useTheme();
  const active = task.state === 'active';
  const done = task.state === 'complete' || task.state === 'skipped';
  const statusLabel = palette.status[task.state].label;
  const elapsed = now && task.startIsActual ? Math.max(0, Math.round((now.getTime() - task.start.getTime()) / 60_000)) : undefined;

  const act = (event: RbmTaskActionEvent) => onAction?.(task, event);
  // Keyboard on the row: S starts, C completes, Enter opens the slide-in. J and K belong to the timeline.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Enter' && onOpen) {
      e.preventDefault();
      onOpen(task);
    } else if ((e.key === 's' || e.key === 'S') && task.action === 'start') {
      e.preventDefault();
      act({ type: 'start' });
    } else if ((e.key === 'c' || e.key === 'C') && task.action === 'complete') {
      e.preventDefault();
      act({ type: 'complete' });
    }
  };

  return (
    <Box
      role="group"
      aria-label={taskSummary(task, statusLabel, timeZone)}
      aria-current={active ? 'step' : undefined}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      data-task={task.id}
      data-state={task.state}
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '52px 28px 56px minmax(0, 1fr) auto 28px 56px 120px',
        gap: 3,
        alignItems: 'center',
        height: 52,
        px: 5,
        borderBottom: `${stroke.thin}px solid ${hairline}`,
        boxSizing: 'border-box',
        lineHeight: 'normal',
        bgcolor: active ? 'rgba(53,75,168,0.08)' : selected ? 'action.selected' : undefined,
        '&:focus-visible': { outline: `${stroke.thick}px solid ${palette.status.active.signal}`, outlineOffset: -2 },
        '& .rbm-select': { opacity: selected ? 1 : 0 },
        '&:hover .rbm-select, &:focus-within .rbm-select': { opacity: 1 },
      }}
    >
      {active && <Box aria-hidden="true" sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: palette.status.active.signal }} />}

      {/* Time, with the hover checkbox to its left */}
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
        {onSelectedChange && (
          <Checkbox
            className="rbm-select"
            size="small"
            checked={selected}
            onChange={(e) => onSelectedChange(e.target.checked)}
            slotProps={{ input: { 'aria-label': `Select ${task.wbs} ${task.title}` } }}
            sx={{ position: 'absolute', left: -14, p: 0.5 }}
          />
        )}
        {task.startIsActual ? (
          <Box component="span" sx={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? palette.status.active.text : 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
            {timeOf(task.start, timeZone)}
          </Box>
        ) : (
          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1 }}>
            <Box component="span" sx={{ fontSize: 13, fontWeight: 600, fontStyle: 'italic', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
              {timeOf(task.start, timeZone)}
            </Box>
            <Box component="span" aria-label="forecast" sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
              FC
            </Box>
          </Box>
        )}
      </Box>

      <RbmNode kind={task.kind} state={task.state} spine={spine} decorative />

      <Box component="span" sx={{ fontSize: 13, color: active ? palette.status.active.text : 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        {task.wbs}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box component="span" sx={{ fontSize: 15, fontWeight: active ? 800 : 600, color: done ? 'text.secondary' : 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </Box>
        {active && task.startIsActual && (!now || now >= task.start) && (
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3 }}>
            Started {timeOf(task.start, timeZone)} · {elapsed !== undefined ? `${elapsed}m elapsed of ${task.plannedMinutes}m planned` : `${task.plannedMinutes}m planned`}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5 }}>{task.tag && <RbmTag kind={task.tag.kind} label={task.tag.label} />}</Box>

      <Box>{task.assignee && <RbmAvatar name={task.assignee.name} initials={task.assignee.initials} />}</Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', lineHeight: 1.2 }}>
        <Box component="span" sx={{ fontSize: 13, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {task.plannedMinutes}m
        </Box>
        {task.deltaMinutes ? (
          <Box component="span" sx={{ fontSize: 13, fontWeight: 700, color: task.deltaMinutes > 0 ? palette.status.atRisk.text : palette.status.complete.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {formatDelta(task.deltaMinutes, task.deltaIsForecast)}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        {task.action && (
          <RbmTaskAction action={task.action} wbs={task.wbs} title={task.title} kind={task.kind} completeOptions={task.completeOptions} now={now} timeZone={timeZone} onAction={act} />
        )}
      </Box>
    </Box>
  );
}
