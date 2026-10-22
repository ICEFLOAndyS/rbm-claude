import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import { RbmDensity, useDensity } from './RbmDensity';
import { colour, radius, type DensityLevel } from './tokens';

const names: Record<DensityLevel, string> = { command: 'D0 Command', comfortable: 'D1 Comfortable', compact: 'D2 Compact', dense: 'D3 Dense' };

/** The tokens for the current region, and MUI's controls sized from them. */
function Sample() {
  const d = useDensity();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${d.gap}px`, p: `${d.padX}px`, border: `1px solid ${colour.rule}`, borderRadius: `${radius.card}px`, minWidth: 240 }}>
      <Typography variant="overline">{names[d.level]}</Typography>
      <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 3, fontSize: d.caption, color: colour.slate }}>
        {(['row', 'control', 'target', 'body', 'caption', 'padX', 'gap', 'icon', 'dot'] as const).map((k) => (
          <Box key={k} sx={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd style={{ margin: 0 }}>{d[k]} px</dd>
          </Box>
        ))}
      </Box>
      <Button variant="contained" color="secondary">New event</Button>
      <Button variant="outlined">Import</Button>
      <TextField placeholder="Search events" />
      <FormControlLabel control={<Checkbox defaultChecked />} label="Select" />
    </Box>
  );
}

const meta: Meta<typeof RbmDensity> = {
  title: 'Foundations/Density',
  component: RbmDensity,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof RbmDensity>;

/** The four levels from the Density board, side by side. Each column is its own region. */
export const AllLevels: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {(['command', 'comfortable', 'compact', 'dense'] as const).map((level) => (
        <RbmDensity key={level} level={level}>
          <Sample />
        </RbmDensity>
      ))}
    </Box>
  ),
};

/** Regions nest: a dense panel inside a compact page (the board's example). */
export const Nested: Story = {
  render: () => (
    <RbmDensity level="compact">
      <Box sx={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <Sample />
        <RbmDensity level="dense">
          <Sample />
        </RbmDensity>
      </Box>
    </RbmDensity>
  ),
};
