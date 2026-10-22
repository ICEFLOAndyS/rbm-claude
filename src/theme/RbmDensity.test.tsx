import { render, screen } from '@testing-library/react';
import { Button, Checkbox, InputBase, ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmDensity, useDensity } from './RbmDensity';
import { rbmTheme } from './theme';
import { density } from './tokens';

const renderThemed = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

function Probe({ name }: { name: string }) {
  const d = useDensity();
  return <output aria-label={name}>{`${d.level} ${d.row}`}</output>;
}

describe('RbmDensity', () => {
  it('is D1 Comfortable outside any region (the Density board default)', () => {
    renderThemed(<Probe name="outside" />);
    expect(screen.getByLabelText('outside')).toHaveTextContent(`comfortable ${density.comfortable.row}`);
  });

  it('sets the level for everything inside, and regions nest', () => {
    renderThemed(
      <RbmDensity level="compact">
        <Probe name="page" />
        <RbmDensity level="dense">
          <Probe name="panel" />
        </RbmDensity>
      </RbmDensity>,
    );
    expect(screen.getByLabelText('page')).toHaveTextContent('compact 44');
    expect(screen.getByLabelText('panel')).toHaveTextContent('dense 32');
  });

  it.each(['command', 'comfortable', 'compact', 'dense'] as const)('sizes MUI controls from the %s tokens: control height, target and body text', (level) => {
    const d = density[level];
    renderThemed(
      <RbmDensity level={level}>
        <Button>Save</Button>
        <InputBase inputProps={{ 'aria-label': 'Name' }} />
        <Checkbox slotProps={{ input: { 'aria-label': 'Pick' } }} />
      </RbmDensity>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toHaveStyle({ minHeight: `${d.control}px`, fontSize: `${d.body}px` });
    expect(screen.getByRole('textbox', { name: 'Name' }).closest('.MuiInputBase-root')).toHaveStyle({ minHeight: `${d.control}px`, fontSize: `${d.body}px` });
    // The checkbox's padding brings its icon up to the minimum target.
    expect(screen.getByRole('checkbox', { name: 'Pick' }).closest('.MuiCheckbox-root')).toHaveStyle({ padding: `${(d.target - d.icon) / 2}px` });
  });

  it('keeps the D1 button sizes in the base theme, from the tokens', () => {
    renderThemed(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveStyle({ minHeight: `${density.comfortable.control}px`, fontSize: `${density.comfortable.body}px` });
  });

  it('sets CSS variables for the region', () => {
    const { container } = renderThemed(
      <RbmDensity level="compact">
        <span />
      </RbmDensity>,
    );
    const region = container.querySelector('[data-density="compact"]') as HTMLElement;
    expect(getComputedStyle(region).getPropertyValue('--rbm-row')).toBe('44px');
    expect(getComputedStyle(region).getPropertyValue('--rbm-dot')).toBe('10px');
  });
});
