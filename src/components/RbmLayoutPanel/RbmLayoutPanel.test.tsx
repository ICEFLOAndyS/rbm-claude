import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { useState, type ReactElement } from 'react';
import { DEFAULT_LAYOUT, RbmLayoutPanel, type RbmMovableRegion } from './RbmLayoutPanel';
import { rbmTheme } from '../../theme/theme';

const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
const movable = () => Array.from(screen.getByRole('list', { name: 'Movable regions' }).querySelectorAll<HTMLElement>('[data-region]')).map((r) => r.dataset.region);

// jsdom has no layout. Give each movable row a box, stacked 64 px apart, so the keyboard sensor can move between them.
function stackRows() {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const region = (this as HTMLElement).closest?.('[data-region]') as HTMLElement | null;
    if (region) {
      const i = Array.from(document.querySelectorAll('[data-region]')).indexOf(region);
      return { x: 0, y: i * 64, top: i * 64, left: 0, width: 348, height: 56, right: 348, bottom: i * 64 + 56, toJSON: () => ({}) } as DOMRect;
    }
    return original.call(this);
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

function Harness({ onChange }: { onChange?: (o: RbmMovableRegion[]) => void }) {
  const [order, setOrder] = useState<RbmMovableRegion[]>(DEFAULT_LAYOUT);
  return (
    <RbmLayoutPanel
      order={order}
      onChange={(o) => {
        setOrder(o);
        onChange?.(o);
      }}
    />
  );
}

describe('RbmLayoutPanel', () => {
  it('opens and collapses each movable region from its row, with the state in words', async () => {
    const onCollapsedChange = vi.fn();
    renderUi(<RbmLayoutPanel order={DEFAULT_LAYOUT} onChange={() => {}} collapsed={{ timeline: true }} onCollapsedChange={onCollapsedChange} />);
    const timeline = screen.getByRole('switch', { name: 'Task Timeline open' });
    expect(timeline).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Event ribbon open' })).toBeChecked();
    expect(document.querySelector('[data-region="timeline"]')).toHaveTextContent('Collapsed');
    await userEvent.click(timeline);
    expect(onCollapsedChange).toHaveBeenCalledWith('timeline', false);
    await userEvent.click(screen.getByRole('switch', { name: 'Hot-topics panel open' }));
    expect(onCollapsedChange).toHaveBeenCalledWith('hotTopics', true);
  });

  it('has no open switches unless the page holds the collapsed state, and the fixed regions never have one', () => {
    const { unmount } = renderUi(<RbmLayoutPanel order={DEFAULT_LAYOUT} onChange={() => {}} />);
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    unmount();
    renderUi(<RbmLayoutPanel order={DEFAULT_LAYOUT} onChange={() => {}} onCollapsedChange={() => {}} />);
    expect(screen.getAllByRole('switch')).toHaveLength(3);
  });

  it('hands Reset to default to the page when it asks for it', async () => {
    const onReset = vi.fn();
    const onChange = vi.fn();
    renderUi(<RbmLayoutPanel order={['timeline', 'ribbon']} onChange={onChange} onReset={onReset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('locks the Page header and the Event vitals at the top, marked FIXED', () => {
    renderUi(<RbmLayoutPanel order={DEFAULT_LAYOUT} onChange={vi.fn()} />);
    const fixedList = screen.getByRole('list', { name: 'Fixed regions' });
    expect(within(fixedList).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Page headerEvent, state, alerts and actionsFIXED',
      'Event vitalsProgress, Issues, Start, Forecast endFIXED',
    ]);
    expect(within(fixedList).queryByRole('button')).not.toBeInTheDocument();
  });

  it('lists the two movable regions in the given order, each with a grip', () => {
    renderUi(<RbmLayoutPanel order={['timeline', 'ribbon']} onChange={vi.fn()} />);
    expect(movable()).toEqual(['timeline', 'ribbon']);
    expect(screen.getByRole('button', { name: 'Move Task Timeline, position 1 of 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Event ribbon, position 2 of 2' })).toBeInTheDocument();
  });

  it('shows the Hot-topics panel on its own as the right panel: it opens and collapses but does not move', () => {
    renderUi(<RbmLayoutPanel order={DEFAULT_LAYOUT} onChange={vi.fn()} collapsed={{ hotTopics: true }} onCollapsedChange={vi.fn()} />);
    const right = screen.getByRole('list', { name: 'Right panel' });
    expect(right).toHaveTextContent('Hot-topics panelOn the right: blockers, checkpoint, milestones and moreCollapsed');
    expect(within(right).queryByRole('button', { name: /^Move/ })).not.toBeInTheDocument();
    expect(within(right).getByRole('switch', { name: 'Hot-topics panel open' })).not.toBeChecked();
  });

  it('moves a region from the keyboard: Space picks it up, arrows move it, Space drops it', async () => {
    const restore = stackRows();
    const onChange = vi.fn();
    try {
      renderUi(<Harness onChange={onChange} />);
      const grip = screen.getByRole('button', { name: 'Move Event ribbon, position 1 of 2' });
      grip.focus();
      await userEvent.keyboard(' ');
      await act(async () => {
        await userEvent.keyboard('{ArrowDown}');
      });
      await userEvent.keyboard(' ');
      expect(onChange).toHaveBeenCalledWith(['timeline', 'ribbon']);
      expect(movable()).toEqual(['timeline', 'ribbon']);
    } finally {
      restore();
    }
  });

  it('cancels a move with Escape', async () => {
    const restore = stackRows();
    const onChange = vi.fn();
    try {
      renderUi(<Harness onChange={onChange} />);
      screen.getByRole('button', { name: /^Move Event ribbon/ }).focus();
      await userEvent.keyboard(' ');
      await act(async () => {
        await userEvent.keyboard('{ArrowDown}');
      });
      await userEvent.keyboard('{Escape}');
      expect(onChange).not.toHaveBeenCalled();
      expect(movable()).toEqual(DEFAULT_LAYOUT);
    } finally {
      restore();
    }
  });

  it('tells screen readers how to move a region', () => {
    renderUi(<RbmLayoutPanel order={DEFAULT_LAYOUT} onChange={vi.fn()} />);
    expect(screen.getByText(/Press Space to pick up the region/)).toBeInTheDocument();
  });

  it('puts the default order back with Reset to default', async () => {
    const onChange = vi.fn();
    renderUi(<RbmLayoutPanel order={['timeline', 'ribbon']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(onChange).toHaveBeenCalledWith(['ribbon', 'timeline']);
  });

  it('closes with Done or the close button', async () => {
    const onClose = vi.fn();
    renderUi(<RbmLayoutPanel order={DEFAULT_LAYOUT} onChange={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
