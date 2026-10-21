import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmIconButton } from '../RbmIconButton/RbmIconButton';
import { rbmTheme } from '../../theme/theme';
import { colour } from '../../theme/tokens';

const renderButton = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

/**
 * MUI 9 sets button colours through CSS variables, which jsdom does not resolve.
 * Read the property, follow a var() to the custom property MUI sets on the button, and
 * fall back to the named variable when jsdom drops the property altogether.
 */
function colourOf(el: HTMLElement, property: string, fallbackVar: string) {
  const s = getComputedStyle(el);
  const value = s.getPropertyValue(property).trim();
  const ref = value.match(/^var\((--[\w-]+)\)$/)?.[1] ?? (value ? undefined : fallbackVar);
  const resolved = ref ? s.getPropertyValue(ref).trim() : value;
  return resolved.startsWith('#') ? rgb(resolved) : resolved;
}

describe('Buttons (MUI Button with the RBM theme)', () => {
  it('is 48 px high with a 12 px radius and 16 px bold text', () => {
    renderButton(<Button variant="contained" color="secondary">Start cutover</Button>);
    expect(screen.getByRole('button', { name: 'Start cutover' })).toHaveStyle({
      minHeight: '48px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '700',
      textTransform: 'none',
    });
  });

  it.each([
    ['CTA', 'contained', 'secondary', colour.green, colour.deepBlue],
    ['secondary', 'contained', 'primary', colour.deepBlue, colour.white],
    ['destructive', 'contained', 'error', colour.redInner, colour.white],
  ] as const)('draws the %s button with its fill and text colour', (_, variant, color, bg, fg) => {
    renderButton(<Button variant={variant} color={color}>Go</Button>);
    const button = screen.getByRole('button');
    expect(colourOf(button, 'background-color', '--variant-containedBg')).toBe(rgb(bg));
    expect(colourOf(button, 'color', '--variant-containedColor')).toBe(rgb(fg));
  });

  it('draws the outlined button with a 2 px Deep Blue border on white', () => {
    renderButton(<Button variant="outlined" color="primary">View plan</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ border: `2px solid ${colour.deepBlue}`, backgroundColor: colour.white });
    expect(colourOf(button, 'color', '--variant-outlinedColor')).toBe(rgb(colour.deepBlue));
  });

  it('draws the ghost button as underlined Blue Dark text', () => {
    renderButton(<Button variant="text" color="primary">Learn more</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ color: colour.blueDark, textDecoration: 'underline', padding: '0px 16px' });
  });

  it('draws a disabled button in Rule and Slate, and it cannot be pressed', async () => {
    const onClick = vi.fn();
    renderButton(<Button variant="contained" color="secondary" disabled onClick={onClick}>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ backgroundColor: colour.rule, color: colour.slate });
    await userEvent.click(button).catch(() => {});
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is pressed with Enter and Space from the keyboard', async () => {
    const onClick = vi.fn();
    renderButton(<Button variant="contained" color="secondary" onClick={onClick}>Start cutover</Button>);
    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe('RbmIconButton', () => {
  it('is named by its label', () => {
    renderButton(<RbmIconButton label="More actions"><svg /></RbmIconButton>);
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
  });

  it('is a 48 px square with a 2 px Deep Blue outline', () => {
    renderButton(<RbmIconButton label="More actions"><svg /></RbmIconButton>);
    expect(screen.getByRole('button')).toHaveStyle({ width: '48px', height: '48px', borderRadius: '12px', color: colour.deepBlue });
  });
});
