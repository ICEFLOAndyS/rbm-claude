import type { RbmRibbonView } from '../components/RbmEventRibbon/RbmEventRibbon';
import type { CommandCentreSnapshot, CommandResult, TaskCommand } from './types';
import type { RbmMovableRegion, RbmRegion } from '../components/RbmLayoutPanel/RbmLayoutPanel';

/**
 * Where the page reads its data. The template never knows whether it came from a JSON fixture
 * and the fake engine, or from ServiceNow and the RBM planning engine.
 */
export interface CommandCentreData {
  /** The current state. Cheap to call; returns the same object until something changes. */
  getSnapshot(): CommandCentreSnapshot;
  /** Called with each new snapshot (a task changed, the clock moved). Returns an unsubscribe function. */
  subscribe(listener: (snapshot: CommandCentreSnapshot) => void): () => void;
}

/**
 * Where the page sends what the user does. Kept apart from reading, so a read-only view needs
 * nothing else. Permissions are checked here (by the platform's API, later); the page only shows
 * the actions the snapshot allows.
 */
export interface CommandCentreActions {
  dispatch(command: TaskCommand): Promise<CommandResult>;
}

/** The time the page runs on. Injectable, so the prototype can speed it up. */
export interface Clock {
  now(): Date;
  /** Called whenever the clock moves on. Returns an unsubscribe function. */
  subscribe(listener: (now: Date) => void): () => void;
}

/** The user's own page preferences. Personal: they never change the page for anyone else. */
export interface LayoutPreference {
  /** Order of the regions in the main column: Event ribbon and Task Timeline. */
  order: RbmMovableRegion[];
  /** Each region folded: the ribbon and timeline to a 56 px line, the Hot-topics panel to a rail. All open by default. */
  collapsed: Record<RbmRegion, boolean>;
  /** What the Event ribbon shows: all stages (the default), critical runbooks, or the critical path. */
  ribbonView: RbmRibbonView;
}

/** Saved to the user's profile. localStorage in the prototype; a ServiceNow user preference later. */
export interface LayoutPreferenceStore {
  get(): Promise<LayoutPreference>;
  set(preference: LayoutPreference): Promise<void>;
  /** Puts the defaults back (Event ribbon, Task Timeline, Hot-topics strip; ribbon open) and returns them. */
  reset(): Promise<LayoutPreference>;
}
