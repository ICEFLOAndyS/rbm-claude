import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmTaskTimeline, runbookProgress, type RbmTaskTimelineProps } from './RbmTaskTimeline';
import { RbmRunbookFilter } from './RbmRunbookFilter';
import { mockManyUpNext, mockTimelineRunbooks, mockTimelineTasks } from '../../mocks/timeline';
import { tasksNow } from '../../mocks/tasks';
import { rbmTheme } from '../../theme/theme';

const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
const timeline = (over: Partial<RbmTaskTimelineProps> = {}) =>
  renderUi(<RbmTaskTimeline runbooks={mockTimelineRunbooks()} tasks={mockTimelineTasks()} now={tasksNow} timeZone="UTC" {...over} />);
const rowIds = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task]')).map((r) => r.dataset.task);
const summary = () => screen.getAllByRole('status').find((s) => s.textContent?.startsWith('Showing'))!;

describe('RbmTaskTimeline search', () => {
  const search = () => screen.getByRole('combobox', { name: 'Search tasks' });

  it('narrows the timeline as you type, on the task title, within Focus', async () => {
    timeline();
    await userEvent.type(search(), 'refresh');
    expect(rowIds().sort()).toEqual(['1.3.9', '1.4.3']);
    expect(summary()).toHaveTextContent('Showing 2 tasks matching “refresh” in 1 runbook · Focus');
  });

  it('counts matches outside Focus, and shows them when asked', async () => {
    timeline();
    await userEvent.type(search(), 'payroll');
    expect(rowIds()).not.toContain('1.3.1'); // complete long ago
    const more = screen.getByRole('button', { name: /^\d+ more outside Focus$/ });
    await userEvent.click(more);
    await waitFor(() => expect(rowIds()).toContain('1.3.1'));
    expect(screen.queryByRole('button', { name: /more outside Focus/ })).not.toBeInTheDocument();
  });

  it('combines with the chips, which only ever narrow', async () => {
    timeline();
    await userEvent.type(search(), 'refresh');
    await userEvent.click(screen.getByRole('button', { name: /^Blocked/ }));
    expect(rowIds()).toEqual([]);
    expect(screen.getByText('No tasks match “refresh”.')).toBeInTheDocument();
  });

  it('offers matching tasks; Arrow keys and Enter pick one, which narrows to it and takes focus', async () => {
    timeline();
    await userEvent.type(search(), 'refresh');
    const list = screen.getByRole('listbox', { name: 'Matching tasks' });
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(['1.3.9Refresh test dataPayroll cutover', '1.4.3Refresh reportsPayroll cutover']);
    expect(search()).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(search()).toHaveAttribute('aria-activedescendant', within(list).getAllByRole('option')[1]!.id);
    await userEvent.keyboard('{Enter}');
    expect(search()).toHaveValue('Refresh reports');
    expect(rowIds()).toEqual(['1.4.3']);
    await waitFor(() => expect(document.activeElement).toHaveAttribute('data-task', '1.4.3'));
  });

  it('Escape closes the suggestions, then clears the search', async () => {
    timeline();
    await userEvent.type(search(), 'refresh');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(search()).toHaveValue('refresh');
    await userEvent.keyboard('{Escape}');
    expect(search()).toHaveValue('');
    expect(rowIds().length).toBeGreaterThan(2);
  });

  it('clears from the field, and / jumps to it from the timeline', async () => {
    timeline();
    await userEvent.type(search(), 'refresh');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(search()).toHaveValue('');
    document.querySelector<HTMLElement>('[data-task]')!.focus();
    await userEvent.keyboard('/');
    expect(search()).toHaveFocus();
  });

  it('searches any fields it is given, and says which one matched', async () => {
    timeline({ searchFields: [{ key: 'title', label: 'Title', get: (t) => t.title }, { key: 'wbs', label: 'WBS', get: (t) => t.wbs }] });
    await userEvent.type(search(), '2.1.3');
    expect(rowIds()).toEqual(['2.1.3']);
    expect(screen.getByRole('option')).toHaveTextContent('matched wbs');
  });

  it('shows every match, even ones that "+n more up next" would hide', async () => {
    timeline({ tasks: [...mockTimelineTasks(), ...mockManyUpNext()] });
    expect(rowIds()).not.toContain('1.4.16');
    await userEvent.type(search(), 'verify interface');
    expect(rowIds()).toContain('1.4.16');
    expect(screen.queryByRole('button', { name: /more up next/ })).not.toBeInTheDocument();
  });
});

