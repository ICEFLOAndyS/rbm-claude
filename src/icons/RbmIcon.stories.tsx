import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmIcon } from './RbmIcon';
import { rbmIconKeys, unregisteredGroups, type RbmIconGroup, type RbmIconName } from './registry';
import { RbmDensity } from '../theme/RbmDensity';
import { colour, density, type DensityLevel } from '../theme/tokens';

const meta: Meta<typeof RbmIcon> = {
  title: 'Foundations/Icons',
  component: RbmIcon,
  args: { name: 'nav.list' },
};
export default meta;

type Story = StoryObj<typeof RbmIcon>;

const groupNames: Record<RbmIconGroup, string> = {
  object: 'Objects',
  role: 'User roles',
  state: 'States',
  construct: 'Actions: Construction',
  control: 'Actions: Control',
  display: 'Actions: Display',
  nav: 'Navigation',
  centre: 'Centres',
  admin: 'Admin pages',
  taskType: 'Task types',
  shell: 'Shell',
};

/** Every suite icon is a first-pass drawing; the shell icons are not in the suite yet. */
function Marker({ group }: { group: RbmIconGroup }) {
  const outside = unregisteredGroups.includes(group);
  return (
    <Box component="span" sx={{ ml: 2, px: 1.5, py: 0.25, borderRadius: '999px', border: `1px solid ${colour.silver}`, fontSize: 11, fontWeight: 700, color: colour.slate, letterSpacing: 0, textTransform: 'none' }}>
      {outside ? 'Not in the Icon suite' : 'Proposed'}
    </Box>
  );
}

const namesOf = (group: RbmIconGroup) => rbmIconKeys[group].map((key) => `${group}.${key}` as RbmIconName);

function Group({ group }: { group: RbmIconGroup }) {
  return (
    <Box component="section" aria-label={groupNames[group]}>
      <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colour.slate, mb: 2 }}>
        {groupNames[group]} ({rbmIconKeys[group].length})
        <Marker group={group} />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {namesOf(group).map((name) => (
          <Box key={name} sx={{ width: 148, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 3, border: `1px solid ${colour.rule}`, borderRadius: '12px', color: colour.deepBlue }}>
            <RbmIcon name={name} />
            <Box component="code" sx={{ fontSize: 11, color: colour.ink }}>{name}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** One icon. Its size comes from the density (24 px outside a region) and its colour from the text. */
export const Single: Story = {};

/** Informative: carries meaning alone, so it has a name for screen readers. */
export const WithTitle: Story = { args: { name: 'state.paused', title: 'Paused' } };

/** Every registered icon, by group: 108 in the suite and 6 shell icons outside it. */
export const Registry: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gap: 6 }}>
      {(Object.keys(rbmIconKeys) as RbmIconGroup[]).map((group) => (
        <Group key={group} group={group} />
      ))}
    </Box>
  ),
};

const groupStory = (group: RbmIconGroup): Story => ({ name: groupNames[group], render: () => <Group group={group} /> });
export const Objects = groupStory('object');
export const Roles = groupStory('role');
export const States = groupStory('state');
export const Construction = groupStory('construct');
export const Control = groupStory('control');
export const Display = groupStory('display');
export const Navigation = groupStory('nav');
export const Centres = groupStory('centre');
export const AdminPages = groupStory('admin');
export const TaskTypes = groupStory('taskType');
export const Shell = groupStory('shell');

/** Every icon at the four density sizes (Icon suite board, "Sizes"). D3 draws a slightly heavier stroke. */
export const Sizes: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gap: 4, color: colour.deepBlue }}>
      {(Object.keys(density) as DensityLevel[]).map((level) => (
        <RbmDensity key={level} level={level}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
            <Box sx={{ width: 140, flex: 'none', fontSize: 13, color: colour.slate }}>{level}, {density[level].icon} px</Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {(Object.keys(rbmIconKeys) as RbmIconGroup[]).flatMap(namesOf).map((name) => (
                <RbmIcon key={name} name={name} title={name} />
              ))}
            </Box>
          </Box>
        </RbmDensity>
      ))}
    </Box>
  ),
};

/** Sets the icon suite brief (rev 2, section 9) asks to check side by side at 16 px, as at D3. */
const lookAlikes: { title: string; names: RbmIconName[] }[] = [
  { title: 'Standard against the state rings', names: ['taskType.standard', 'state.initial', 'state.available', 'state.skipped'] },
  { title: 'Checkpoint against Local and Automated', names: ['taskType.checkpoint', 'object.localTeam', 'object.localWorkstream', 'taskType.automated'] },
  { title: 'Milestone against Decision', names: ['taskType.milestone', 'object.decision'] },
  { title: 'Move against Previous, Next and Sort', names: ['construct.moveUp', 'construct.moveDown', 'display.previous', 'display.next', 'display.sort'] },
  { title: 'Task against Approve', names: ['object.task', 'control.approve'] },
  { title: 'Centre badges: crosshair and star', names: ['centre.commandControl', 'centre.executiveBriefing', 'centre.verification', 'centre.audit', 'centre.migration', 'centre.base'] },
  { title: 'Centre base against Template', names: ['centre.base', 'object.template', 'nav.list'] },
  { title: 'Content Pack against Integrations', names: ['object.contentPack', 'nav.integrations'] },
  { title: 'Event Group against Event and Schedule', names: ['object.eventGroup', 'object.event', 'object.schedule'] },
  { title: 'Versions against Support', names: ['nav.versions', 'nav.support'] },
  { title: 'Sign out against Open full page', names: ['display.signOut', 'display.openFullPage'] },
  { title: 'Admin Centre against the Centres; Diagnostics against Automated', names: ['centre.admin', 'centre.verification', 'centre.base', 'admin.diagnostics', 'admin.systemProperties', 'taskType.automated'] },
];

/** Look-alikes at 16, 20 and 24 px, for the designer's review. */
export const LookAlikes: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gap: 4, color: colour.deepBlue }}>
      {lookAlikes.map((set) => (
        <Box key={set.title} sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Box sx={{ width: 300, flex: 'none', fontSize: 13, color: colour.slate }}>{set.title}</Box>
          {[16, 20, 24].map((size) => (
            <Box key={size} sx={{ display: 'flex', gap: 3, pr: 4, borderRight: `1px solid ${colour.rule}` }}>
              {set.names.map((name) => (
                <RbmIcon key={name} name={name} size={size} title={name} />
              ))}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  ),
};

/** The sidebar's icons in white on Deep Blue: currentColor follows the text. */
export const OnDeepBlue: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 4, p: 4, bgcolor: colour.deepBlue, color: colour.white, borderRadius: '12px', width: 'fit-content' }}>
      {[...namesOf('nav'), 'object.template', 'object.team', 'object.workstream'].map((name) => (
        <RbmIcon key={name} name={name as RbmIconName} />
      ))}
    </Box>
  ),
};
