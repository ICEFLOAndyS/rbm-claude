import { Box, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { colour, type RbmState } from '../../theme/tokens';

/** Shape says what it is: circle a task, diamond a milestone, rounded square a checkpoint. */
export type RbmNodeKind = 'task' | 'milestone' | 'checkpoint';

/** A spine half: Green where work is done, Rule grey after the current task. */
export type RbmSpine = 'done' | 'todo';

/** Node sizes by density, from the Command board ("Task nodes"). */
export const nodeSize = { comfortable: 28, compact: 24 } as const;

const kindLabel: Record<RbmNodeKind, string> = { task: 'Task', milestone: 'Milestone', checkpoint: 'Checkpoint' };

export interface RbmNodeProps {
  kind: RbmNodeKind;
  state: RbmState;
  /** Pixel size. 28 at D1 (default), 24 at D2. */
  size?: number;
  /** Spine halves above and below the node. With a spine, the node fills its row's height. */
  spine?: { above?: RbmSpine; below?: RbmSpine };
  /** Accessible name. Defaults to "<Kind>, <state label>", for example "Milestone, At risk". */
  label?: string;
  /** Hide from screen readers when the same state is already written next to the node. */
  decorative?: boolean;
}

// Geometry on the board's 28-unit grid. Filled shapes are drawn larger than outlined
// ones, and the diamond and square slightly smaller, so all marks look the same weight.
const filled: Record<RbmNodeKind, (fill: string) => ReactNode> = {
  task: (fill) => <circle cx="14" cy="14" r="11" fill={fill} />,
  milestone: (fill) => <polygon points="14,1.5 26.5,14 14,26.5 1.5,14" fill={fill} strokeLinejoin="round" />,
  checkpoint: (fill) => <rect x="3" y="3" width="22" height="22" rx="6" fill={fill} />,
};

const outlined: Record<RbmNodeKind, (stroke: string, width: number, dashed?: boolean) => ReactNode> = {
  task: (stroke, width, dashed) => (
    <circle cx="14" cy="14" r="10.5" fill={colour.white} stroke={stroke} strokeWidth={width} strokeDasharray={dashed ? '3 3' : undefined} />
  ),
  milestone: (stroke, width, dashed) => (
    <polygon points="14,3 25,14 14,25 3,14" fill={colour.white} stroke={stroke} strokeWidth={width} strokeDasharray={dashed ? '3 3' : undefined} strokeLinejoin="round" />
  ),
  checkpoint: (stroke, width, dashed) => (
    <rect x="3.5" y="3.5" width="21" height="21" rx="5.5" fill={colour.white} stroke={stroke} strokeWidth={width} strokeDasharray={dashed ? '3 3' : undefined} />
  ),
};

function Mark({ kind, state }: { kind: RbmNodeKind; state: RbmState }) {
  const t = useTheme().palette.status[state];
  switch (state) {
    case 'complete': // a tick
      return (
        <>
          {filled[kind](t.signal)}
          <path data-mark="tick" d="M9 14.4l3.6 3.4 6.4-7.4" fill="none" stroke={colour.deepBlue} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'active': // a play triangle
      return (
        <>
          {outlined[kind](t.signal, 3)}
          <path data-mark="play" d="M12 9.8l5.6 4.2-5.6 4.2z" fill={t.signal} />
        </>
      );
    case 'atRisk': // a ringed dot
      return (
        <>
          {filled[kind](t.signal)}
          <circle data-mark="ring" cx="14" cy="14" r="5.2" fill={t.core} stroke={colour.white} strokeWidth="2.2" />
        </>
      );
    case 'blocked': // a cross
      return (
        <>
          {filled[kind](t.signal)}
          <path data-mark="cross" d="M10 10l8 8M18 10l-8 8" stroke={colour.white} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 'paused': // a pause
      return (
        <>
          {filled[kind](t.signal)}
          <circle cx="14" cy="14" r="7" fill={colour.white} />
          <path data-mark="pause" d="M12 11v6M16 11v6" stroke={t.core} strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    case 'pending': // an empty ring
      return <g data-mark="empty">{outlined[kind](t.signal, 2.5)}</g>;
    case 'skipped': // a dashed slash
      return (
        <>
          {outlined[kind](t.signal, 2.2, true)}
          <path data-mark="slash" d="M10.5 17.5l7-7" stroke={t.signal} strokeWidth="2" strokeLinecap="round" />
        </>
      );
  }
}

/**
 * A task node: one mark for every state of every kind of item. Used in the Task
 * Timeline, the Event ribbon and the Hot-topics strip. Every state has its own mark,
 * so nothing depends on colour alone.
 */
export function RbmNode({ kind, state, size = nodeSize.comfortable, spine, label, decorative = false }: RbmNodeProps) {
  const { palette } = useTheme();
  const name = label ?? `${kindLabel[kind]}, ${palette.status[state].label}`;
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      style={{ display: 'block', flex: 'none' }}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
    >
      <Mark kind={kind} state={state} />
    </svg>
  );
  if (!spine) return svg;

  const spineColour = (s: RbmSpine) => (s === 'done' ? palette.status.complete.signal : palette.divider);
  const half = (s: RbmSpine, where: 'above' | 'below') => (
    <Box
      component="span"
      aria-hidden="true"
      data-testid={`rbm-spine-${where}`}
      sx={{
        position: 'absolute',
        left: size / 2 - 1,
        width: 2,
        bgcolor: spineColour(s),
        ...(where === 'above' ? { top: 0, height: '50%' } : { top: '50%', bottom: 0 }),
      }}
    />
  );
  return (
    <Box component="span" sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: size }}>
      {spine.above && half(spine.above, 'above')}
      {spine.below && half(spine.below, 'below')}
      <Box component="span" sx={{ position: 'relative' }}>
        {svg}
      </Box>
    </Box>
  );
}
