# RBM component library (rbm-claude)

React, TypeScript, MUI and Storybook components for RBM (Runbook Management), the ICEFLO Limited product on ServiceNow.

## Read first
1. `docs/handoff-brief.md` (a copy of the project note `claude/rbm-claude-code-handoff.md` in the "Feature Factory v3.0" project; the project note is the master, so prefer it if you can read it).
2. `docs/parked-decisions.md` (a copy of the project note `claude/rbm-parked-decisions.md`) for agreed rules and open questions.

## Rules
- **The design is the source of truth.** The "RBM Design System" canvas artifact: https://claude.ai/artifact/GfR1Zo8xXaj9PuLXRWWaCv (open it with the same claude.ai account as its owner). Build what is drawn. If the design is silent, ask, or propose and flag it. Do not invent visual design.
- Use the names in the brief exactly (Task Timeline, Hot-topics strip, Event vitals, Collaboration, WBS ids, `Rbm` prefix). Never "War room".
- Colour is never the only signal: every state has a text label. Brand Green means Complete only.
- Keep density low and text short and plain.
- Each component needs Storybook stories for every state, unit tests, keyboard and screen-reader behaviour, and a visual check against the design board.
- Follow the build order in the brief, one component per pull request.
- Record decisions in `docs/parked-decisions.md`, and flag any place where the build differs from the design. Claude Code cannot write to the project note, so the user copies new entries back to it.

## Setup status
Verified 21 Oct 2026: React 19, MUI 9, Storybook 9, Vite 7, Vitest 3, Inter in Storybook. `RbmStatusPill` is checked against the board. Continue with the build order in the brief: next is the theme and tokens Storybook page, then `RbmNode`.

## Commands
- `npm run dev`: Storybook
- `npm run check`: type check and tests
- `npm run build-storybook`: static Storybook
