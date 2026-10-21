import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmTaskTimeline, type RbmTaskTimelineProps } from './RbmTaskTimeline';
import { RbmRunbookFilter } from './RbmRunbookFilter';
import { mockManyUpNext, mockTimelineRunbooks, mockTimelineTasks } from '../../mocks/timeline';
import { tasksNow } from '../../mocks/tasks';
import { rbmTheme } from '../../theme/theme';

const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
const timeline = (over: Partial<RbmTaskTimelineProps> = {}) =>
  renderUi(<RbmTaskTimeline runbooks={mockTimelineRunbooks()} tasks={mockTimelineTasks()} now={tasksNow} timeZone="UTC" {...over} />);
const rowIds = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task]')).map((r) => r.dataset.task);
const summary = () => screen.getAllByRole('status').find((s) => s.textContent?.startsWith('Showing'))!;

describe('RbmTaskTimeline', () => {
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
    expect(rowIds()).toEqual(expect.arrayContaining(['1.3.1', '1.4.5', '3.1.1']));
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
