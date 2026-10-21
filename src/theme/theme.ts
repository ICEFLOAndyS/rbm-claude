import { createTheme } from '@mui/material/styles';
import { colour, fontFamily, radius, status, type RbmState, type StatusToken } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    status: Record<RbmState, StatusToken>;
  }
  interface PaletteOptions {
    status?: Record<RbmState, StatusToken>;
  }
}

export const rbmTheme = createTheme({
  palette: {
    primary: { main: colour.blueDark, dark: colour.deepBlue, contrastText: colour.white },
    secondary: { main: colour.deepBlue },
    // Stock MUI colours follow the status meanings (Semantic board, "React and MUI").
    success: { main: status.complete.text },
    info: { main: status.active.text },
    warning: { main: status.atRisk.text },
    error: { main: status.blocked.text },
    status,
    text: { primary: colour.ink, secondary: colour.slate },
    divider: colour.rule,
    background: { default: colour.mist, paper: colour.white },
  },
  shape: { borderRadius: radius.control },
  typography: {
    fontFamily,
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: radius.card } } },
  },
});
