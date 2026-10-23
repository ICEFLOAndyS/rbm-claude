import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button } from '@mui/material';
import { RbmSlideInRegion, useSlideInMode, SLIDE_IN_WIDTH } from './RbmSlideInRegion';
import { RbmTopBar } from '../RbmTopBar/RbmTopBar';
import { RbmSidebar, useSidebarMode } from '../RbmSidebar/RbmSidebar';
import { RbmFooter } from '../RbmFooter/RbmFooter';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, shellSize } from '../../theme/tokens';
import { rbmNav } from '../../data/nav/nav';
import { createMockNavData } from '../../data/nav/navData';

type Args = { width: number; closeOnEscape: boolean; startOpen: boolean };

const navData = createMockNavData();
const user = { id: 'a.smith', name: 'Andy Smith', role: 'Cutover Manager', email: 'andy.smith@iceflo.com' };

/** A stand-in frame from the shell parts (step 8 builds the real one), so the region can be seen in place. */
function Frame({ width, closeOnEscape, startOpen }: Args) {
  const [content, setContent] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(startOpen);
  const sidebar = useSidebarMode();
  const mode = useSlideInMode();
  const size = shellSize.compact;
  return (
    <RbmDensity level="compact">
      <Box sx={{ height: '100vh', display: 'grid', gridTemplateRows: `${size.topBar}px 1fr ${size.footer}px`, gridTemplateColumns: 'auto 1fr' }}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <RbmTopBar user={user} sidebar={sidebar.variant} notificationCount={4} onMenu={sidebar.openDrawer} menuOpen={sidebar.drawerOpen} />
        </Box>
        {/* The sidebar's column stays even when the sidebar is a drawer (it then renders nothing here). */}
        <Box sx={{ gridColumn: 1, minHeight: 0 }}>
          <RbmSidebar nav={rbmNav} data={navData} path="/events" variant={sidebar.variant} open={sidebar.drawerOpen} onClose={sidebar.closeDrawer} drawerTop={size.topBar} hrefFor={(to) => `#${to}`} onNavigate={() => {}} />
        </Box>
        {/* The content area's frame hosts the region; the scroller inside it holds the page. */}
        <Box ref={setContent} sx={{ gridColumn: 2, position: 'relative', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
          <Box sx={{ height: '100%', overflow: 'auto', bgcolor: colour.mist, p: `${size.pagePadding}px`, boxSizing: 'border-box' }}>
            <Box component="h1" sx={{ m: 0, mb: 4, fontSize: size.pageTitle, fontWeight: 800 }}>
              Events
            </Box>
            <Button variant="outlined" onClick={() => setOpen(true)}>
              Open REV000009
            </Button>
            {Array.from({ length: 12 }, (_, i) => (
              <Box key={i} sx={{ mt: 3, height: 44, borderRadius: '14px', bgcolor: colour.white, border: `1px solid ${colour.rule}` }} />
            ))}
          </Box>
          <RbmSlideInRegion open={open} onClose={() => setOpen(false)} container={content} width={width} closeOnEscape={closeOnEscape} label="REV000009 Weekend Payroll Cutover">
            <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ fontSize: 12, color: colour.slate }}>Events / REV000009 · mode: {mode}</Box>
              <Box component="h2" sx={{ m: 0, fontSize: 20, fontWeight: 800 }}>
                Weekend Payroll Cutover
              </Box>
              <Box sx={{ color: colour.slate }}>A stand-in for the record panel (RbmRecord).</Box>
              <Box>
                <Button variant="outlined" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </Box>
            </Box>
          </RbmSlideInRegion>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <RbmFooter version="4.2.0" updatedAt="10:42:18" environment={{ name: 'Production', production: true }} links={{ privacy: '#', support: '#', knowledge: '#' }} />
        </Box>
      </Box>
    </RbmDensity>
  );
}

const meta: Meta<Args> = {
  title: 'Shell/RbmSlideInRegion',
  render: (args) => <Frame {...args} />,
  args: { width: SLIDE_IN_WIDTH, closeOnEscape: true, startOpen: true },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<Args>;

/**
 * Open over the content, between the header and the footer (480 px from 900 px). Resize the window: full
 * width from 600 to 899 px, a full-screen page under 600 px. Escape closes it and returns focus to the button.
 */
export const Open: Story = {};

/** Closed: press "Open REV000009". */
export const Closed: Story = { args: { startOpen: false } };

/** The record pattern's wide panel, 800 px. */
export const Wide: Story = { args: { width: 800 } };

/** A panel that handles Escape itself (the record panel asks about unsaved work first). */
export const EscapeHandledByPanel: Story = { args: { closeOnEscape: false } };
