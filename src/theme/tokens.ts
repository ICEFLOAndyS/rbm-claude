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
 */
export type RbmState = 'complete' | 'active' | 'atRisk' | 'paused' | 'blocked' | 'pending';

export interface StateStyle {
  label: string;
  /** Fill colour of the dot. */
  dot: string;
  /** Text colour for the label. */
  text: string;
  /** Amber ring around the dot (At risk, Paused). */
  ring?: string;
  /** Centre colour inside a ring (Paused is Amber ring with Slate centre). */
  centre?: string;
}

export const stateStyle: Record<RbmState, StateStyle> = {
  complete: { label: 'Complete', dot: colour.green, text: colour.greenDeep },
  active: { label: 'Active', dot: colour.blueDark, text: colour.blueDark },
  atRisk: { label: 'At risk', dot: colour.amber, text: colour.amberDeep, ring: colour.amber, centre: colour.amberDeep },
  paused: { label: 'Paused', dot: colour.amber, text: colour.amberDeep, ring: colour.amber, centre: colour.slate },
  blocked: { label: 'Blocked', dot: colour.red, text: colour.redInner },
  pending: { label: 'Not started', dot: colour.silver, text: colour.slate },
};
