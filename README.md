# rbm-claude

RBM component library for ICEFLO Limited: React, TypeScript, MUI and Storybook, with the ICEFLO brand tokens in the MUI theme.

Status: an unverified scaffold. See `CLAUDE.md` for the first steps and `docs/handoff-brief.md` for the design handoff (goal, naming, rules, build order).

Included so far: the brand tokens (`src/theme/tokens.ts`), the MUI theme (`src/theme/theme.ts`), and one example component, `RbmStatusPill`, with a story and a test.

## Configuration

Copy `.env.example` to `.env` (git-ignored) to set local configuration. Never commit a real key.

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_MUI_X_LICENSE_KEY` | `RbmDataGrid` (MUI X Data Grid Pro, decision D4) | Optional for now. Without it the grid shows a development watermark and logs "MUI X: Missing license key." A real licence is needed before release. Set once in the app and Storybook set-up by `applyMuiXLicence()`. |
