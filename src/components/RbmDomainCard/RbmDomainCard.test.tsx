import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RbmDomainCard, type RbmDomainCardSpec } from './RbmDomainCard';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, type DensityLevel } from '../../theme/tokens';

const teams: RbmDomainCardSpec = { title: 'Teams', description: 'Groups that own tasks', icon: 'object.team', count: '12 teams', to: '/rbm-admin/centre/teams' };
const servicenow: RbmDomainCardSpec = {
  title: 'ServiceNow',
  description: 'Runbook and event records',
  icon: 'nav.integrations',
  logo: { src: '/logos/servicenow.svg' },
  status: { label: 'Connected', tone: 'on' },
  to: '/rbm-admin/setup-config/integrations/servicenow',
};

const renderCard = (spec: RbmDomainCardSpec, level: DensityLevel = 'comfortable', props = {}) =>
  render(
    <RbmDensity level={level}>
      <RbmDomainCard spec={spec} {...props} />
    </RbmDensity>,
  );

describe('RbmDomainCard: the card is one link', () => {
  it('is one link to the domain page, named by its title, with no buttons inside', () => {
    renderCard(teams);
    const link = screen.getByRole('link', { name: 'Teams' });
    expect(link).toHaveAttribute('href', '/rbm-admin/centre/teams');
    expect(screen.queryAllByRole('button')).toEqual([]);
  });

  it('is described by its line and its value, so screen readers hear the status too', () => {
    renderCard(servicenow);
    expect(screen.getByRole('link', { name: 'ServiceNow' })).toHaveAccessibleDescription('Runbook and event records Connected');
  });

  it('takes the page link (hrefFor) and calls onNavigate on a plain click', async () => {
    const onNavigate = vi.fn();
    renderCard(teams, 'comfortable', { href: '#/rbm-admin/centre/teams', onNavigate });
    const link = screen.getByRole('link', { name: 'Teams' });
    expect(link).toHaveAttribute('href', '#/rbm-admin/centre/teams');
    await userEvent.click(link);
    expect(onNavigate).toHaveBeenCalledWith('/rbm-admin/centre/teams');
  });
});

describe('RbmDomainCard: the media tile', () => {
  it('shows the RBM icon on the pale fill when there is no logo', () => {
    renderCard(teams);
    const tile = screen.getByTestId('rbm-domain-tile');
    expect(tile).toHaveAttribute('data-media', 'icon');
    expect(tile).toHaveStyle({ backgroundColor: colour.mist });
    expect(tile.querySelector('svg')).toHaveAttribute('data-icon', 'object.team');
  });

  it('shows the vendor logo, decorative and fitted, on white with a hairline border', () => {
    renderCard(servicenow);
    const tile = screen.getByTestId('rbm-domain-tile');
    expect(tile).toHaveAttribute('data-media', 'logo');
    expect(tile).toHaveStyle({ backgroundColor: colour.white });
    const img = tile.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveStyle({ objectFit: 'contain' });
  });

  it('falls back to the icon when the logo fails to load', () => {
    renderCard(servicenow);
    fireEvent.error(screen.getByTestId('rbm-domain-tile').querySelector('img')!);
    const tile = screen.getByTestId('rbm-domain-tile');
    expect(tile).toHaveAttribute('data-media', 'icon');
    expect(tile.querySelector('svg')).toHaveAttribute('data-icon', 'nav.integrations');
  });
});

describe('RbmDomainCard: the value', () => {
  it('shows a status as a dot and words: Connected in Blue Dark, never green', () => {
    renderCard(servicenow);
    expect(screen.getByText('Connected')).toHaveStyle({ color: colour.blueDark });
  });

  it('shows Not connected in Slate, with a ring', () => {
    renderCard({ ...servicenow, status: { label: 'Not connected', tone: 'off' } });
    expect(screen.getByText('Not connected')).toHaveStyle({ color: colour.slate });
  });

  it('shows a count', () => {
    renderCard(teams);
    expect(screen.getByText('12 teams')).toBeInTheDocument();
  });
});

describe('RbmDomainCard: sizes by density (Cards board)', () => {
  it.each([
    ['command', 88],
    ['comfortable', 56],
    ['compact', 40],
    ['dense', 28],
  ] as const)('at %s the tile is %i px', (level, tile) => {
    renderCard(teams, level);
    expect(screen.getByTestId('rbm-domain-tile')).toHaveStyle({ width: `${tile}px`, height: `${tile}px` });
  });

  it('at D3 is one row, with no line', () => {
    renderCard(teams, 'dense');
    expect(screen.queryByText('Groups that own tasks')).toBeNull();
    expect(screen.getByText('12 teams')).toBeInTheDocument();
  });
});
