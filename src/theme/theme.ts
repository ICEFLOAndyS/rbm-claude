import type { CSSProperties } from 'react';
import { createTheme } from '@mui/material/styles';
import { colour, density, fontFamily, radius, spacingUnit, status, type, type RbmState, type StatusToken, stroke } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    status: Record<RbmState, StatusToken>;
  }
  interface PaletteOptions {
    status?: Record<RbmState, StatusToken>;
  }
  interface TypographyVariants {
    display: CSSProperties;
    lead: CSSProperties;
    figures: CSSProperties;
  }
  interface TypographyVariantsOptions {
    display?: CSSProperties;
    lead?: CSSProperties;
    figures?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display: true;
    lead: true;
    figures: true;
  }
}

/** The MUI theme, mapped as on the Foundations board ("MUI theme mapping"). */
export const rbmTheme = createTheme({
  palette: {
    primary: { main: colour.deepBlue, light: colour.blueDark, contrastText: colour.white },
    // The brand's primary action is the green CTA, so in MUI it is color="secondary".
    secondary: { main: colour.green, contrastText: colour.deepBlue },
    // Stock MUI colours follow the status meanings (Semantic board, "React and MUI").
    success: { main: status.complete.text },
    info: { main: status.active.text },
    warning: { main: status.atRisk.text },
    error: { main: status.blocked.text, contrastText: colour.white },
    status,
    text: { primary: colour.ink, secondary: colour.slate },
    divider: colour.rule,
    background: { default: colour.white, paper: colour.white },
    grey: { 100: colour.mist },
  },
  spacing: spacingUnit,
  shape: { borderRadius: radius.control },
  typography: {
    fontFamily,
    display: type.display,
    h1: type.h1,
    h2: type.h2,
    h3: type.h3,
    lead: type.lead,
    body1: type.body,
    body2: type.compactBody,
    overline: type.eyebrow,
    caption: type.caption,
    figures: type.figures,
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    // Proposed on the Foundations board: a 2 px Blue Dark focus ring on everything that takes focus.
    MuiButtonBase: {
      styleOverrides: {
        root: { '&.Mui-focusVisible': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 } },
      },
    },
    // Buttons as drawn on the Components board ("Buttons and pills"), at D1.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          // D1 Comfortable control height and body text (density tokens); RbmDensity changes them by region.
          minHeight: density.comfortable.control,
          padding: '0 24px',
          borderRadius: radius.control,
          fontSize: density.comfortable.body,
          fontWeight: 700,
          variants: [
            {
              props: { variant: 'contained' },
              style: { '&.Mui-disabled': { backgroundColor: colour.rule, color: colour.slate } },
            },
            {
              props: { variant: 'outlined' },
              style: { borderWidth: stroke.thick, backgroundColor: colour.white, '&:hover': { borderWidth: stroke.thick } },
            },
            {
              props: { variant: 'outlined', color: 'primary' },
              style: { borderColor: colour.deepBlue },
            },
            {
              props: { variant: 'text' },
              style: { padding: '0 16px', textDecoration: 'underline', '&:hover': { textDecoration: 'underline' } },
            },
            {
              props: { variant: 'text', color: 'primary' },
              style: { color: colour.blueDark },
            },
          ],
        },
      },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: radius.card } } },
    MuiTypography: {
      defaultProps: {
        variantMapping: { display: 'h1', lead: 'p', figures: 'span', overline: 'span' },
      },
    },
  },
});
