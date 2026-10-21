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

export const radius = { control: 12, card: 14, pill: 999 } as const;

/** Proposed. Rule borders first; shadow only for overlays. */
export const elevation = {
  card: 'none',
  menu: '0 2px 8px rgba(31,36,48,0.14)',
  dialog: '0 12px 32px rgba(31,36,48,0.22)',
} as const;

/** The 4 px base unit: theme.spacing(n) is n × 4 px. */
export const spacingUnit = 4;

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
