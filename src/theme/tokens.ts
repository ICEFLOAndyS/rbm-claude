/**
 * ICEFLO brand tokens for RBM. Source: ICEFLO Brand Guidelines v1.0 and the
 * "RBM Design System" design file (Foundations and Semantic colour boards).
 * Anything marked "Proposed" on a board still needs sign-off.
 */
export const colour = {
  // Brand blues
  deepBlue: '#23326F',
  blueDark: '#354BA8',
  blueBase: '#5274FF',
  blueMid: '#7891FF',
  blueLight: '#A6B5FF',
  // Signal colours (from the logo mark)
  red: '#F00034',
  redInner: '#C61E3A',
  amber: '#FF9F1C',
  amberInner: '#F36C00',
  green: '#84CC16',
  yellow: '#F0E800',
  // Neutrals
  white: '#FFFFFF',
  mist: '#F4F6F9',
  rule: '#E3E6EC',
  silver: '#C3C8D2',
  slate: '#5B6472',
  ink: '#1F2430',
  // Text-safe tints (Red Inner doubles as one)
  greenText: '#5E9A0E',
  greenDeep: '#3F6B06',
  amberDeep: '#A45200',
} as const;

export type ColourName = keyof typeof colour;

/** Drawn on the Command board for gridlines and the "+3" avatar chip, but not in the brand palette. Needs sign-off. */
export const hairline = '#EEF0F4';

/** Drawn behind the Task Timeline summary line, but not in the brand palette. Needs sign-off. */
export const surfaceTint = '#FBFCFE';

/** Drawn behind a row lifted in the Layout panel, but not in the brand palette. Needs sign-off. */
export const liftTint = '#EEF1FF';

export const radius = { control: 12, card: 14, pill: 999 } as const;

/**
 * Proposed. Line thickness in px for borders, rules, outlines and rings. The boards draw 1 and 2 px
 * lines but name no scale. Icon strokes are not on it: they are set in each icon's own viewBox.
 * - thin: rules, dividers, and card, chip and field borders
 * - regular: a mark that should be seen but not shout, such as the Start action's ring
 * - thick: focus rings, a lifted or selected item, outlined buttons, the white ring round a dot,
 *   the critical-path outline on the Event ribbon
 * - heavy: kept for a stronger mark; nothing uses it yet
 */
export const stroke = { thin: 1, regular: 1.5, thick: 2, heavy: 3 } as const;

/**
 * The filter pill, unselected and selected (Components board, "Buttons and pills"; the standard, approved by Andy
 * Smith, 26 Oct 2026). Every pill that can be selected uses it. The words always say what is chosen, so selection is
 * never colour alone.
 */
export const pill = {
  border: colour.silver,
  fill: colour.white,
  selectedBorder: colour.deepBlue,
  /** Deep Blue at 8%. */
  selectedFill: 'rgba(35,50,111,0.08)',
} as const;

/** A pill's edge and fill, selected or not. */
export const pillColours = (selected: boolean) => ({
  border: `${stroke.thin}px solid ${selected ? pill.selectedBorder : pill.border}`,
  bgcolor: selected ? pill.selectedFill : pill.fill,
});

/** Proposed. Rule borders first; shadow only for overlays. */
export const elevation = {
  card: 'none',
  menu: '0 2px 8px rgba(31,36,48,0.14)',
  dialog: '0 12px 32px rgba(31,36,48,0.22)',
} as const;

/** The 4 px base unit: theme.spacing(n) is n × 4 px. */
export const spacingUnit = 4;

/**
 * Proposed. The four densities on the Density board ("In code"), in CSS px: row and control height,
 * minimum target, body and secondary ("caption") text, KPI figure, cell padding (x), gap, icon, status
 * dot and control radius. Line heights: 1.5, 1.5, 1.4, 1.35.
 *
 * Decided by Andy Smith, 22 Oct 2026: a component at a density takes its sizes from here, even where a
 * board draws something else.
 */
export const density = {
  command: { row: 80, control: 64, target: 56, body: 24, caption: 18, figure: 96, padX: 24, gap: 24, icon: 32, dot: 16, radius: 12 },
  comfortable: { row: 56, control: 48, target: 48, body: 16, caption: 13, figure: 40, padX: 16, gap: 16, icon: 24, dot: 10, radius: 12 },
  compact: { row: 44, control: 36, target: 36, body: 14, caption: 12, figure: 32, padX: 12, gap: 12, icon: 20, dot: 10, radius: 12 },
  dense: { row: 32, control: 28, target: 24, body: 13, caption: 12, figure: 24, padX: 8, gap: 8, icon: 16, dot: 8, radius: 8 },
} as const;
export type DensityLevel = keyof typeof density;

