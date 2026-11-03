# Backlog providers

Maintainer guide to this folder. No agent reads it.

- `CONTRACT.md`: the provider contract every skill speaks (verbs, six states, exit codes, claim rules). Skills read it.
- `local.md`: the default file-based backlog, prompt-implemented.
- `wa-backlog`: the one backlog script every shared board uses (Python 3 stdlib plus `gh`, one file, vendored by projects as `.github/board/wa-backlog`). A shared core (CLI, verbs, claims as git refs on GitHub, ticket branches and task phases, pull requests, merge, stacks, screenshots, the contract check) plus one `Board` adapter per board tool: `GitHubBoard`, and `LbBoard`, which forwards a Plane board's verbs to lb-board.
- `github/`: the GitHub Project board. `github/wa-backlog` is a relative link to `../wa-backlog`, kept because skills, the pane and `/wa-setup`'s vendored copy use that path (`cp` follows the link, so projects get a real file). Its hooks are `.github/workflows/board.yml` (JavaScript), called through `github/whackagent-board.yml`.
- Plane: no folder here. The Plane board is lb-board (LunabeeStudio/Lunabee-Plane, Lunabee internal): its own CLI, vendored as `.github/board/lb-board`, with its hooks on a GitHub App receiver. `wa-backlog` forwards the board verbs to it (`LbBoard`, `forward`).

## Adding a board tool

The board and the code host are two separate choices (`backlog.provider`, `vcs.provider`). Code stays on GitHub:
claims, branches and PRs are the shared core's and need nothing from the board. A new board tool (Linear, Jira,
OpenProject, Vikunja…) takes one of two routes.

- **Adapter in `wa-backlog`**, like `GitHubBoard`. Write a `Board` subclass registered in `BOARDS` under its
  `backlog.provider` name; the module docstring at the top of the script is the interface. Its settings come from
  repository variables (`WA_<TOOL>_…`), and `provision` adopts an existing project, never creates one. The board
  must also be moved from GitHub events, by hooks of its own (like `board.yml` for GitHub).
- **External board CLI**, like Plane's lb-board (`LbBoard`). The tool's own CLI, vendored in projects, speaks the
  same verbs, flags, JSON and exit codes, and runs its own hooks. `wa-backlog` forwards the board verbs to it
  (`forward`) and adds only what whackagent reads on top (`phase`, `branch`). This keeps the tool usable without
  whackagent.

Either way, the tool must hold the contract (`CONTRACT.md`):
- columns with custom names (the six states plus a canceled one);
- one stable card order, read by both the UI and the API;
- comments;
- stable card ids.

Then the skill side:
- a caveman-style `reference/board-<tool>.md`, added to the `Read` line of every skill that loads `board-plane.md`;
- a row in `CONTRACT.md`'s providers table;
- an entry in `reference/provider.md`;
- the value in `templates/config.md`;
- docs in `README.md` and `WORKFLOW.md`, and a `CHANGELOG.md` line.

Test against a real tracker on a private playground repository, never a real project: check
`gh api repos/<repo> --jq .full_name` before any live write.
