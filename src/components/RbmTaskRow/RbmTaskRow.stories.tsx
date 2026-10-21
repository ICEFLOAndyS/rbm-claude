import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { fn } from 'storybook/test';
import { RbmTaskRow, type RbmTask } from './RbmTaskRow';
import type { RbmSpine } from '../RbmNode/RbmNode';
import { mockTaskRowExamples, mockTaskStates, tasksNow } from '../../mocks/tasks';
import { ribbonNow } from '../../mocks/eventRibbon';

const states = mockTaskStates();
const byId = (id: string) => states.find((t) => t.id === id)!;

const meta: Meta<typeof RbmTaskRow> = {
  title: 'Command/RbmTaskRow',
  component: RbmTaskRow,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ maxWidth: 1136, border: 1, borderColor: 'divider', borderRadius: '14px', overflow: 'hidden', bgcolor: 'background.paper' }}><Story /></Box>],
  args: { now: tasksNow, timeZone: 'UTC', onAction: fn(), onOpen: fn() },
};
export default meta;

type Story = StoryObj<typeof RbmTaskRow>;

/** Active: the only row with a tint. Complete is a Green split button. */
export const Active: Story = { args: { task: byId('1.3.5') } };
/** Ready to start: forecast time marked FC, Start in a Blue Dark outline. */
export const ReadyToStart: Story = { args: { task: byId('1.3.9') } };
/** An active checkpoint: Result opens the Pass or Fail dialog. */
export const CheckpointNeedsResult: Story = { args: { task: byId('1.3.6') } };
export const Paused: Story = { args: { task: byId('1.4.3') } };
export const Blocked: Story = { args: { task: byId('1.4.2') } };
/** Up next: no action, so the column is empty. */
export const UpNext: Story = { args: { task: byId('1.3.10') } };
/** Just completed: Undo during the 60-second linger. */
export const JustCompleted: Story = { args: { task: byId('1.3.2') } };
export const AtRisk: Story = { args: { task: mockTaskRowExamples()[2]!, now: ribbonNow } };
export const Unassigned: Story = { args: { task: { ...byId('1.3.9'), assignee: undefined } } };

/** Labels are cut, never widened: the button stays 120 px. */
export const LongTranslation: Story = {
  args: { task: { ...byId('1.3.5'), title: 'Démarrer l’interface utilisateur de l’application et vérifier la connexion' } },
};

/** The caret on Complete opens the exceptions. */
export const CompleteMenuOpen: Story = {
  args: { task: byId('1.3.5') },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^More ways to complete/ }));
  },
};

/** Result opens the one dialog a routine action needs. */
export const ResultDialogOpen: Story = {
  args: { task: byId('1.3.6') },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Record a result/ }));
  },
};

/** With selection: hover a row to see its checkbox. */
export const Selectable: Story = { args: { task: byId('1.3.9'), selected: true, onSelectedChange: fn() } };

const spine = (i: number, n: number, current: number): { above?: RbmSpine; below?: RbmSpine } => ({
  above: i === 0 ? undefined : i <= current ? 'done' : 'todo',
  below: i === n - 1 ? undefined : i < current ? 'done' : 'todo',
});

function Rows({ tasks, now, current }: { tasks: RbmTask[]; now: Date; current: number }) {
  return (
    <>
      {tasks.map((t, i) => (
        <RbmTaskRow key={t.id} task={t} now={now} timeZone="UTC" spine={spine(i, tasks.length, current)} onAction={fn()} />
      ))}
    </>
  );
}

/** The seven rows drawn in "Acting on tasks". */
export const EveryState: Story = { render: () => <Rows tasks={states} now={tasksNow} current={0} /> };

/** The three rows drawn in "Task row", with the spine. */
export const TaskRowSection: Story = { render: () => <Rows tasks={mockTaskRowExamples()} now={ribbonNow} current={1} /> };
