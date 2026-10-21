# Updates for the project note `claude/rbm-parked-decisions.md`

Claude Code cannot write to the project note. Copy these entries into it, then delete them here.

## 21 Oct 2026: `RbmStatusPill`

Decided by Andy Smith:
- **Ringed dot as drawn.** At risk and Paused use the Semantic board mark: a 16 px Amber disc, a 2 px white gap and a 10 px centre. The At risk centre is #F36C00 (new token `amberCore`, Proposed on the Foundations and Semantic boards). Before this, the scaffold used a 10 px dot with an Amber ring and an Amber Deep centre.
- **Pills for every state.** At risk, Paused, Blocked and Skipped have a pill too. These are not drawn as pills on the board: each one is the drawn pill (Command board page header) with the Semantic board dot. **Differs from design: not drawn. Needs sign-off and a drawing.**
- **Compact size.** `size="compact"` is 24 px tall with 12 px text, as drawn in the Command board compact event bar. A ringed dot keeps its 16 px size in the compact pill (not drawn).
- **Status colours live in the theme.** `theme.palette.status` is the single source, as on the Semantic board ("React and MUI"). Skipped is added (Slate dot and text). Stock MUI colours follow the board: success = Green Deep, info = Blue Dark, warning = Amber Deep, error = Red Inner.
- **Names.** The state stays `active` (the brief and the Command board say Active). The Semantic board calls it `inProgress`. `pending` is labelled "Not started".

Still open:
- An on-dark value is drawn only for Active (Blue Mid). The Semantic board says a test should check every state has one. The other on-dark values are not drawn.
- The Semantic board's lint rule that bans hex values outside the theme package is not set up yet.
