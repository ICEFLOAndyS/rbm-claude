import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmRegionCollapsed, RbmRegionToggle, RbmSummaryChip } from './RbmRegion';
import { rbmTheme } from '../../theme/theme';

const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

describe('RbmRegion', () => {
  it('collapses to one line: the title, the summary chips and Expand', async () => {
    const onExpand = vi.fn();
    renderUi(
      <RbmRegionCollapsed title="Task Timeline" onExpand={onExpand}>
        <RbmSummaryChip label="12 in focus">12 in focus</RbmSummaryChip>
        <RbmSummaryChip label="3 late">3 late</RbmSummaryChip>
      </RbmRegionCollapsed>,
    );
    const region = screen.getByRole('region', { name: 'Task Timeline' });
    expect(region).toHaveStyle({ height: '56px' });
    expect(region).toHaveTextContent(/^Task Timeline/);
    const chips = within(screen.getByRole('list', { name: 'Task Timeline summary' })).getAllByRole('listitem');
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual(['12 in focus', '3 late']);
    await userEvent.click(screen.getByRole('button', { name: 'Expand Task Timeline' }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('names the toggle after the region, so several on one page are told apart', async () => {
    const onChange = vi.fn();
    renderUi(<RbmRegionToggle region="Hot-topics strip" collapsed={false} onChange={onChange} />);
    const button = screen.getByRole('button', { name: 'Collapse Hot-topics strip' });
    expect(button).toHaveTextContent('Collapse');
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
