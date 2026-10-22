import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmTaskRow, formatDelta, type RbmTask } from './RbmTaskRow';
import { RbmTaskAction } from './RbmTaskAction';
import { mockTaskRowExamples, mockTaskStates, tasksNow } from '../../mocks/tasks';
import { rbmTheme } from '../../theme/theme';
import { colour, density } from '../../theme/tokens';
import { RbmDensity } from '../../theme/RbmDensity';

// Task rows live in the Task Timeline, a D2 Compact region.
const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}><RbmDensity level="compact">{ui}</RbmDensity></ThemeProvider>);
const task = (id: string) => mockTaskStates().find((t) => t.id === id)!;
const row = () => screen.getByRole('group');

describe('formatDelta', () => {
  it.each([
    [5, false, '+5m'],
    [-3, false, '−3m'],
    [8, true, '+8m fc'],
  ])('%i minutes (forecast %s) reads %s', (m, fc, text) => {
    expect(formatDelta(m, fc)).toBe(text);
  });
});

describe('RbmTaskRow', () => {
  it('names the row for screen readers: task, state, reason, time and assignee', () => {
    renderUi(<RbmTaskRow task={task('1.4.2')} timeZone="UTC" />);
    expect(row()).toHaveAccessibleName('1.4.2 Account reconciliation, Blocked, Blocked by BLK-102, forecast start 04:35, assigned to Sam Dee');
  });

  it('tints only the active row, with the 4 px Blue Dark bar, and marks it as the current step', () => {
    const { container, unmount } = renderUi(<RbmTaskRow task={task('1.3.5')} now={tasksNow} timeZone="UTC" />);
    expect(row()).toHaveStyle({ backgroundColor: 'rgba(53, 75, 168, 0.08)' });
    expect(row()).toHaveAttribute('aria-current', 'step');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveStyle({ width: '4px', backgroundColor: colour.blueDark });
    unmount();
    renderUi(<RbmTaskRow task={task('1.3.9')} now={tasksNow} timeZone="UTC" />);
    expect(row()).not.toHaveAttribute('aria-current');
  });

  it('shows an actual start in Ink and a forecast start in italic Slate marked FC', () => {
    const { unmount } = renderUi(<RbmTaskRow task={task('1.3.2')} timeZone="UTC" />);
    expect(screen.getByText('03:20')).toHaveStyle({ color: colour.ink });
    expect(screen.getByText('03:20')).not.toHaveStyle({ fontStyle: 'italic' });
    expect(screen.queryByText('FC')).not.toBeInTheDocument();
    unmount();
    renderUi(<RbmTaskRow task={task('1.3.9')} timeZone="UTC" />);
    expect(screen.getByText('03:55')).toHaveStyle({ color: colour.slate, fontStyle: 'italic' });
    expect(screen.getByText('FC')).toBeInTheDocument();
  });

  it('shows how long an active task has run', () => {
    renderUi(<RbmTaskRow task={mockTaskRowExamples()[1]!} now={new Date(mockTaskRowExamples()[1]!.start.getTime() + 5 * 60_000)} timeZone="UTC" />);
    expect(screen.getByText('Started 03:35 · 5m elapsed of 25m planned')).toBeInTheDocument();
  });

  it('greys the title of a complete task, and shows the delta in Amber Deep when late', () => {
    renderUi(<RbmTaskRow task={task('1.3.2')} timeZone="UTC" />);
    expect(screen.getByText('Stop legacy jobs')).toHaveStyle({ color: colour.slate });
    expect(screen.getByText('+4m')).toHaveStyle({ color: colour.amberDeep });
  });

  it('shows an early delta in Green Deep', () => {
    renderUi(<RbmTaskRow task={{ ...task('1.3.2'), deltaMinutes: -3 }} timeZone="UTC" />);
    expect(screen.getByText('−3m')).toHaveStyle({ color: colour.greenDeep });
  });

  it('shows the tag and the assignee, and nothing for an unassigned task', () => {
    const { unmount } = renderUi(<RbmTaskRow task={task('1.4.3')} timeZone="UTC" />);
    expect(screen.getByText('Paused by A. Smith')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jo Nash' })).toBeInTheDocument();
    unmount();
    renderUi(<RbmTaskRow task={{ ...task('1.4.3'), assignee: undefined }} timeZone="UTC" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(row()).toHaveAccessibleName(/unassigned$/);
  });

  it.each([
    ['1.3.5', 'Complete task 1.3.5 Startup application UI'],
    ['1.3.9', 'Start task 1.3.9 Refresh test data'],
    ['1.3.6', 'Record a result for checkpoint 1.3.6 Confirm UI is available'],
    ['1.4.3', 'Resume task 1.4.3 Refresh reports'],
    ['1.4.2', 'View the blocker on task 1.4.2 Account reconciliation'],
    ['1.3.2', 'Undo complete on task 1.3.2 Stop legacy jobs'],
  ])('gives the action on %s its full name: "%s"', (id, name) => {
    renderUi(<RbmTaskRow task={task(id)} timeZone="UTC" />);
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });

  it('leaves the action column empty when there is nothing to do (Up next)', () => {
    renderUi(<RbmTaskRow task={task('1.3.10')} timeZone="UTC" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps every action button 120 px wide whatever the label, at the D2 control height', () => {
    renderUi(<RbmTaskRow task={{ ...task('1.3.9'), title: 'A very long title that would never fit' }} timeZone="UTC" />);
    expect(screen.getByRole('button', { name: /^Start/ })).toHaveStyle({ width: '120px', height: `${density.compact.control}px`, borderRadius: '12px' });
  });

  it('draws Start in a Blue Dark outline and Complete in Green with Deep Blue text', () => {
    const { unmount } = renderUi(<RbmTaskRow task={task('1.3.9')} timeZone="UTC" />);
    expect(screen.getByRole('button', { name: /^Start/ })).toHaveStyle({ color: colour.blueDark, backgroundColor: colour.white });
    unmount();
    renderUi(<RbmTaskRow task={task('1.3.5')} timeZone="UTC" />);
    expect(screen.getByRole('button', { name: /^Complete task/ }).parentElement).toHaveStyle({ backgroundColor: colour.green, color: colour.deepBlue, width: '120px' });
  });

  it('acts at once on Start and Complete, with no dialog', async () => {
    const onAction = vi.fn();
    renderUi(<RbmTaskRow task={task('1.3.5')} timeZone="UTC" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /^Complete task/ }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: '1.3.5' }), { type: 'complete' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts with S, completes with C and opens with Enter from the keyboard', async () => {
    const onAction = vi.fn();
    const onOpen = vi.fn();
    const { unmount } = renderUi(<RbmTaskRow task={task('1.3.9')} timeZone="UTC" onAction={onAction} onOpen={onOpen} />);
    row().focus();
    await userEvent.keyboard('s');
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: '1.3.9' }), { type: 'start' });
    await userEvent.keyboard('c'); // not offered on a ready task
    expect(onAction).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledOnce();
    unmount();
    renderUi(<RbmTaskRow task={task('1.3.5')} timeZone="UTC" onAction={onAction} />);
    row().focus();
    await userEvent.keyboard('c');
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: '1.3.5' }), { type: 'complete' });
  });

  it('shows a selection checkbox only when selection is on, and reports changes', async () => {
    const onSelectedChange = vi.fn();
    const { unmount } = renderUi(<RbmTaskRow task={task('1.3.9')} timeZone="UTC" />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    unmount();
    renderUi(<RbmTaskRow task={task('1.3.9')} timeZone="UTC" onSelectedChange={onSelectedChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select 1.3.9 Refresh test data' }));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });
});

describe('RbmTaskAction: Complete menu', () => {
  it('opens the exceptions from the caret, and runs the one chosen', async () => {
    const onAction = vi.fn();
    renderUi(<RbmTaskAction action="complete" wbs="1.3.5" title="Startup application UI" now={tasksNow} timeZone="UTC" onAction={onAction} />);
    const caret = screen.getByRole('button', { name: 'More ways to complete task 1.3.5 Startup application UI' });
    expect(caret).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(caret);
    const menu = screen.getByRole('menu', { name: 'Complete 1.3.5 Startup application UI' });
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Complete nowActual end 03:41',
      'Complete at…Back-date the actual end',
      'Complete with note…',
      'Pause',
      'Skip task…A reason is required',
    ]);
    await userEvent.click(within(menu).getByRole('menuitem', { name: /Complete at/ }));
    expect(onAction).toHaveBeenCalledWith({ type: 'completeAt' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('shows only the exceptions the user may use', async () => {
    renderUi(<RbmTaskAction action="complete" wbs="1.3.5" title="Startup application UI" completeOptions={['pause']} onAction={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /^More ways/ }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Complete now', 'Pause']);
  });

  it('works from the keyboard: arrows move, Enter chooses, Escape closes', async () => {
    const onAction = vi.fn();
    renderUi(<RbmTaskAction action="complete" wbs="1.3.5" title="Startup application UI" onAction={onAction} />);
    screen.getByRole('button', { name: /^More ways/ }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(onAction).toHaveBeenCalledWith({ type: 'pause' });
    screen.getByRole('button', { name: /^More ways/ }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});

describe('RbmTaskAction: checkpoint Result', () => {
  it('asks for Pass, Fail or Pass with comment, and confirms the choice', async () => {
    const onAction = vi.fn();
    renderUi(<RbmTaskAction action="result" kind="checkpoint" wbs="1.3.6" title="Confirm UI is available" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Record a result for checkpoint 1.3.6 Confirm UI is available' }));
    const dialog = screen.getByRole('dialog', { name: 'Result for 1.3.6 · Confirm UI is available' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();
    expect(within(dialog).getAllByRole('radio')).toHaveLength(3);
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Fail' }));
    await userEvent.click(confirm);
    expect(onAction).toHaveBeenCalledWith({ type: 'result', result: 'fail' });
  });

  it('cancels without acting', async () => {
    const onAction = vi.fn();
    renderUi(<RbmTaskAction action="result" kind="checkpoint" wbs="1.3.6" title="Confirm UI is available" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /^Result options/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Pass' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onAction).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('the board rows', () => {
  it('render every drawn state without an action where none is due', () => {
    const tasks: RbmTask[] = mockTaskStates();
    renderUi(<>{tasks.map((t) => <RbmTaskRow key={t.id} task={t} timeZone="UTC" />)}</>);
    expect(screen.getAllByRole('group')).toHaveLength(7);
    // Six rows have an action; Complete and Result are split, so they have two buttons each.
    expect(screen.getAllByRole('button')).toHaveLength(8);
  });
});

describe('RbmTaskRow density', () => {
  it.each(['compact', 'comfortable'] as const)('takes its height, title and secondary text from the %s tokens', (level) => {
    const d = density[level];
    const task = mockTaskRowExamples()[0]!;
    render(
      <ThemeProvider theme={rbmTheme}>
        <RbmDensity level={level}>
          <RbmTaskRow task={task} now={tasksNow} timeZone="UTC" />
        </RbmDensity>
      </ThemeProvider>,
    );
    expect(screen.getByRole('group')).toHaveStyle({ height: `${d.row}px` });
    expect(screen.getByText(task.title)).toHaveStyle({ fontSize: `${d.body}px` });
    expect(screen.getByText(task.wbs)).toHaveStyle({ fontSize: `${d.caption}px` });
  });
});
