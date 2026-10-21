# RBM component library (rbm-claude)

React, TypeScript, MUI and Storybook components for RBM (Runbook Management), the ICEFLO Limited product on ServiceNow.

## Read first
1. `docs/handoff-brief.md` (a copy of the project note `claude/rbm-claude-code-handoff.md` in the "Feature Factory v3.0" project; the project note is the master, so prefer it if you can read it).
2. The project note `claude/rbm-parked-decisions.md` for agreed rules and open questions.

## Rules
- **The design is the source of truth.** The "RBM Design System" canvas artifact: https://claude.ai/artifact/GfR1Zo8xXaj9PuLXRWWaCv (open it with the same claude.ai account as its owner). Build what is drawn. If the design is silent, ask, or propose and flag it. Do not invent visual design.
- Use the names in the brief exactly (Task Timeline, Hot-topics strip, Event vitals, Collaboration, WBS ids, `Rbm` prefix). Never "War room".
- Colour is never the only signal: every state has a text label. Brand Green means Complete only.
- Keep density low and text short and plain.
- Each component needs Storybook stories for every state, unit tests, keyboard and screen-reader behaviour, and a visual check against the design board.
- Follow the build order in the brief, one component per pull request.
- Record decisions in the project note `claude/rbm-parked-decisions.md`, and flag any place where the build differs from the design.

## Setup status: the scaffold is unverified
This scaffold was written without being able to install packages, so it has never been built or run. First steps:
1. `npm install`. If a version range in `package.json` does not exist or the majors conflict (React, MUI, Storybook, Vite, Vitest), fix the ranges to the current stable versions.
2. `npm run check` (type check and tests) and `npm run dev` (Storybook on port 6006). Fix whatever breaks.
3. Confirm `RbmStatusPill` renders in Storybook and compare it with the design board.
4. Add the brand font (Inter) to Storybook.
5. Then continue with the build order in the brief.

## Commands
- `npm run dev`: Storybook
- `npm run check`: type check and tests
- `npm run build-storybook`: static Storybook
