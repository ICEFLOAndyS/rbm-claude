import { rbmTheme } from './theme';
import { colour, radius, type } from './tokens';

// Values as drawn on the Foundations board ("02 · Colour" and "MUI theme mapping").
const board: Record<keyof typeof colour, string> = {
  deepBlue: '#23326F',
  blueDark: '#354BA8',
  blueBase: '#5274FF',
  blueMid: '#7891FF',
  blueLight: '#A6B5FF',
  red: '#F00034',
  redInner: '#C61E3A',
  amber: '#FF9F1C',
  amberInner: '#F36C00',
  green: '#84CC16',
  yellow: '#F0E800',
  white: '#FFFFFF',
  mist: '#F4F6F9',
  rule: '#E3E6EC',
  silver: '#C3C8D2',
  slate: '#5B6472',
  ink: '#1F2430',
  greenText: '#5E9A0E',
  greenDeep: '#3F6B06',
  amberDeep: '#A45200',
};

describe('colour tokens', () => {
  it('match the Foundations board', () => {
    expect(colour).toEqual(board);
  });
});

describe('type tokens', () => {
  // Size, weight, line height and tracking as drawn on the Foundations board ("03 · Typography").
  it.each([
    ['display', 58, 800, 1.05, '-0.035em'],
    ['h1', 37, 800, 1.1, '-0.03em'],
    ['h2', 28, 700, 1.2, '-0.025em'],
    ['lead', 20, 400, 1.5, undefined],
    ['h3', 17, 700, undefined, undefined],
    ['body', 16, 400, 1.6, undefined],
    ['compactBody', 14, 400, 1.4, undefined],
    ['eyebrow', 12, 700, undefined, '0.08em'],
    ['caption', 12, 400, undefined, undefined],
  ] as const)('%s matches the board', (style, fontSize, fontWeight, lineHeight, letterSpacing) => {
    const t: { fontSize: number; fontWeight: number; lineHeight?: number; letterSpacing?: string } = type[style];
    expect(t).toMatchObject({ fontSize, fontWeight });
    expect(t.lineHeight).toBe(lineHeight);
    expect(t.letterSpacing).toBe(letterSpacing);
  });
});

describe('rbmTheme', () => {
  const { palette, typography } = rbmTheme;

  it('maps the palette as on the board', () => {
    expect(palette.primary.main).toBe('#23326F');
    expect(palette.primary.light).toBe('#354BA8');
    expect(palette.secondary.main).toBe('#84CC16');
    expect(palette.secondary.contrastText).toBe('#23326F');
    expect(palette.text.primary).toBe('#1F2430');
    expect(palette.text.secondary).toBe('#5B6472');
    expect(palette.divider).toBe('#E3E6EC');
    expect(palette.background.default).toBe('#FFFFFF');
    expect(palette.background.paper).toBe('#FFFFFF');
    expect(palette.grey[100]).toBe('#F4F6F9');
    expect(palette.error.main).toBe('#C61E3A');
    expect(palette.warning.main).toBe('#A45200');
    expect(palette.success.main).toBe('#3F6B06');
    expect(palette.info.main).toBe('#354BA8');
  });

  it('uses a 4 px spacing unit', () => {
    expect(rbmTheme.spacing(1)).toBe('4px');
    expect(rbmTheme.spacing(4)).toBe('16px');
    expect(rbmTheme.spacing(12)).toBe('48px');
  });

  it('uses 12 px controls and 14 px cards', () => {
    expect(rbmTheme.shape.borderRadius).toBe(12);
    expect(radius.card).toBe(14);
  });

  it('sets Inter first', () => {
    expect(typography.fontFamily).toMatch(/^"Inter Variable", "Inter",/);
  });

  it.each([
    ['display', 'display'],
    ['h1', 'h1'],
    ['h2', 'h2'],
    ['h3', 'h3'],
    ['lead', 'lead'],
    ['body1', 'body'],
    ['body2', 'compactBody'],
    ['overline', 'eyebrow'],
    ['caption', 'caption'],
    ['figures', 'figures'],
  ] as const)('typography.%s is the %s style', (variant, style) => {
    expect(typography[variant]).toMatchObject(type[style]);
  });
});
