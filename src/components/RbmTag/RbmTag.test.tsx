import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmTag, type RbmTagKind } from './RbmTag';
import { rbmTheme } from '../../theme/theme';
import { colour } from '../../theme/tokens';

const renderTag = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

// As drawn on the Command board: default label, text colour, and the mark before the label.
const drawn: [RbmTagKind, string, string, 'dot' | 'icon' | 'ring'][] = [
  ['lateToStart', 'Late to start', colour.amberDeep, 'icon'],
  ['lateToFinish', 'Late to finish', colour.amberDeep, 'icon'],
  ['readyToStart', 'Ready to start', colour.slate, 'dot'],
  ['upNext', 'Up next', colour.slate, 'icon'],
  ['blocked', 'Blocked', colour.redInner, 'dot'],
  ['issue', 'Issue', colour.amberDeep, 'icon'],
  ['needsResult', 'Needs a result', colour.slate, 'dot'],
  ['complete', 'Complete', colour.greenDeep, 'icon'],
  // Drawn in the Command board's rows with an 11 px ringed dot.
  ['atRisk', 'At risk', colour.amberDeep, 'ring'],
  ['paused', 'Paused', colour.amberDeep, 'ring'],
];

describe('RbmTag', () => {
  it.each(drawn)('%s says "%s" in its colour, with its mark', (kind, label, text, mark) => {
    const { container } = renderTag(<RbmTag kind={kind} />);
    expect(screen.getByText(label)).toHaveStyle({ color: text, height: '22px', fontSize: '12px', fontWeight: '600' });
    expect(screen.queryByTestId('rbm-tag-dot') !== null).toBe(mark === 'dot');
    expect(container.querySelector('svg') !== null).toBe(mark === 'icon');
    expect(screen.queryByTestId('rbm-tag-ring') !== null).toBe(mark === 'ring');
  });

  it('takes a label that names the record', () => {
    renderTag(<RbmTag kind="blocked" label="Blocked by BLK-102" />);
    expect(screen.getByText('Blocked by BLK-102')).toBeInTheDocument();
  });

  it('draws the blocker dot in Red and the ready dot in Silver', () => {
    const { unmount } = renderTag(<RbmTag kind="blocked" />);
    expect(screen.getByTestId('rbm-tag-dot')).toHaveStyle({ backgroundColor: colour.red, width: '7px' });
    unmount();
    renderTag(<RbmTag kind="readyToStart" />);
    expect(screen.getByTestId('rbm-tag-dot')).toHaveStyle({ backgroundColor: colour.silver });
  });

  it('gives Up next a dashed Silver border and the others a Rule border', () => {
    const { unmount } = renderTag(<RbmTag kind="upNext" label="Up next · after 1.3.5" />);
    expect(screen.getByText('Up next · after 1.3.5')).toHaveStyle({ border: `1px dashed ${colour.silver}` });
    unmount();
    renderTag(<RbmTag kind="issue" />);
    expect(screen.getByText('Issue')).toHaveStyle({ border: `1px solid ${colour.rule}` });
  });
  it.each([
    ['atRisk', colour.amberInner],
    ['paused', colour.slate],
  ] as const)('draws the %s reason with the ringed dot and its own centre', (kind, core) => {
    renderTag(<RbmTag kind={kind} />);
    const ring = screen.getByTestId('rbm-tag-ring');
    expect(ring).toHaveStyle({ width: '11px', backgroundColor: colour.amber });
    expect(ring.firstElementChild).toHaveStyle({ width: '7px', backgroundColor: core });
  });


  it('hides the dot and icon from screen readers, so only the label is read', () => {
    const { container, unmount } = renderTag(<RbmTag kind="lateToStart" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    unmount();
    renderTag(<RbmTag kind="blocked" />);
    expect(screen.getByTestId('rbm-tag-dot')).toHaveAttribute('aria-hidden', 'true');
  });
});
