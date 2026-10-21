# Plane CE board provider, with code on GitHub

Shipped on 2026-10-21 from PRD `prd/0001-plane-board-provider.md`.

## What it does

A project can keep its backlog on a self-hosted Plane Community Edition server (`backlog.provider: plane`) while code, branches and pull requests stay on GitHub (`vcs.provider: github`). Agents create, claim, reorder, comment and cancel Plane cards with the same `wa-backlog` verbs as on the GitHub board. GitHub Actions hooks on a self-hosted runner move cards to grilled, review and done from repository events, and a scheduled check reports drift without moving cards. An existing GitHub-board project can move to Plane through a dry-run-first, resumable migration. The provider is marked experimental.

## Technical surface

- **Script:** `providers/wa-backlog` is one shared stdlib script: a core plus a `Board` interface with `GitHubBoard` and `PlaneBoard`. `providers/github/wa-backlog` is a link to it. New verbs: `cancel`, `hook`, `check-integration`, `migrate`. New flag: `claim … --blocked-ok`.
- **Hooks:** `.github/workflows/board-plane.yml` is a reusable workflow under `hooks-v2` that runs `wa-backlog hook` on the runner labeled `WA_RUNNER_LABEL`. Its caller template is `providers/plane/whackagent-board-plane.yml` (template version 1).
- **Rules:**
  - The GitHub provider rules are split into `reference/code-github.md` (code host) and `reference/board-github.md` (GitHub board).
  - `reference/board-plane.md` holds the Plane board rules.
  - `templates/BOARD.md` keeps tool-neutral rules plus `<!-- board-tool: … -->` sections. Board contract is 2.4.
- **Skills:**
  - The task skills accept an opaque ticket id (`#12` or `WA-42`).
  - `/wa-setup` handles the Plane setup: integration guard, provision, runner and caller. It also offers "Switch board to Plane".
- **Pane:** reads Plane rows, task files and session names with `WA-<n>` ids.
- **Settings:** stored in the repository variables `WA_PLANE_URL`, `WA_PLANE_WORKSPACE`, `WA_PLANE_PROJECT_ID` and `WA_PLANE_STATES`. The API key is `PLANE_API_KEY` (agents) and the `WA_PLANE_API_KEY` secret (hooks).
- **Maintainer tooling:**
  - `scripts/plane-rig/` runs a local Plane CE v1.4.2 rig with bootstrap, fact checks and recorded payloads.
  - Playgrounds: `rlatapy-luna/whackagent-playground-plane` (runner label `whackagent-plane`) and `rlatapy-luna/whackagent-playground-migrate` (Plane project `MIG`).
- **Docs:** `PLANE.md`, `docs/plane-architecture.md` (pieces and event flow in mermaid diagrams), `providers/README.md` (guide to adding a board tool), `providers/plane/README.md` (verified API facts) and a Plane section in `WORKFLOW.md`.

## Notable decisions

- **Rate limit:** Plane's per-key API throttle (60/min by default) has no off switch. The provider requires `API_KEY_RATE_LIMIT=1000000/second` on the server, which keeps it free and unlimited.
- **No size on Plane:** Plane CE v1.4.2 can't create estimates over its API.
- **Claims stay on GitHub:** they are atomic git refs (`refs/wa-claims/<id>/<phase>`), shared by every board adapter.
- **Priority is the card's `sort_order`:** lower means higher, and Plane never renumbers it. `move` writes the same value a UI drag would. A state change keeps `sort_order`.
- **Sprints and milestones:**
  - A sprint is a parent work item (labeled `wa-sprint`) plus a cycle of the same name. The parent decides the sprint, not the cycle.
  - A milestone is a module, and the adapter enforces one module per ticket.
- **Relations are add-only:** the Plane API can't remove one.
- **Where hook logic lives:** it runs from the project's vendored script on the default branch, not from the tag. Hook fixes reach a project when `/wa-setup` refreshes that script.
- **No `grilled` from the card description:** a spec written in the card description does not move the card to grilled, by design: only a pushed task file grills a card, and nobody moves it by hand. The board check reports it.
- **Blocked coding claims (GitHub too):** `claim coding` refuses a grilled ticket with open blockers unless `--blocked-ok` is passed. That required board contract 2.3; this feature's BOARD.md sections bumped it to 2.4.
- **Migration:**
  - The task file's `issue:` field takes the new key; there is no separate `card:` key.
  - Each renamed grilled branch is squashed into one `task: grill <key> <slug>` commit.
  - Cards, comments and modules are de-duplicated with Plane's `external_source`/`external_id` fields.
- **Integration guard:** Plane CE ships no GitHub integration. The guard's "on" path was tested only against a stub.

## Issues

- `issues/0001-plane-local-rig.md`: Local Plane CE rig and API fact checks (commit 8b5b1c0)
- `issues/0002-board-interface-prefactor.md`: Prefactor: neutral backlog script with a Board interface (commit d0be7ec)
- `issues/0003-split-provider-github-reference.md`: Prefactor: split GitHub provider rules into code-host and board parts (commit e48f046)
- `issues/0004-opaque-ticket-id.md`: Prefactor: opaque ticket id across skills and pane (commit c5eec85)
- `issues/0005-plane-board-tracer.md`: Tracer: Plane board readable and writable (commit 35e95df)
- `issues/0006-plane-claims.md`: Claims on Plane tickets (commit 77cb9a4)
- `issues/0007-plane-hooks-grilled.md`: Hook tracer: task file push moves Plane card to grilled (commit 7f01039)
- `issues/0008-plane-hooks-pr-lifecycle.md`: PR lifecycle hooks on Plane (commit 5d0fbe4)
- `issues/0009-plane-board-fields.md`: Plane board fields: priority, dependencies, comments, canceled (commit 0d33378)
- `issues/0010-plane-sprints-milestones.md`: Plane sprints and milestones (commit f0eeb0f)
- `issues/0011-plane-board-check.md`: Scheduled board check on Plane (commit 2cdddc2)
- `issues/0012-board-md-and-setup-guards.md`: BOARD.md Plane section and setup guards (commit 7dd318d)
- `issues/0013-github-to-plane-migration.md`: GitHub-to-Plane migration (commit 3bdf455)
- `issues/0014-plane-docs-release-notes.md`: Plane provider docs and release notes (commit 29be052)
