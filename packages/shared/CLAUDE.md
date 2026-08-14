# packages/shared

Guidance specific to the shared scoring package. See the repo-root `CLAUDE.md` for overall structure, commands, and conventions.

### Scoring

Points and calibration are independent and never feed into each other:
- **Points** (`points.ts`): win = `k / p`, loss = `-lossMultiplier * k * p`, where `p` is the Polymarket implied probability of the picked outcome at pick time and `k = 10`. Favorites (`p` near 1) win few points but lose many if wrong; longshots are the reverse.
- **Calibration** (`calibration.ts`): plain Brier score (`(outcome - p)²`) and its mean, tracked purely for analytics — never affects points.

Worked constants/values in both come from an ADR ("Scoring, Points Formula & Calibration") that isn't in this repo; treat `src/points.test.ts`'s worked examples as the source of truth if the two ever disagree.
