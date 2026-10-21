import { createTheme } from '@mui/material/styles';
import { colour, fontFamily, radius } from './tokens';

export const rbmTheme = createTheme({
  palette: {
    primary: { main: colour.blueDark, dark: colour.deepBlue, contrastText: colour.white },
    secondary: { main: colour.deepBlue },
    error: { main: colour.redInner },
    warning: { main: colour.amber, dark: colour.amberDeep },
    success: { main: colour.green, dark: colour.greenDeep },
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
