import { LicenseInfo } from '@mui/x-license';

/**
 * Sets the MUI X Pro licence key once, from configuration (decision D4). Called by the app and the
 * Storybook set-up, never by a component. The key is never committed.
 *
 * With no key (the proof of concept), the grid still runs: it shows a development watermark and logs
 * one "MUI X: Missing license key." error to the console. Neither fails the tests or the build.
 * Returns whether a key was set.
 */
export function applyMuiXLicence(key: string | undefined = import.meta.env.VITE_MUI_X_LICENSE_KEY): boolean {
  const trimmed = key?.trim();
  if (!trimmed) return false;
  LicenseInfo.setLicenseKey(trimmed);
  return true;
}
