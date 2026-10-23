import type { ReactNode } from 'react';
import { Drawer, useMediaQuery } from '@mui/material';
import { colour, stroke } from '../../theme/tokens';
import type { RbmRecordContainer } from './RbmRecord';

/**
 * The record panel's container (Pattern: List to record, "Building it with MUI"): a Drawer anchored
 * right. Persistent beside the list on wide screens, a temporary overlay on narrow ones, and the whole
 * screen under 640 px. The slide-in is 480 px and the wide panel 800 px.
 *
 * Proposed (not drawn): "wide screens" means room for a 640 px list beside the panel, so the panel sits
 * beside the list from 1,120 px (slide-in) or 1,440 px (wide panel) and overlays below that.
 */

export const PANEL_WIDTH: Record<RbmRecordContainer, number> = { slideIn: 480, wide: 800 };
/** Under this, the panel fills the screen (board). */
export const FULL_SCREEN_BELOW = 640;
/** The narrowest list kept beside the panel (proposed). */
export const MIN_LIST_WIDTH = 640;

export interface RbmRecordDrawerProps {
  open: boolean;
  container: RbmRecordContainer;
  /**
   * The backdrop of the overlay closes the panel. The page passes a guarded close (it asks
   * RbmRecord.confirmLeave first), so unsaved work is never lost. Escape is the panel's own.
   */
  onClose: () => void;
  children: ReactNode;
}

/** How the panel shows at a window width: beside the list, over it, or full screen. */
export function drawerMode(container: RbmRecordContainer, viewport: number): 'beside' | 'overlay' | 'fullScreen' {
  if (viewport < FULL_SCREEN_BELOW) return 'fullScreen';
  return viewport >= PANEL_WIDTH[container] + MIN_LIST_WIDTH ? 'beside' : 'overlay';
}

/** `drawerMode` for the current window, live. The list page uses it to make room beside the panel. */
export function useDrawerMode(container: RbmRecordContainer): 'beside' | 'overlay' | 'fullScreen' {
  const fullScreen = useMediaQuery(`(max-width: ${FULL_SCREEN_BELOW - 0.02}px)`);
  const beside = useMediaQuery(`(min-width: ${PANEL_WIDTH[container] + MIN_LIST_WIDTH}px)`);
  return fullScreen ? 'fullScreen' : beside ? 'beside' : 'overlay';
}

export function RbmRecordDrawer({ open, container, onClose, children }: RbmRecordDrawerProps) {
  const mode = useDrawerMode(container);
  const width = mode === 'fullScreen' ? '100vw' : PANEL_WIDTH[container];
  return (
    <Drawer
      anchor="right"
      open={open}
      variant={mode === 'beside' ? 'persistent' : 'temporary'}
      // Only the backdrop closes it here; Escape is the panel's own, which asks first about unsaved work.
      onClose={(_, reason) => reason === 'backdropClick' && onClose()}
      slotProps={{
        paper: {
          sx: {
            width,
            maxWidth: '100vw',
            borderLeft: `${stroke.thin}px solid ${colour.rule}`,
            // As drawn on the slide-in.
            boxShadow: '-8px 0 24px rgba(31,36,48,0.12)',
          },
        },
      }}
    >
      {children}
    </Drawer>
  );
}
