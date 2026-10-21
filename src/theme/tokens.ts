/**
 * ICEFLO brand tokens for RBM. Source: ICEFLO Brand Guidelines v1.0 and the
 * "RBM Design System" design file (Foundations and Semantic colour boards).
 * Anything marked "Proposed" on a board still needs sign-off.
 */
export const colour = {
  deepBlue: '#23326F',
  blueDark: '#354BA8',
  blueBase: '#5274FF',
  blueMid: '#7891FF',
  blueLight: '#A6B5FF',
  red: '#F00034',
  redInner: '#C61E3A',
  amber: '#FF9F1C',
  amberDeep: '#A45200',
  /** Proposed: centre of the At risk ringed dot (Foundations and Semantic boards). */
  amberCore: '#F36C00',
  green: '#84CC16',
  greenDeep: '#3F6B06',
  mist: '#F4F6F9',
  rule: '#E3E6EC',
  silver: '#C3C8D2',
  slate: '#5B6472',
  ink: '#1F2430',
  white: '#FFFFFF',
} as const;

export const radius = { control: 12, card: 14 } as const;

/** "Inter Variable" is the name @fontsource-variable/inter registers; "Inter" covers the static font. */
export const fontFamily = '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

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
  atRisk: { label: 'At risk', signal: colour.amber, text: colour.amberDeep, core: colour.amberCore },
  blocked: { label: 'Blocked', signal: colour.red, text: colour.redInner },
  pending: { label: 'Not started', signal: colour.silver, text: colour.slate },
  paused: { label: 'Paused', signal: colour.amber, text: colour.amberDeep, core: colour.slate },
  skipped: { label: 'Skipped', signal: colour.slate, text: colour.slate },
};
