import type { ReactNode } from 'react';
import { Drawer, useMediaQuery } from '@mui/material';
import { colour, stroke } from '../../theme/tokens';

/**
 * The slide-in region (App shell board, "Anatomy" 6 and "Responsive behaviour"). It hosts a panel, such as the
 * record panel from the list-to-record pattern, over the content only: it sits below the page header and
 * above the footer, so both stay visible, and the content does not move.
 *
 *   900 px and above  a 480 px panel on the right of the content
 *   600 to 899 px     the full width of the content
 *   under 600 px      a full-screen page
 *
 * It is a MUI Drawer anchored right, with the shell's content area as its container. Closing it returns
 * focus to whatever opened it.
 */

/** The board's slide-in width. The record pattern's wide panel passes its own (800 px). */
export const SLIDE_IN_WIDTH = 480;

export type RbmSlideInMode = 'panel' | 'fullWidth' | 'page';

/** How the region shows at the current window width. */
export function useSlideInMode(): RbmSlideInMode {
  const page = useMediaQuery('(max-width: 599.98px)', { noSsr: true });
  const fullWidth = useMediaQuery('(max-width: 899.98px)', { noSsr: true });
  return page ? 'page' : fullWidth ? 'fullWidth' : 'panel';
}

export interface RbmSlideInRegionProps {
  open: boolean;
  /**
   * Asked to close by Escape or a click on the content behind. A panel that guards unsaved work (the record
   * panel) handles Escape itself: set `closeOnEscape` to false.
   */
  onClose: (reason: 'escape' | 'backdrop') => void;
  /**
   * The shell's content area, between the header and the footer. Without it the region covers the window.
   * It must be the area's frame, not its scroller: `position: relative` with `overflow: hidden`, and the
   * scrolling content inside it. Hosted in a scroller, the panel would move with the scroll, and while it
   * slides in from the right the page would grow wider and scroll sideways to it.
   */
  container?: HTMLElement | null;
  /** The panel's width from 900 px. */
  width?: number;
  closeOnEscape?: boolean;
  /** The dialog's name for screen readers, for example the record's title. */
  label: string;
  children: ReactNode;
}

export function RbmSlideInRegion({ open, onClose, container, width = SLIDE_IN_WIDTH, closeOnEscape = true, label, children }: RbmSlideInRegionProps) {
  const mode = useSlideInMode();
  // A full-screen page covers the whole window, header and footer too.
  const inside = mode !== 'page' && !!container;
  return (
    <Drawer
      anchor="right"
      variant="temporary"
      open={open}
      container={inside ? container : undefined}
      onClose={(_, reason) => {
        if (reason === 'escapeKeyDown') {
          if (closeOnEscape) onClose('escape');
        } else onClose('backdrop');
      }}
      data-mode={mode}
      sx={inside ? { position: 'absolute', '& .MuiBackdrop-root': { position: 'absolute' } } : undefined}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-label': label,
          sx: {
            position: inside ? 'absolute' : 'fixed',
            width: mode === 'panel' ? width : '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            // As drawn on the record panel's slide-in (List to record board).
            borderLeft: mode === 'page' ? 0 : `${stroke.thin}px solid ${colour.rule}`,
            boxShadow: mode === 'page' ? 'none' : '-8px 0 24px rgba(31,36,48,0.12)',
          },
        },
      }}
    >
      {children}
    </Drawer>
  );
}
