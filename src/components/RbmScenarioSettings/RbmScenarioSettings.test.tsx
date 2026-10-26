import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RbmScenarioSettings } from './RbmScenarioSettings';
import { RbmDensity } from '../../theme/RbmDensity';
import type { RbmScenarioSettings as Settings } from '../../data/scenarios/scenarios';

/** The board's example: two available, Planned Change on by default. */
const board: Settings = { available: ['planned-change', 'disaster-recovery'], defaults: ['planned-change'] };

const renderPage = (onSave = vi.fn()) => {
  render(
    <RbmDensity level="compact">
      <RbmScenarioSettings settings={board} onSave={onSave} breadcrumb={[{ label: 'Admin Centre', href: '#/rbm-admin/centre' }]} />
    </RbmDensity>,
  );
  return onSave;
};

const rowText = () => screen.getAllByRole('row').slice(1).map((r) => r.textContent);

describe('RbmScenarioSettings', () => {
  it('has the header, the breadcrumb and the four scenarios with words for every state', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Scenarios' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin Centre' })).toHaveAttribute('href', '#/rbm-admin/centre');
    expect(rowText()).toEqual(['Planned ChangeAvailableOn', 'Disaster RecoveryAvailableOff', 'Cyber RecoveryLockedOff', 'Service RecoveryLockedOff']);
  });

  it('a locked row is a real, unchecked checkbox; its default is disabled', () => {
    renderPage();
    expect(screen.getByRole('checkbox', { name: 'Cyber Recovery: available' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Cyber Recovery: on by default' })).toBeDisabled();
  });

  it('locking a scenario turns its default off', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Disaster Recovery: available' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cyber Recovery: available' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cyber Recovery: on by default' }));
    expect(rowText()[2]).toBe('Cyber RecoveryAvailableOn');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cyber Recovery: available' }));
    expect(rowText()[2]).toBe('Cyber RecoveryLockedOff');
  });

  it('refuses to save with nothing on by default, and says why', async () => {
    const onSave = renderPage();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Planned Change: on by default' }));
    expect(screen.getByRole('alert')).toHaveTextContent('At least one scenario must be on by default.');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the changes, and Cancel puts the saved settings back', async () => {
    const onSave = renderPage();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Service Recovery: available' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(rowText()[3]).toBe('Service RecoveryLockedOff');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Service Recovery: available' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith({ available: ['planned-change', 'disaster-recovery', 'service-recovery'], defaults: ['planned-change'] });
    expect(within(screen.getByRole('main')).getAllByRole('status').some((s) => s.textContent === 'Saved.')).toBe(true);
  });
});
