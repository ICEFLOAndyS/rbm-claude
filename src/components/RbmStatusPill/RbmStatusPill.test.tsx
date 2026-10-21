import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmStatusPill } from './RbmStatusPill';
import { rbmTheme } from '../../theme/theme';
import { colour, status, type RbmState } from '../../theme/tokens';

const states = Object.keys(status) as RbmState[];

const renderPill = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

describe('RbmStatusPill', () => {
  it.each(states)('always shows a text label for %s', (state) => {
    renderPill(<RbmStatusPill state={state} />);
    // Colour is never the only signal: every state has visible text.
    expect(screen.getByText(status[state].label)).toBeInTheDocument();
  });

  it('uses the given label instead of the default', () => {
    renderPill(<RbmStatusPill state="active" label="Event live" />);
    expect(screen.getByText('Event live')).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('hides the dot from screen readers, so only the label is read', () => {
    renderPill(<RbmStatusPill state="paused" />);
    expect(screen.getByTestId('rbm-status-dot')).toHaveAttribute('aria-hidden', 'true');
  });

  it('labels Not started, not Pending', () => {
    renderPill(<RbmStatusPill state="pending" />);
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it.each([
    ['atRisk', colour.amberInner],
    ['paused', colour.slate],
  ] as const)('draws %s as a 16 px Amber ringed dot with its own centre', (state, core) => {
    renderPill(<RbmStatusPill state={state} />);
    expect(screen.getByTestId('rbm-status-dot')).toHaveStyle({ width: '16px', backgroundColor: colour.amber });
    expect(screen.getByTestId('rbm-status-core')).toHaveStyle({ width: '10px', backgroundColor: core });
  });

  it.each(['active', 'complete', 'pending', 'blocked', 'skipped'] as const)('draws %s as a plain 10 px dot', (state) => {
    renderPill(<RbmStatusPill state={state} />);
    expect(screen.getByTestId('rbm-status-dot')).toHaveStyle({ width: '10px', backgroundColor: status[state].signal });
    expect(screen.queryByTestId('rbm-status-core')).not.toBeInTheDocument();
  });

  it.each([
    ['normal', '30px', '15px'],
    ['compact', '24px', '12px'],
  ] as const)('is %s size: %s tall with %s text', (size, height, fontSize) => {
    renderPill(<RbmStatusPill state="active" size={size} />);
    expect(screen.getByText('Active')).toHaveStyle({ height, fontSize });
  });
});

/** WCAG relative luminance contrast ratio of two #RRGGBB colours. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('status tokens', () => {
  it('are the palette the theme exposes', () => {
    expect(rbmTheme.palette.status).toEqual(status);
  });

  it.each(states)('%s has a signal, a text colour and a label', (state) => {
    const t = status[state];
    expect(t.signal).toMatch(/^#[0-9A-F]{6}$/i);
    expect(t.text).toMatch(/^#[0-9A-F]{6}$/i);
    expect(t.label).not.toBe('');
  });

  it.each(states)('%s text reaches 4.5:1 on white', (state) => {
    expect(contrast(status[state].text, colour.white)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps Brand Green for Complete only', () => {
    const greens = states.filter((s) => status[s].signal === colour.green);
    expect(greens).toEqual(['complete']);
  });
});
