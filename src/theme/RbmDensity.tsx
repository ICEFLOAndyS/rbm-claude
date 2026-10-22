import { createContext, useContext, type ReactNode } from 'react';
import { Box, ThemeProvider, createTheme, type Theme, type ThemeOptions } from '@mui/material';
import { density, type DensityLevel } from './tokens';

/**
 * Density by region (Density board, "In code"). A region declares its level once and everything inside
 * follows; regions nest, so a dense panel can sit inside a compact page. Decided by Andy Smith,
 * 22 Oct 2026: density is not optional. Where a level applies, its tokens win over sizes drawn on a board.
 *
 *   <RbmDensity level="compact">   // a list page (decision D3)
 *     <RbmDataGrid … />
 *   </RbmDensity>
 *
 * Outside any region the level is D1 Comfortable, the default on the Density board.
 */

const DensityContext = createContext<DensityLevel>('comfortable');

export type DensityTokens = (typeof density)[DensityLevel] & { level: DensityLevel };

/** The current region's level and its tokens: row, control, target, body, caption, figure, padX, gap, icon, dot, radius. */
export function useDensity(): DensityTokens {
  const level = useContext(DensityContext);
  return { level, ...density[level] };
}

/** A ringed dot (At risk, Paused) at a density: a disc 6 px larger than the dot, with a dot-sized centre. */
export const ringSize = (dot: number) => dot + 6;

/**
 * For a control drawn smaller than the density's minimum target (a pill-shaped button, a text link):
 * the drawn shape stays, and an invisible layer extends the area a pointer can hit to the target.
 */
export const hitTarget = (target: number) =>
  ({
    position: 'relative',
    '&::after': { content: '""', position: 'absolute', left: '50%', top: '50%', width: '100%', height: '100%', minWidth: target, minHeight: target, transform: 'translate(-50%, -50%)' },
  }) as const;

/** Line height for each level (Density board). */
export const densityLineHeight: Record<DensityLevel, number> = { command: 1.5, comfortable: 1.5, compact: 1.4, dense: 1.35 };

/**
 * MUI's own controls at a level: control height, minimum target, body text and icon size.
 * Side padding and other sizes the scale does not name keep the theme's values.
 */
export function densityComponents(level: DensityLevel): ThemeOptions['components'] {
  const d = density[level];
  const toggle = { padding: (d.target - d.icon) / 2, '& .MuiSvgIcon-root': { fontSize: d.icon } };
  return {
    MuiButton: { styleOverrides: { root: { minHeight: d.control, fontSize: d.body, borderRadius: d.radius } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: d.target, minHeight: d.target } } },
    MuiInputBase: { styleOverrides: { root: { minHeight: d.control, fontSize: d.body, lineHeight: densityLineHeight[level] } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: d.radius } } },
    MuiMenuItem: { styleOverrides: { root: { minHeight: d.target, fontSize: d.body } } },
    MuiTab: { styleOverrides: { root: { minHeight: d.control, fontSize: d.body } } },
    MuiChip: { styleOverrides: { root: { height: d.control, fontSize: d.body } } },
    MuiSvgIcon: { styleOverrides: { fontSizeMedium: { fontSize: d.icon } } },
    MuiCheckbox: { styleOverrides: { root: toggle } },
    MuiRadio: { styleOverrides: { root: toggle } },
  };
}

/** The outer theme with the level's control sizes laid over it. */
export const densityTheme = (outer: Theme, level: DensityLevel): Theme => createTheme(outer, { components: densityComponents(level) });

export interface RbmDensityProps {
  level: DensityLevel;
  children: ReactNode;
}

/** Sets the density for everything inside. Also sets CSS variables (--rbm-row and so on) for code outside React's reach. */
export function RbmDensity({ level, children }: RbmDensityProps) {
  const d = density[level];
  return (
    <DensityContext.Provider value={level}>
      <ThemeProvider theme={(outer: Theme) => densityTheme(outer, level)}>
        <Box
          data-density={level}
          sx={{
            display: 'contents',
            '--rbm-row': `${d.row}px`,
            '--rbm-control': `${d.control}px`,
            '--rbm-target': `${d.target}px`,
            '--rbm-body': `${d.body}px`,
            '--rbm-caption': `${d.caption}px`,
            '--rbm-pad-x': `${d.padX}px`,
            '--rbm-gap': `${d.gap}px`,
            '--rbm-icon': `${d.icon}px`,
            '--rbm-dot': `${d.dot}px`,
          }}
        >
          {children}
        </Box>
      </ThemeProvider>
    </DensityContext.Provider>
  );
}
