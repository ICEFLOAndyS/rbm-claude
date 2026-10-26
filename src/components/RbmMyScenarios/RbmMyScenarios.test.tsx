import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RbmMyScenarios } from './RbmMyScenarios';
import { RbmDensity } from '../../theme/RbmDensity';
import type { RbmScenario, RbmScenarioSettings } from '../../data/scenarios/scenarios';

const board: RbmScenarioSettings = { available: ['planned-change', 'disaster-recovery'], defaults: ['planned-change'] };

const renderPanel = (own: RbmScenario[] | undefined, onSave = vi.fn()) => {
  render(
    <RbmDensity level="compact">
      <RbmMyScenarios settings={board} own={own} onSave={onSave} />
    </RbmDensity>,
  );
  return onSave;
};

describe('RbmMyScenarios', () => {
  it("offers the available scenarios only, and says when the organisation's default is in use", () => {
    renderPanel(undefined);
    expect(screen.getByRole('heading', { name: 'My scenarios' })).toBeInTheDocument();
    expect(screen.getByText('Choose the scenarios you work in. Your administrator has made 2 available.')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)).toEqual(['Planned Change', 'Disaster Recovery']);
    expect(screen.getByRole('checkbox', { name: 'Planned Change' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent("Using your organisation's default.");
    expect(screen.getByRole('button', { name: 'Reset to organisation default' })).toBeDisabled();
  });

  it("saves the user's own choice", async () => {
    const onSave = renderPanel(undefined);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Disaster Recovery' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(['planned-change', 'disaster-recovery']);
  });

  it("resets to the organisation's default", async () => {
    const onSave = renderPanel(['disaster-recovery']);
    expect(screen.getByRole('status')).toHaveTextContent('Using your own choice.');
    await userEvent.click(screen.getByRole('button', { name: 'Reset to organisation default' }));
    expect(onSave).toHaveBeenCalledWith(undefined);
  });
});