/**
 * Proposed. The app shell's own sizes at each level (App shell board, "Sizes by density"), in CSS px.
 * D0 Command has no sidebar (0) and no navigation items. Icon sizes are the density's `icon` token.
 */
export const shellSize = {
  command: { sidebar: 0, rail: 0, navItem: 0, topBar: 72, footer: 40, pagePadding: 32, pageTitle: 40 },
  comfortable: { sidebar: 248, rail: 72, navItem: 44, topBar: 64, footer: 36, pagePadding: 32, pageTitle: 28 },
  compact: { sidebar: 224, rail: 64, navItem: 36, topBar: 56, footer: 32, pagePadding: 24, pageTitle: 24 },
  dense: { sidebar: 200, rail: 56, navItem: 32, topBar: 48, footer: 28, pagePadding: 16, pageTitle: 20 },
} as const satisfies Record<DensityLevel, Record<string, number>>;

/** Proposed. The shell's tints on Deep Blue (App shell board): hover, active and dividers. */
export const onDeepBlue = {
  hover: 'rgba(255,255,255,0.07)',
  active: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.14)',
  railDivider: 'rgba(255,255,255,0.18)',
} as const;

/** "Inter Variable" is the name @fontsource-variable/inter registers; "Inter" covers the static font. */
export const fontFamily = '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

export interface TypeStyle {
  fontSize?: number | string;
  fontWeight: number;
  /** Unitless, as drawn on the board's samples. Only set where the board gives one. */
  lineHeight?: number;
  /** In em, from the board's percentage. */
  letterSpacing?: string;
  color?: string;
  textTransform?: 'uppercase';
  fontVariantNumeric?: 'tabular-nums';
}

/** The type scale on the Foundations board ("03 · Typography"). */
export const type = {
  display: { fontSize: 58, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.035em' },
  h1: { fontSize: 37, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' },
  h2: { fontSize: 28, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.025em' },
  lead: { fontSize: 20, fontWeight: 400, lineHeight: 1.5, color: colour.slate },
  h3: { fontSize: 17, fontWeight: 700, color: colour.deepBlue },
  body: { fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
  /** Proposed. See the Density boards. */
  compactBody: { fontSize: 14, fontWeight: 400, lineHeight: 1.4 },
  eyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
  caption: { fontSize: 12, fontWeight: 400, color: colour.slate },
  /** Proposed. Tabular figures for IDs and times, at the size of the text around them. */
  figures: { fontSize: 'inherit', fontWeight: 500, fontVariantNumeric: 'tabular-nums' },
} as const satisfies Record<string, TypeStyle>;

/**
 * Semantic task and event states. Green means Complete only, never "Active".
 * A text label is always shown: colour is never the only signal.
 * The Semantic board calls Active "inProgress"; the brief and the Command board use Active.
 */
export type RbmState = 'complete' | 'active' | 'atRisk' | 'paused' | 'blocked' | 'pending' | 'skipped';

export interface StatusToken {
  /** Default text label. */
  label: string;
  /** The mark: the dot fill, or the outer disc of a ringed dot. */
  signal: string;
  /** Text colour for the label. Reaches 4.5:1 on white. */
  text: string;
  /** Centre of a ringed dot (At risk, Paused). A state with a core is drawn as a ringed dot. */
  core?: string;
  /** Signal on a Deep Blue surface, where the default does not show. */
  onDark?: string;
}

/**
 * The status tokens, as on the Semantic board ("React and MUI"). The theme puts
 * these in `theme.palette.status`, and components read them from there.
 */
export const status: Record<RbmState, StatusToken> = {
  complete: { label: 'Complete', signal: colour.green, text: colour.greenDeep },
  active: { label: 'Active', signal: colour.blueDark, text: colour.blueDark, onDark: colour.blueMid },
  atRisk: { label: 'At risk', signal: colour.amber, text: colour.amberDeep, core: colour.amberInner },
  blocked: { label: 'Blocked', signal: colour.red, text: colour.redInner },
  pending: { label: 'Not started', signal: colour.silver, text: colour.slate },
  paused: { label: 'Paused', signal: colour.amber, text: colour.amberDeep, core: colour.slate },
  skipped: { label: 'Skipped', signal: colour.slate, text: colour.slate },
};
