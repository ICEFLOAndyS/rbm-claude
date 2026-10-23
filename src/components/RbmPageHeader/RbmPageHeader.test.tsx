import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { RbmPageHeader, type RbmPageHeaderProps } from './RbmPageHeader';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';
import { shellSize, type DensityLevel } from '../../theme/tokens';

const programmes = [
  { id: 'q4', name: 'Q4 Data Centre Migration' },
  { id: 'erp', name: 'ERP Upgrade' },
];

const board: RbmPageHeaderProps = {
  title: 'Q4 Data Centre Cutover',
  status: { state: 'active', label: 'In progress' },
  breadcrumb: [{ label: 'Runbooks', href: '#/runbooks' }],
  metadata: 'Owner A. Smith · Window 24 Oct 22:00 – 25 Oct 06:00',
  programme: programmes[0],
  programmes,
  event: { name: 'Q4 Data Centre Cutover', state: 'active', stateLabel: 'In progress' },
  actions: [{ label: 'Edit', onClick: () => {} }],
  primaryAction: { label: 'Start run', onClick: () => {} },
};

function renderHeader(props: Partial<RbmPageHeaderProps> = {}, level: DensityLevel = 'compact') {
  return render(
    <ThemeProvider theme={rbmTheme}>
      <RbmDensity level={level}>
        <RbmPageHeader {...board} {...props} />
      </RbmDensity>
    </ThemeProvider>,
  );
}

describe('RbmPageHeader', () => {
  it('has the page title as the one heading', () => {
    renderHeader();
    expect(screen.getByRole('heading', { level: 1, name: 'Q4 Data Centre Cutover' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  it.each(['comfortable', 'compact', 'dense'] as const)('sizes the title from the shell table at %s', (level) => {
    renderHeader({}, level);
    expect(screen.getByRole('heading', { level: 1 })).toHaveStyle({ fontSize: `${shellSize[level].pageTitle}px` });
  });

  it('shows the status pill beside the title, with its label', () => {
    renderHeader();
    const row = screen.getByRole('heading', { level: 1 }).parentElement!;
    expect(row).toHaveTextContent('In progress');
  });

  it('leaves the status out when the page has none', () => {
    renderHeader({ status: undefined, event: undefined });
    expect(screen.queryByText('In progress')).toBeNull();
  });

  it('shows one line of metadata', () => {
    renderHeader();
    expect(screen.getByText(board.metadata!)).toHaveStyle({ whiteSpace: 'nowrap' });
  });
});

describe('RbmPageHeader: breadcrumb', () => {
  it('links the parents, and the last crumb is the page, not a link', () => {
    renderHeader({ breadcrumb: [{ label: 'Events', href: '#/events' }, { label: 'REV000009', href: '#/events/REV000009' }] });
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getAllByRole('link').map((l) => l.textContent)).toEqual(['Events', 'REV000009']);
    const page = within(crumbs).getByText('Q4 Data Centre Cutover');
    expect(page).toHaveAttribute('aria-current', 'page');
    expect(page.closest('a')).toBeNull();
  });

  it('is the page alone with no parents', () => {
    renderHeader({ breadcrumb: [] });
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).queryAllByRole('link')).toEqual([]);
  });

  it('allows at most three parents, so four levels (a type check)', () => {
    const c = { label: 'x', href: '#' };
    // @ts-expect-error four parents would make five levels
    const tooMany: RbmPageHeaderProps['breadcrumb'] = [c, c, c, c];
    expect(tooMany).toHaveLength(4);
  });
});

describe('RbmPageHeader: context row', () => {
  it('shows the programme and, on event pages, the event with its status', () => {
    renderHeader();
    const context = screen.getByRole('group', { name: 'Context' });
    expect(context).toHaveTextContent('Q4 Data Centre Migration');
    expect(context).toHaveTextContent('Q4 Data Centre Cutover');
    expect(context).toHaveTextContent('In progress');
  });

  it('is not there without a programme or an event', () => {
    renderHeader({ programme: undefined, event: undefined });
    expect(screen.queryByRole('group', { name: 'Context' })).toBeNull();
  });

  it('switches the programme from its menu', async () => {
    const onProgrammeChange = vi.fn();
    renderHeader({ onProgrammeChange });
    const switcher = screen.getByRole('button', { name: /Change programme/ });
    expect(switcher).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(switcher);
    expect(screen.getByRole('menuitem', { name: 'Q4 Data Centre Migration' })).toHaveClass('Mui-selected');
    await userEvent.click(screen.getByRole('menuitem', { name: 'ERP Upgrade' }));
    expect(onProgrammeChange).toHaveBeenCalledWith('erp');
  });

  it('closes the switcher on Escape and returns focus to it', async () => {
    renderHeader();
    const switcher = screen.getByRole('button', { name: /Change programme/ });
    act(() => switcher.focus());
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('menu', { name: 'Programmes' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(switcher).toHaveFocus();
  });

  it('shows the programme without a switcher when there is nothing to switch to', () => {
    renderHeader({ programmes: [programmes[0]!] });
    expect(screen.queryByRole('button', { name: /Change programme/ })).toBeNull();
    expect(screen.getByRole('group', { name: 'Context' })).toHaveTextContent('Q4 Data Centre Migration');
  });
});

describe('RbmPageHeader: actions', () => {
  it('puts the secondary actions first and the one green call to action last', () => {
    renderHeader({ actions: [{ label: 'Import', onClick: () => {} }, { label: 'Edit', onClick: () => {} }] });
    const buttons = within(screen.getByRole('group', { name: 'Page actions' })).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Import', 'Edit', 'Start run']);
    expect(buttons.at(-1)).toHaveClass('MuiButton-contained', 'MuiButton-colorSecondary');
    expect(buttons[0]).toHaveClass('MuiButton-outlined', 'MuiButton-colorPrimary');
  });

  it('calls the action', async () => {
    const onClick = vi.fn();
    renderHeader({ primaryAction: { label: 'Start run', onClick } });
    await userEvent.click(screen.getByRole('button', { name: 'Start run' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('has no actions area without actions', () => {
    renderHeader({ actions: [], primaryAction: undefined });
    expect(screen.queryByRole('group', { name: 'Page actions' })).toBeNull();
  });

  it('takes the control height from the density', () => {
    renderHeader({}, 'comfortable');
    expect(screen.getByRole('button', { name: 'Start run' })).toHaveStyle({ minHeight: '48px' });
  });
});
