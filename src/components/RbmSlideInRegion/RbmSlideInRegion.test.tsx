import { useRef, useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RbmSlideInRegion, SLIDE_IN_WIDTH, type RbmSlideInRegionProps } from './RbmSlideInRegion';

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

/** A stand-in shell: header, a content area that the region overlays, and footer. */
function Shell(props: Partial<RbmSlideInRegionProps>) {
  const content = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [, rerender] = useState(0);
  return (
    <>
      <header>Page header</header>
      <div data-testid="content" ref={(el) => { content.current = el; if (el) rerender(1); }} style={{ position: 'relative' }}>
        <button type="button" onClick={() => setOpen(true)}>
          Open REV000009
        </button>
        <RbmSlideInRegion open={open} onClose={() => setOpen(false)} container={content.current} label="REV000009 Weekend Payroll Cutover" {...props}>
          <p>Record panel</p>
          <button type="button">Save</button>
        </RbmSlideInRegion>
      </div>
      <footer>Footer</footer>
    </>
  );
}

describe('RbmSlideInRegion', () => {
  it('opens over the content only: inside the content area, not the header or footer', async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole('button', { name: 'Open REV000009' }));
    const dialog = screen.getByRole('dialog', { name: 'REV000009 Weekend Payroll Cutover' });
    expect(within(screen.getByTestId('content')).getByRole('dialog')).toBe(dialog);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Page header')).toBeVisible();
    expect(screen.getByText('Footer')).toBeVisible();
  });

  it('does not move the content: the content area keeps its children in place', async () => {
    render(<Shell />);
    const opener = screen.getByRole('button', { name: 'Open REV000009' });
    const before = opener.parentElement;
    await userEvent.click(opener);
    expect(opener.parentElement).toBe(before);
    expect(screen.getByTestId('content')).toHaveStyle({ position: 'relative' });
  });

  it(`is ${SLIDE_IN_WIDTH} px wide from 900 px, positioned in the content area`, async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole('button', { name: 'Open REV000009' }));
    expect(screen.getByRole('dialog')).toHaveStyle({ width: `${SLIDE_IN_WIDTH}px`, position: 'absolute' });
  });

  it('takes another width, such as the record pattern’s wide panel', async () => {
    render(<Shell width={800} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open REV000009' }));
    expect(screen.getByRole('dialog')).toHaveStyle({ width: '800px' });
  });

  it('is the full width of the content from 600 to 899 px', async () => {
    setWidth(800);
    render(<Shell />);
    await userEvent.click(screen.getByRole('button', { name: 'Open REV000009' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ width: '100%', position: 'absolute' });
    expect(within(screen.getByTestId('content')).getByRole('dialog')).toBe(dialog);
  });

  it('is a full-screen page under 600 px', async () => {
    setWidth(390);
    render(<Shell />);
    await userEvent.click(screen.getByRole('button', { name: 'Open REV000009' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ width: '100%', position: 'fixed' });
    expect(within(screen.getByTestId('content')).queryByRole('dialog')).toBeNull();
  });

  it('moves focus into the panel, and Escape closes it and returns focus to the opener', async () => {
    render(<Shell />);
    const opener = screen.getByRole('button', { name: 'Open REV000009' });
    await userEvent.click(opener);
    await waitFor(() => expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(opener).toHaveFocus();
  });

  it('keeps focus inside the panel while open', async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole('button', { name: 'Open REV000009' }));
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('leaves Escape to the panel when it guards unsaved work', async () => {
    const onClose = vi.fn();
    render(<Shell onClose={onClose} closeOnEscape={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open REV000009' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('reports a click on the content behind as "backdrop"', async () => {
    const onClose = vi.fn();
    render(<Shell onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open REV000009' }));
    await userEvent.click(document.querySelector('.MuiBackdrop-root')!);
    expect(onClose).toHaveBeenCalledWith('backdrop');
  });

  it('covers the window without a container', async () => {
    render(
      <RbmSlideInRegion open onClose={() => {}} label="Panel">
        <p>Panel</p>
      </RbmSlideInRegion>,
    );
    expect(await screen.findByRole('dialog', { name: 'Panel' })).toHaveStyle({ position: 'fixed' });
  });
});
