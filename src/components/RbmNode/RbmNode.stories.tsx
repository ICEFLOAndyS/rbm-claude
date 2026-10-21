import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmNode, nodeSize, type RbmNodeKind, type RbmSpine } from './RbmNode';
import { status, type RbmState } from '../../theme/tokens';

const kinds: RbmNodeKind[] = ['task', 'milestone', 'checkpoint'];
const states: RbmState[] = ['complete', 'active', 'atRisk', 'blocked', 'paused', 'pending', 'skipped'];

const meta: Meta<typeof RbmNode> = {
  title: 'Base/RbmNode',
  component: RbmNode,
  args: { kind: 'task', state: 'active', size: nodeSize.comfortable },
  argTypes: {
    kind: { control: 'inline-radio', options: kinds },
    state: { control: 'select', options: states },
    size: { control: 'inline-radio', options: [nodeSize.comfortable, nodeSize.compact] },
  },
};
export default meta;

type Story = StoryObj<typeof RbmNode>;

export const Complete: Story = { args: { state: 'complete' } };
export const Active: Story = { args: { state: 'active' } };
export const AtRisk: Story = { args: { state: 'atRisk' } };
export const Blocked: Story = { args: { state: 'blocked' } };
export const Paused: Story = { args: { state: 'paused' } };
export const NotStarted: Story = { args: { state: 'pending' } };
export const Skipped: Story = { args: { state: 'skipped' } };

const kindName: Record<RbmNodeKind, string> = { task: 'Task', milestone: 'Milestone', checkpoint: 'Checkpoint' };

/** Every kind in every state, laid out as on the Command board ("Task nodes"). */
export const AllStates: Story = {
  parameters: { layout: 'padded' },
  render: ({ size }) => (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '14px', overflow: 'hidden', maxWidth: 1136, bgcolor: 'background.paper' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '140px repeat(7, minmax(0, 1fr))',
          alignItems: 'center',
          height: 44,
          px: 4,
          bgcolor: 'grey.100',
          borderBottom: 1,
          borderColor: 'divider',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        <span />
        {states.map((s) => (
          <Box key={s} component="span" sx={{ textAlign: 'center' }}>
            {status[s].label}
          </Box>
        ))}
      </Box>
      {kinds.map((k) => (
        <Box
          key={k}
          sx={{ display: 'grid', gridTemplateColumns: '140px repeat(7, minmax(0, 1fr))', alignItems: 'center', height: 64, px: 4, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}
        >
          <Box component="span" sx={{ fontSize: 14, fontWeight: 700 }}>
            {kindName[k]}
          </Box>
          {states.map((s) => (
            <Box key={s} component="span" sx={{ display: 'flex', justifyContent: 'center' }}>
              <RbmNode kind={k} state={s} size={size} />
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  ),
};

/** 28 px at D1 (Comfortable), 24 px at D2 (Compact). */
export const Sizes: Story = {
  render: ({ kind, state }) => (
    <Box sx={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <RbmNode kind={kind} state={state} size={nodeSize.comfortable} />
      <RbmNode kind={kind} state={state} size={nodeSize.compact} />
    </Box>
  ),
};

const run: { kind: RbmNodeKind; state: RbmState; above?: RbmSpine; below?: RbmSpine; text: string }[] = [
  { kind: 'task', state: 'complete', below: 'done', text: '1.3.3 Stop batch jobs' },
  { kind: 'checkpoint', state: 'complete', above: 'done', below: 'done', text: '1.3.4 Services stopped' },
  { kind: 'task', state: 'active', above: 'done', below: 'todo', text: '1.3.5 Back up payroll database' },
  { kind: 'task', state: 'pending', above: 'todo', below: 'todo', text: '1.3.6 Run migration scripts' },
  { kind: 'milestone', state: 'pending', above: 'todo', text: '1.3.7 Data migrated' },
];

/** The spine is part of the node: Green where work is done, Rule grey after the current task. */
export const Spine: Story = {
  render: () => (
    <Box sx={{ width: 360 }}>
      {run.map((r) => (
        <Box key={r.text} sx={{ display: 'flex', alignItems: 'center', gap: 4, height: 56 }}>
          <RbmNode kind={r.kind} state={r.state} spine={{ above: r.above, below: r.below }} />
          <Box component="span" sx={{ fontSize: 15 }}>
            {r.text}
          </Box>
        </Box>
      ))}
    </Box>
  ),
};