describe('RbmTaskTimeline feedback while loading all tasks', () => {
  const instant = { delayMs: 0, minVisibleMs: 0 };

  it('says "Loading all tasks" over the timeline while Show all queries, then shows every task', async () => {
    let finish!: () => void;
    const onLoadAll = vi.fn(() => new Promise<void>((r) => (finish = r)));
    timeline({ onLoadAll, busyOptions: instant });
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(await screen.findByTestId('rbm-busy')).toHaveTextContent('Loading all tasks…This can take a moment on a large event.Cancel');
    expect(onLoadAll).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(rowIds()).not.toContain('1.3.1');
    await act(async () => finish());
    await waitFor(() => expect(rowIds()).toContain('1.3.1'));
    await waitFor(() => expect(screen.queryByTestId('rbm-busy')).not.toBeInTheDocument());
  });

  it('uses the same feedback for All, "more outside Focus" and Expand all, but not for Collapse all', async () => {
    const onLoadAll = vi.fn(() => Promise.resolve());
    timeline({ onLoadAll, busyOptions: instant });
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all runbooks' }));
    expect(onLoadAll).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Expand all runbooks' }));
    await waitFor(() => expect(onLoadAll).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(onLoadAll).toHaveBeenCalledTimes(2));
  });

  it('cancelling leaves the timeline as it was', async () => {
    const onLoadAll = vi.fn((signal: AbortSignal) => new Promise<void>((_, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')))));
    timeline({ onLoadAll, busyOptions: instant });
    const before = rowIds();
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('rbm-busy')).not.toBeInTheDocument());
    expect(rowIds()).toEqual(before);
  });
});

describe('RbmTaskTimeline runbook progress', () => {
  it('works out the progress of a runbook from its stages, rounding down', () => {
    const stage = (complete: number, total: number) => ({ complete, total }) as RbmTaskTimelineProps['runbooks'][number]['stages'][number];
    expect(runbookProgress({ stages: [stage(10, 30), stage(5, 19)] })).toEqual({ complete: 15, total: 49, percent: 30 });
    expect(runbookProgress({ stages: [stage(2, 3)] }).percent).toBe(66); // never rounds up to look further on
    expect(runbookProgress({ stages: [] })).toEqual({ complete: 0, total: 0, percent: 0 });
  });

  it('shows the percentage, count and bar on each runbook band, and says it to screen readers', () => {
    timeline();
    const r = mockTimelineRunbooks()[0]!;
    const p = runbookProgress(r);
    const band = document.querySelector<HTMLElement>(`[data-runbook="${r.id}"] > button`)!;
    const block = within(band).getByTestId('rbm-runbook-progress');
    expect(block).toHaveTextContent(`PROGRESS${p.percent}%${p.complete} of ${p.total}`);
    expect(block.querySelector<HTMLElement>('[style]')!.style.width).toBe(`${p.percent}%`);
    expect(band.getAttribute('aria-label')).toContain(`, ${p.percent}% complete, ${p.complete} of ${p.total} tasks, forecast end`);
  });

  it('keeps the progress on the bands when every runbook is collapsed', async () => {
    timeline();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all runbooks' }));
    expect(rowIds()).toEqual([]);
    expect(screen.getAllByTestId('rbm-runbook-progress').length).toBe(document.querySelectorAll('[data-runbook]').length);
  });
});

describe('RbmTaskTimeline Collapse all and Expand all', () => {
  const bands = () => Array.from(document.querySelectorAll<HTMLElement>('[data-runbook] > button')).map((b) => b.getAttribute('aria-expanded'));

  it('collapses every runbook band, then expands them again', async () => {
    timeline();
    expect(bands().every((x) => x === 'true')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all runbooks' }));
    expect(bands().every((x) => x === 'false')).toBe(true);
    expect(rowIds()).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Expand all runbooks' }));
    await waitFor(() => expect(bands().every((x) => x === 'true')).toBe(true));
    expect(rowIds().length).toBeGreaterThan(0);
  });

  it('offers Collapse all while any runbook is open, and leaves stages as they were', async () => {
    timeline();
    const stage = screen.getByRole('button', { name: /^Stage 1\.3 / });
    await userEvent.click(stage);
    expect(stage).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(document.querySelectorAll<HTMLElement>('[data-runbook] > button')[0]!);
    expect(screen.getByRole('button', { name: 'Collapse all runbooks' })).toHaveTextContent('Collapse all');
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all runbooks' }));
    await userEvent.click(screen.getByRole('button', { name: 'Expand all runbooks' }));
    expect(await screen.findByRole('button', { name: /^Stage 1\.3 / })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('RbmTaskTimeline', () => {
  it('collapses to one line with the focus, late and blocked counts, matching the chips', async () => {
    const onCollapsedChange = vi.fn();
    timeline({ onCollapsedChange });
    const chipCount = (name: string) => Number(screen.getByRole('button', { name: new RegExp(`^${name}`) }).textContent!.replace(/\D/g, '') || 0);
    const late = chipCount('Late');
    const blocked = chipCount('Blocked');
    const inFocus = Number(/Showing (\d+) of/.exec(summary().textContent!)![1]);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Task Timeline' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    const chips = within(screen.getByRole('list', { name: 'Task Timeline summary' })).getAllByRole('listitem');
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([`${inFocus} in focus`, `${late} late`, `${blocked} blocked`]);
    expect(rowIds()).toEqual([]);
    expect(screen.queryByRole('group', { name: 'Scope' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Expand Task Timeline' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(rowIds().length).toBeGreaterThan(0);
  });

  it('says how many runbooks the collapsed counts cover when the runbook filter is on', () => {
    const runbooks = mockTimelineRunbooks();
    timeline({ collapsed: true, runbookFilter: [runbooks[0]!.id] });
    expect(screen.getByRole('listitem', { name: `1 of ${runbooks.length} runbooks` })).toBeInTheDocument();
  });

  it('keeps a refusal on screen while collapsed', () => {
    timeline({ collapsed: true, notice: { message: '1.3.5 was already completed by L. Chen at 03:41' } });
    expect(screen.getByText('1.3.5 was already completed by L. Chen at 03:41')).toBeInTheDocument();
  });

  it('shows only the tasks in focus, and hides the rest', () => {
    timeline();
    expect(rowIds()).not.toContain('1.3.1'); // complete long ago
    expect(rowIds()).not.toContain('1.4.5'); // not started and not ready
    expect(rowIds()).toContain('1.3.2'); // complete, still lingering
  });

  it('groups by runbook then stage, and sorts by start time within a stage', () => {
    timeline();
    const stage = screen.getByRole('list', { name: 'Stage 1.3 Application failover' });
    expect(within(stage).getAllByRole('group').map((g) => g.dataset.task)).toEqual(['1.3.2', '1.3.5', '1.3.8', '1.3.9', '1.3.6', '1.3.10']);
  });

  it('shows no panel for a runbook with nothing in focus', () => {
    timeline();
    expect(document.querySelector('[data-runbook="rb3"]')).toBeNull();
    expect(document.querySelector('[data-runbook="rb1"]')).not.toBeNull();
  });

  it('states the scope honestly in the summary line', () => {
    timeline();
    expect(summary()).toHaveTextContent('Showing 10 of 122 tasks in 2 of 3 runbooks · 83 complete and 29 not ready hidden');
  });

  it('gives each runbook band its counts, record number and forecast', () => {
    timeline();
    const band = screen.getByRole('button', { name: /^1 Payroll cutover, RBK0000001/ });
    expect(band).toHaveTextContent('8 in focus · 83 complete and 20 not yet available hidden');
    expect(band).toHaveTextContent('06:12');
    expect(band).toHaveTextContent('+12m');
  });

  it('counts down the linger on a completed task', () => {
    timeline();
    expect(screen.getByText('Complete · leaves in 0:42')).toBeInTheDocument();
  });

  it('collapses and expands a stage', async () => {
    timeline();
    const band = screen.getByRole('button', { name: /^Stage 1.4 Verify/ });
    await userEvent.click(band);
    expect(band).toHaveAttribute('aria-expanded', 'false');
    expect(rowIds()).not.toContain('1.4.2');
    await userEvent.click(band);
    expect(rowIds()).toContain('1.4.2');
  });

  it('narrows the focus set with Mine, Late and Blocked, which combine', async () => {
    timeline();
    await userEvent.click(screen.getByRole('button', { name: 'Late 2' }));
    expect(rowIds()).toEqual(['1.3.8', '2.1.3']);
    await userEvent.click(screen.getByRole('button', { name: 'Mine 2' }));
    expect(rowIds()).toEqual(['1.3.8']);
    expect(screen.getByRole('button', { name: 'Mine 2' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows every task in the All scope', async () => {
    timeline();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(rowIds()).toEqual(expect.arrayContaining(['1.3.1', '1.4.5', '3.1.1'])));
  });

  it('follows the runbook filter, and says so in the summary', () => {
    timeline({ runbookFilter: ['rb2'] });
    expect(rowIds()).toEqual(['2.1.3', '2.1.4']);
    expect(summary()).toHaveTextContent('Showing 2 of 6 tasks in 1 runbook · 0 complete and 4 not ready hidden');
  });

  it('caps Up next at five tasks per completion, then "+n more", which shows the rest', async () => {
    timeline({ tasks: [...mockTimelineTasks(), ...mockManyUpNext()] });
    expect(rowIds().filter((id) => id!.startsWith('1.4.1'))).toHaveLength(5);
    await userEvent.click(screen.getByRole('button', { name: '+2 more up next after 1.3.6' }));
    expect(rowIds().filter((id) => id!.startsWith('1.4.1'))).toHaveLength(7);
  });

  it('moves between tasks with J and K, and jumps to now with N', async () => {
    timeline();
    const first = document.querySelector<HTMLElement>('[data-task="1.3.2"]')!;
    first.focus();
    await userEvent.keyboard('j');
    expect(document.activeElement).toHaveAttribute('data-task', '1.3.5');
    await userEvent.keyboard('jj');
    expect(document.activeElement).toHaveAttribute('data-task', '1.3.9');
    await userEvent.keyboard('k');
    expect(document.activeElement).toHaveAttribute('data-task', '1.3.8');
    await userEvent.keyboard('n');
    expect(document.activeElement).toHaveAttribute('data-task', '1.3.5');
  });

  it('keeps one tab stop for the rows (roving focus)', () => {
    timeline();
    const stops = Array.from(document.querySelectorAll<HTMLElement>('[data-task]')).filter((r) => r.tabIndex === 0);
    expect(stops).toHaveLength(1);
  });

  it('shows an Undo message after Complete, and Undo reverses it', async () => {
    const onAction = vi.fn();
    timeline({ onAction });
    await userEvent.click(screen.getByRole('button', { name: 'Complete task 1.3.5 Startup application UI' }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: '1.3.5' }), { type: 'complete' });
    expect(screen.getByText('1.3.5 completed at 03:41')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: '1.3.5' }), { type: 'undo' });
  });

  it('shows a conflict from the API', () => {
    timeline({ notice: { message: '1.3.5 was already completed by L. Chen at 03:41', actionLabel: 'View', onAction: vi.fn() } });
    expect(screen.getByText('1.3.5 was already completed by L. Chen at 03:41')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  describe('bulk actions', () => {
    it('enables only what is valid for every selected row', async () => {
      timeline();
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select 1.3.9 Refresh test data' }));
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select 1.3.8 Apply configuration patch' }));
      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled();
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select 1.3.5 Startup application UI' }));
      expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    });

    it('starts every selected task, then clears the selection', async () => {
      const onAction = vi.fn();
      timeline({ onAction });
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select 1.3.9 Refresh test data' }));
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select 1.3.8 Apply configuration patch' }));
      await userEvent.click(screen.getByRole('button', { name: 'Start' }));
      expect(onAction).toHaveBeenCalledTimes(2);
      expect(onAction.mock.calls.map(([t, e]) => [t.id, e.type])).toEqual([['1.3.8', 'start'], ['1.3.9', 'start']]);
      await waitFor(() => expect(screen.queryByText(/selected$/)).not.toBeInTheDocument());
    });

    it('completes every selected task with one Undo message', async () => {
      const onAction = vi.fn();
      timeline({ onAction });
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select 1.3.5 Startup application UI' }));
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select 2.1.3 Switch payroll interface' }));
      await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
      expect(screen.getByText('2 tasks completed at 03:41')).toBeInTheDocument();
    });
  });

  it('says so when nothing matches', () => {
    timeline({ tasks: [] });
    expect(screen.getByText('No tasks match.')).toBeInTheDocument();
  });
});

describe('RbmRunbookFilter', () => {
  const options = mockTimelineRunbooks().map((r) => ({ id: r.id, wbs: r.wbs, name: r.name, recordId: r.recordId, rag: r.rag, inFocus: r.id === 'rb3' ? 0 : 2 }));

  it('reads All runbooks when nothing is selected, and the count when some are', () => {
    const { unmount } = renderUi(<RbmRunbookFilter runbooks={options} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'All runbooks' })).toBeInTheDocument();
    unmount();
    renderUi(<RbmRunbookFilter runbooks={options} selected={['rb1', 'rb2']} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '2 of 3 runbooks' })).toBeInTheDocument();
  });

  it('lists every runbook, even with nothing in focus, and selects with a checkbox', async () => {
    const onChange = vi.fn();
    renderUi(<RbmRunbookFilter runbooks={options} selected={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'All runbooks' }));
    expect(screen.getByRole('checkbox', { name: '3 Reporting, RBK0000003, Green, 0 in focus' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /^2 Interfaces/ }));
    expect(onChange).toHaveBeenLastCalledWith(['rb2']);
  });

  it('selects one runbook with Only, all with Select all, and none with Clear', async () => {
    const onChange = vi.fn();
    renderUi(<RbmRunbookFilter runbooks={options} selected={['rb1']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '1 of 3 runbooks' }));
    await userEvent.click(screen.getByRole('button', { name: 'Only Interfaces' }));
    expect(onChange).toHaveBeenLastCalledWith(['rb2']);
    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(onChange).toHaveBeenLastCalledWith(['rb1', 'rb2', 'rb3']);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('shows a search field above six runbooks', async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ ...options[0]!, id: `r${i}`, wbs: String(i + 1), name: `Runbook ${i + 1}` }));
    renderUi(<RbmRunbookFilter runbooks={many} selected={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'All runbooks' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Search runbooks' }), 'Runbook 7');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });
});
