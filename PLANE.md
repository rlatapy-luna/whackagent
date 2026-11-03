# whackagent on a Plane board

Since 2.0.0, whackagent's Plane board runs on **lb-board**, Lunabee's internal Plane board plugin
([LunabeeStudio/Lunabee-Plane](https://github.com/LunabeeStudio/Lunabee-Plane)). whackagent no longer holds any
Plane code.

lb-board owns the board:
- the cards, their states, priority, sprints (cycles), milestones (modules) and dependencies;
- the claims;
- the hooks that move cards from GitHub events. The "Lunabee Plane board" GitHub App runs them; there is no Actions
  runner.

whackagent adds its workflow on top: grill, code, feedback, validate, close and autopilot, the task files and the
pane. Its `wa-backlog` forwards every board verb to the repository's `.github/board/lb-board`.

## Set up

1. Install the plugins:
   ```
   /plugin marketplace add LunabeeStudio/Lunabee-Plane
   /plugin install lb-board@lunabee-plane
   ```
   This needs Lunabee GitHub access.
2. Export `PLANE_API_KEY` in your shell. Create the key in Plane: Profile settings → API tokens.
3. Run `/wa-setup` and pick the Plane board. It runs `/lb-board-setup` with `{tasks}` as the spec path, then adds
   whackagent's scaffold to the same setup PR.

The repository's rules are in `.github/board/BOARD.md`, written by lb-board.

## A board set up before 2.0.0

A board set up before 2.0.0 ran on whackagent's own Plane provider: `.github/board/wa-backlog` and the `WA_PLANE_*`
variables. `/wa-setup` offers *Plane board → lb-board*, which works like this:
- **Project:** it adopts the same project and the same columns, by id.
- **Labels:** `wa-ignore` and `wa-sprint` are renamed to `lb-ignore` and `lb-sprint`.
- **PR:** one PR swaps the vendored script and the board contract.
- **Claims:** it needs no live claim. Claims move from `refs/wa-claims/` to `refs/lb-claims/`.

## Not available

- Moving a local backlog or a GitHub board to Plane. `wa-backlog migrate` was removed in 2.0.0.
- A Plane board outside Lunabee.
- The Actions hooks mode and its self-hosted runner.

Plane's API facts and a local Plane rig now live in Lunabee-Plane, in `docs/plane-api.md` and `scripts/plane-rig/`.
