import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RbmActionButton } from './RbmActionButton';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, density, type DensityLevel } from '../../theme/tokens';

const renderAt = (ui: React.ReactElement, level: DensityLevel = 'compact') => render(<RbmDensity level={level}>{ui}</RbmDensity>);

describe('RbmActionButton: icon and text', () => {
  it('shows the icon and the word, and its name is the word', () => {
    renderAt(<RbmActionButton icon="construct.edit" label="Edit" />);
    const button = screen.getByRole('button', { name: 'Edit' });
    expect(button).toHaveTextContent('Edit');
    expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'construct.edit');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('takes a fuller name that starts with the word', () => {
    renderAt(<RbmActionButton icon="construct.edit" label="Edit" name="Edit Details" />);
    expect(screen.getByRole('button', { name: 'Edit Details' })).toHaveTextContent('Edit');
  });

  it('can be text only', () => {
    renderAt(<RbmActionButton label="Import" />);
    expect(screen.getByRole('button', { name: 'Import' }).querySelector('svg')).toBeNull();
  });
});

describe('RbmActionButton: icon only', () => {
  it('is named by its label, shows no text, and has a tooltip', async () => {
    renderAt(<RbmActionButton icon="construct.edit" label="Edit" iconOnly />);
    const button = screen.getByRole('button', { name: 'Edit' });
    expect(button.textContent).toBe('');
    act(() => button.focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Edit');
  });

  it.each(['comfortable', 'compact', 'dense'] as const)('is a square at the control height at %s', (level) => {
    renderAt(<RbmActionButton icon="construct.edit" label="Edit" iconOnly />, level);
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveStyle({ height: `${density[level].control}px`, minWidth: `${density[level].control}px` });
  });
});

describe('RbmActionButton: as drawn', () => {
  it('is white with a 1 px Slate border and a Deep Blue icon', () => {
    renderAt(<RbmActionButton icon="construct.edit" label="Edit" />);
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveStyle({ backgroundColor: colour.white, color: colour.deepBlue, border: `1px solid ${colour.slate}` });
  });

  it('calls its action, and not when disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = renderAt(<RbmActionButton icon="construct.edit" label="Edit" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <RbmDensity level="compact">
        <RbmActionButton icon="construct.edit" label="Edit" onClick={onClick} disabled />
      </RbmDensity>,
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  });
});
