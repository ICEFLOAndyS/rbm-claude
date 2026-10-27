import { colour } from '../theme/tokens';
import type { rbmIconKeys } from './registry';

/** An Icon suite state key, for example 'active'. The icon is `state.<key>`. */
export type RbmSuiteState = (typeof rbmIconKeys.state)[number];

export interface RbmSuiteStateStyle {
  label: string;
  /** The dot colour (signal). */
  signal: string;
  /** The icon and label colour (text-safe tint). */
  text: string;
}

/**
 * The 14 Icon suite states, as in the icon suite brief section 5.4: label, dot colour, and icon and label colour.
 * A state is always shown with its label, so colour is never the only signal.
 */
export const suiteStates: Record<RbmSuiteState, RbmSuiteStateStyle> = {
  initial: { label: 'Initial', signal: colour.silver, text: colour.slate },
  approved: { label: 'Approved', signal: colour.blueDark, text: colour.blueDark },
  pending: { label: 'Pending', signal: colour.silver, text: colour.slate },
  available: { label: 'Available', signal: colour.silver, text: colour.slate },
  active: { label: 'Active', signal: colour.blueDark, text: colour.blueDark },
  paused: { label: 'Paused', signal: colour.amber, text: colour.amberDeep },
  suspended: { label: 'Suspended', signal: colour.red, text: colour.redInner },
  complete: { label: 'Complete', signal: colour.green, text: colour.greenDeep },
  skipped: { label: 'Skipped', signal: colour.slate, text: colour.slate },
  backingOut: { label: 'Backing out', signal: colour.amber, text: colour.amberDeep },
  backedOut: { label: 'Backed out', signal: colour.slate, text: colour.slate },
  abandoned: { label: 'Abandoned', signal: colour.slate, text: colour.slate },
  scheduled: { label: 'Scheduled', signal: colour.blueDark, text: colour.blueDark },
  closed: { label: 'Closed', signal: colour.slate, text: colour.slate },
};
