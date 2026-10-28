/**
 * The RBM icon suite (Icon suite board, 109 icons; docs/briefs/icon-suite-brief.md): one typed registry, used
 * through RbmIcon. Each icon is a file in ./svg/<group>/<name>.svg, drawn on the 24 px grid with 2 px round
 * strokes in currentColor; a test checks every file against those rules and against this list.
 *
 * Every icon is Proposed: first-pass drawings that need Andy Smith's sign-off.
 *
 *   object … taskType  the suite, copied from the Icon suite board (109 icons)
 *   shell              copied from the App shell board; not yet in the suite (flagged)
 */
export const rbmIconKeys = {
  object: [
    'runbook', 'event', 'stage', 'task', 'dependency', 'assignment', 'team', 'globalTeam', 'localTeam', 'workstream', 'globalWorkstream',
    'localWorkstream', 'document', 'issue', 'checklist', 'environment', 'schedule', 'cutover', 'decision', 'comment', 'history', 'template',
    'contentPack', 'eventGroup',
  ],
  role: ['owner', 'executor', 'reviewer', 'approver', 'observer', 'stakeholder', 'manager', 'author'],
  state: ['initial', 'approved', 'pending', 'available', 'active', 'paused', 'suspended', 'complete', 'skipped', 'backingOut', 'backedOut', 'abandoned', 'scheduled', 'closed'],
  construct: ['add', 'edit', 'delete', 'save', 'discard', 'copy', 'clone', 'reassign', 'export', 'lock', 'moveUp', 'moveDown', 'dragHandle', 'dropTarget'],
  control: ['approve', 'start', 'pause', 'resume', 'complete', 'skip', 'fastForward', 'abandon', 'backOut'],
  display: ['search', 'filter', 'sort', 'expandAll', 'collapseAll', 'previous', 'next', 'widen', 'openFullPage', 'close', 'more', 'signOut'],
  nav: ['list', 'folder', 'setup', 'integrations', 'license', 'training', 'support', 'versions'],
  centre: ['base', 'commandControl', 'migration', 'executiveBriefing', 'verification', 'audit', 'admin'],
  admin: ['systemProperties', 'diagnostics', 'scenarios'],
  taskType: ['standard', 'scripted', 'automated', 'businessVerification', 'technicalVerification', 'checkpoint', 'notification', 'collaboration', 'approval', 'milestone'],
  shell: ['notifications', 'menu', 'sidebar', 'profile', 'environment', 'synced'],
} as const;

type Keys = typeof rbmIconKeys;
export type RbmIconGroup = keyof Keys;

/** A registry key, for example 'nav.list'. A key that is not registered does not compile. */
export type RbmIconName = { [G in RbmIconGroup]: `${G}.${Keys[G][number]}` }[RbmIconGroup];

/** Every registered key. */
export const rbmIconNames = (Object.entries(rbmIconKeys) as [RbmIconGroup, readonly string[]][]).flatMap(([group, names]) =>
  names.map((name) => `${group}.${name}` as RbmIconName),
);

/** The groups outside the suite (not yet on the Icon suite board). */
export const unregisteredGroups: readonly RbmIconGroup[] = ['shell'];

const files = import.meta.glob<string>('./svg/*/*.svg', { query: '?raw', import: 'default', eager: true });

/** The source of an icon's file. */
export function iconSource(name: RbmIconName): string {
  const source = files[`./svg/${name.replace('.', '/')}.svg`];
  if (source === undefined) throw new Error(`No file for the icon ${name}`);
  return source;
}

/** The drawing inside an icon's <svg> element. */
export function iconDrawing(name: RbmIconName): string {
  return iconSource(name).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}
