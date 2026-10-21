import '@fontsource-variable/inter';
import type { Preview } from '@storybook/react-vite';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { rbmTheme } from '../src/theme/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={rbmTheme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: { layout: 'centered' },
};

export default preview;
