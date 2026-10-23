import { createContext, useContext } from 'react';

/**
 * What the app shell tells the page inside it. Outside a shell both are null, and a page behaves as it does
 * on its own: the window scrolls, and a slide-in covers the window.
 */
export interface RbmShellFrame {
  /** The content area's frame, between the header and the footer. The slide-in region opens in it. */
  frame: HTMLElement | null;
  /** The element that scrolls the page. Inside the shell the window does not scroll. */
  scroller: HTMLElement | null;
  /**
   * The content area's width in px, once measured. A page that changes its layout at a width asks this rather
   * than the window, because the sidebar takes part of the window.
   */
  width: number | null;
}

export const ShellFrameContext = createContext<RbmShellFrame>({ frame: null, scroller: null, width: null });

export function useShellFrame(): RbmShellFrame {
  return useContext(ShellFrameContext);
}

/** The element the page scrolls in, or null for the window. */
export function useScrollContainer(): HTMLElement | null {
  return useContext(ShellFrameContext).scroller;
}
