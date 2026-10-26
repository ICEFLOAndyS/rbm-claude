import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RbmScenarioFilter } from './RbmScenarioFilter';
import { RbmPageHeader } from '../RbmPageHeader/RbmPageHeader';
import { RbmDensity } from '../../theme/RbmDensity';
import type { RbmScenario } from '../../data/scenarios/scenarios';

const two: RbmScenario[] = ['planned-change', 'disaster-recovery'];

interface HarnessProps {
  available?: RbmScenario[];
  profile?: RbmScenario[];
  start?: RbmScenario[];
  onChange?: (shown: RbmScenario[]) => void;
}

function Harness({ available = two, profile = ['planned-change'], start = profile, onChange = () => {} }: HarnessProps) {
  const [shown, setShown] = useState<RbmScenario[]>(start);
  return (
    <RbmDensity level="compact">
      <RbmScenarioFilter
        available={available}
        profile={profile}
        value={shown}
        onChange={(s) => {
          setShown(s);
          onChange(s);
        }}
      />
    </RbmDensity>
  );
}

// While the popover is open the page behind is aria-hidden (MUI's modal), so the button is found even when hidden.
const button = () => screen.getByRole('button', { name: /^Scenario:/, hidden: true });

describe('RbmScenarioFilter', () => {
  it('says what is shown in words: the name, a count, or All available', () => {
    const { unmount } = render(<Harness />);
    expect(button()).toHaveAccessibleName('Scenario: Planned Change. Change scenarios shown');
    expect(button()).toHaveTextContent('ScenarioPlanned Change');
    unmount();
    render(<Harness available={['planned-change', 'disaster-recovery', 'cyber-recovery']} start={two} />);
    expect(button()).toHaveTextContent('2 scenarios');
  });

  it('opens a group of checkboxes labelled Scenarios, with the available scenarios only', async () => {
    render(<Harness />);
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button());
    expect(button()).toHaveAttribute('aria-expanded', 'true');
    const group = screen.getByRole('group', { name: 'Scenarios' });
    expect(within(group).getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)).toEqual(['Planned ChangeIn your profile', 'Disaster Recovery']);
    expect(within(group).getByRole('status')).toHaveTextContent('1 of 2 shown');
  });

  it('Space toggles a box and the count changes; it never changes the profile', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(button());
    const dr = screen.getByRole('checkbox', { name: 'Disaster Recovery' });
    dr.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith(two);
    expect(screen.getByRole('status')).toHaveTextContent('2 of 2 shown');
    expect(screen.getByRole('checkbox', { name: /Planned Change/ })).toHaveAccessibleDescription('In your profile');
  });

  it('keeps one shown: the last box ticked cannot be cleared', async () => {
    render(<Harness />);
    await userEvent.click(button());
    expect(screen.getByRole('checkbox', { name: /Planned Change/ })).toBeDisabled();
  });

  it('Show all shows every available scenario; My profile goes back to the profile', async () => {
    render(<Harness />);
    await userEvent.click(button());
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(button()).toHaveTextContent('All available');
    await userEvent.click(screen.getByRole('button', { name: 'My profile' }));
    expect(button()).toHaveTextContent('Planned Change');
  });

  it('Escape closes it and returns focus to the button', async () => {
    render(<Harness />);
    await userEvent.click(button());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Scenarios' })).toBeNull());
    expect(button()).toHaveFocus();
  });

  it('sits first in the page header context row, before the programme', () => {
    render(
      <RbmDensity level="compact">
        <RbmPageHeader title="Events" programme={{ id: 'q4', name: 'Q4 Data Centre Migration' }} scenarios={{ available: two, profile: ['planned-change'], value: ['planned-change'], onChange: () => {} }} />
      </RbmDensity>,
    );
    const context = screen.getByRole('group', { name: 'Context' });
    expect(context.textContent).toMatch(/^ScenarioPlanned Change.*Programme/);
  });
});
