import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmNode, type RbmNodeKind } from './RbmNode';
import { rbmTheme } from '../../theme/theme';
import { colour, status, type RbmState } from '../../theme/tokens';

const kinds: RbmNodeKind[] = ['task', 'milestone', 'checkpoint'];
const states = Object.keys(status) as RbmState[];
const all = kinds.flatMap((k) => states.map((s) => [k, s] as const));

const renderNode = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

// Each state has its own mark, so nothing depends on colour alone.
const markFor: Record<RbmState, string> = {
  complete: 'tick',
  active: 'play',
  atRisk: 'ring',
  blocked: 'cross',
  paused: 'pause',
  pending: 'empty',
  skipped: 'slash',
};

describe('RbmNode', () => {
  it.each(all)('names a %s that is %s for screen readers', (kind, state) => {
    renderNode(<RbmNode kind={kind} state={state} />);
    const name = `${kind[0]!.toUpperCase()}${kind.slice(1)}, ${status[state].label}`;
    expect(screen.getByRole('img', { name })).toBeInTheDocument();
  });

  it.each(all)('draws a %s that is %s with its shape and its own mark', (kind, state) => {
    const { container } = renderNode(<RbmNode kind={kind} state={state} />);
    const svg = container.querySelector('svg')!;
    // Marks also use circles, so a kind is known by the outline the others never draw.
    expect(svg.querySelector('polygon') !== null).toBe(kind === 'milestone');
    expect(svg.querySelector('rect') !== null).toBe(kind === 'checkpoint');
    if (kind === 'task') expect(svg.querySelector('circle')).not.toBeNull();
    expect(svg.querySelectorAll('[data-mark]')).toHaveLength(1);
    expect(svg.querySelector(`[data-mark="${markFor[state]}"]`)).not.toBeNull();
  });

  it('gives every state a different mark', () => {
    expect(new Set(Object.values(markFor)).size).toBe(states.length);
  });

  it('uses the status colours from the theme', () => {
    const { container } = renderNode(<RbmNode kind="task" state="atRisk" />);
    expect(container.querySelector('circle')).toHaveAttribute('fill', status.atRisk.signal);
    expect(container.querySelector('[data-mark="ring"]')).toHaveAttribute('fill', colour.amberInner);
  });

  it('is 28 px by default and takes another size', () => {
    const { container, rerender } = renderNode(<RbmNode kind="task" state="active" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '28');
    rerender(
      <ThemeProvider theme={rbmTheme}>
        <RbmNode kind="task" state="active" size={24} />
      </ThemeProvider>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('width', '24');
  });

  it('takes a custom accessible name', () => {
    renderNode(<RbmNode kind="checkpoint" state="blocked" label="Checkpoint 1.3.5, Blocked" />);
    expect(screen.getByRole('img', { name: 'Checkpoint 1.3.5, Blocked' })).toBeInTheDocument();
  });

  it('can be hidden from screen readers when the state is written beside it', () => {
    const { container } = renderNode(<RbmNode kind="task" state="complete" decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws the spine Green where work is done and Rule grey after', () => {
    renderNode(<RbmNode kind="task" state="active" spine={{ above: 'done', below: 'todo' }} />);
    expect(screen.getByTestId('rbm-spine-above')).toHaveStyle({ backgroundColor: colour.green, width: '2px', left: '13px' });
    expect(screen.getByTestId('rbm-spine-below')).toHaveStyle({ backgroundColor: colour.rule });
  });

  it('draws only the spine halves it is given', () => {
    renderNode(<RbmNode kind="task" state="pending" spine={{ above: 'todo' }} />);
    expect(screen.getByTestId('rbm-spine-above')).toBeInTheDocument();
    expect(screen.queryByTestId('rbm-spine-below')).not.toBeInTheDocument();
  });

  it('has no spine unless asked', () => {
    renderNode(<RbmNode kind="task" state="pending" />);
    expect(screen.queryByTestId('rbm-spine-above')).not.toBeInTheDocument();
  });
});
