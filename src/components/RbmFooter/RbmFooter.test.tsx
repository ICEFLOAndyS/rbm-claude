import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { RbmFooter, type RbmFooterProps } from './RbmFooter';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';
import { shellSize, type DensityLevel } from '../../theme/tokens';

function setWidth(width: number) {
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
    return { matches, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false };
  }) as typeof window.matchMedia;
}
const original = window.matchMedia;
beforeEach(() => setWidth(1280));
afterEach(() => {
  window.matchMedia = original;
});

const links = { privacy: 'https://iceflo.com/privacy', support: 'https://support.iceflo.com', knowledge: 'https://kb.iceflo.com' };
const board: RbmFooterProps = { version: '4.2.0', year: 2026, updatedAt: '10:42:18', environment: { name: 'Production', production: true }, links };

function renderFooter(props: Partial<RbmFooterProps> = {}, level: DensityLevel = 'compact') {
  return render(
    <ThemeProvider theme={rbmTheme}>
      <RbmDensity level={level}>
        <RbmFooter {...board} {...props} />
      </RbmDensity>
    </ThemeProvider>,
  );
}

describe('RbmFooter', () => {
  it('is the page footer: copyright and version, sync time, environment, then the three links', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toMatch(/^© 2026 ICEFLO Limited · RBM 4\.2\.0Updated 10:42:18Production/);
    expect(within(footer).getAllByRole('link').map((l) => l.firstChild?.textContent)).toEqual(['Privacy', 'Support', 'Knowledge']);
  });

  it('opens each link in a new tab, and says so to screen readers', () => {
    renderFooter();
    const privacy = screen.getByRole('link', { name: 'Privacy (opens in a new tab)' });
    expect(privacy).toHaveAttribute('href', links.privacy);
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(privacy).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('hides "(opens in a new tab)" in a 1 px box, so it never widens the page', () => {
    renderFooter();
    const hidden = screen.getAllByText('(opens in a new tab)')[0]!;
    expect(hidden).toHaveStyle({ position: 'absolute', width: '1px', height: '1px' });
  });

  it('leaves out a link without an address', () => {
    renderFooter({ links: { support: links.support } });
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('has no buttons: no actions in the footer', () => {
    renderFooter();
    expect(screen.queryAllByRole('button')).toEqual([]);
  });

  it.each(['comfortable', 'compact', 'dense'] as const)('is the board height at %s', (level) => {
    renderFooter({}, level);
    expect(screen.getByRole('contentinfo')).toHaveStyle({ height: `${shellSize[level].footer}px` });
  });
});

describe('RbmFooter: states', () => {
  it('names Production quietly, as text', () => {
    renderFooter();
    expect(screen.getByText('Production').closest('.MuiChip-root')).toBeNull();
  });

  it.each(['UAT', 'Test'])('shows %s as a chip', (name) => {
    renderFooter({ environment: { name, production: false } });
    expect(screen.getByText(name).closest('.MuiChip-root')).not.toBeNull();
  });

  it('shows "Reconnecting" with the At risk ringed dot when the connection is lost, and announces it', () => {
    renderFooter({ connection: 'reconnecting' });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Reconnecting');
    expect(within(status).getByTestId('rbm-status-core')).toBeInTheDocument();
    expect(screen.queryByText(/Updated/)).toBeNull();
  });
});

describe('RbmFooter: widths', () => {
  it('hides the links from 600 to 899 px', () => {
    setWidth(800);
    renderFooter();
    expect(screen.queryAllByRole('link')).toEqual([]);
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2026 ICEFLO Limited');
  });

  it('shows the version and sync time only under 600 px', () => {
    setWidth(390);
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toBe('RBM 4.2.0Updated 10:42:18');
  });
});

describe('RbmFooter: D0 Command', () => {
  it('is status only: Live, the sync time and the version', () => {
    renderFooter({}, 'command');
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toBe('LiveUpdated 10:42:18RBM 4.2.0');
    expect(footer).toHaveStyle({ height: '40px' });
    expect(within(footer).queryAllByRole('link')).toEqual([]);
  });

  it('shows Reconnecting instead of Live', () => {
    renderFooter({ connection: 'reconnecting' }, 'command');
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting');
    expect(screen.queryByText('Live')).toBeNull();
  });
});
