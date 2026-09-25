---
name: wa-setup
description: Interactively bootstrap the whackagent workflow in a project — or reconfigure one that's already set up.
---

# /wa-setup

Set up orchestrated dev flow for project. Short interactive setup, then scaffold, then index.

Wording (screen + reports): **wa-board → Voice** — telegraphic, tech terms stay English.

Runs on fresh project **and** on one already set up. Second time = **reconfigure**, not re-install: current values become defaults, nothing you edited get overwritten.

## 0. Which mode

`.whackagent/config.md` exists → **reconfigure** (jump to *Reconfigure mode*). Absent → **first setup**, steps 1–4.

Optional arg narrow scope: `/wa-setup paths`, `/wa-setup review`, `/wa-setup build`, `/wa-setup branch`, `/wa-setup commit`, `/wa-setup verify`, `/wa-setup languages`, `/wa-setup backlog`. Reconfigure only — on fresh project arg meaningless, say so and run full setup.

## 1. Interactive config (ask one at a time, propose a default)

Detect first, ask second. Scan repo to guess:
- **primary language** — `Package.swift`/`*.xcodeproj` → swift; `build.gradle(.kts)`/`settings.gradle(.kts)` with `.kt` sources → kotlin; `tsconfig.json`/`package.json` → typescript; anything else (Rust, Go, Python, C#, Java, Dart, …) → generic. Polyglot repo (KMP + iOS app, backend + web) → language holding most task-relevant code; offer second pack.
- **project kind** — pick architecture module and what runtime check drives:
  - `app` — mobile or desktop GUI: Xcode app target / `@main App` / UIKit lifecycle; Gradle `com.android.application` plugin; Compose Desktop, Electron, Tauri, .NET MAUI/WPF, Flutter.
  - `web` — browser front end: Vite/Next/Remix/Angular/SvelteKit config, `index.html` entry.
  - `server` — HTTP/RPC service: Ktor, Spring, Vapor, Express/Fastify/Nest, Axum/Actix, Go `net/http`, ASP.NET.
  - `cli` — executable entry point with args, no GUI/server.
  - `package` — library/SDK (`com.android.library`, SwiftPM library, npm lib, crate lib).
- **UI toolkit** — `import SwiftUI` → swiftui; `androidx.compose`/`org.jetbrains.compose` in Gradle or `@Composable` in source → compose. Only toolkits with convention module count; others get no UI module.
- **Its own build wrapper** — repo-local CLI (`cli/`, `bin/`, `scripts/`), `Makefile` with build target, or strongest signal — project's own `CLAUDE.md`/README saying *"ALWAYS use X to build"*. Read that instruction if exists: project that mandates wrapper mandates it for implementer too.

Then confirm with user:

1. **Discussion language** — which language to talk in? (default: detect from user, else en)
2. **Primary language + project kind** — confirm detected language and kind (app / package / cli / server). Kind picks architecture module.
3. **When to review** — _"Review the code at every step (after coding, and after each feedback round), or once when you run `/wa-validate` — your green light saying the feature matches the spec? (recommended: at `/wa-validate` — you iterate fast, and the review reads the final diff instead of code that's still moving)"_ → sets `review.when` (`each_round` | `on_validation`). Say trade plainly: `each_round` catch drift earlier but add verifier round to every note; `on_validation` review whole diff one pass. Either way nothing close unreviewed: `/wa-close` refuse task verifier never saw.
4. **Review toggles** — surface public-doc one explicitly, vary by company: _"Require doc comments (`///`, KDoc, TSDoc, …) on every public API? (some teams skip this)"_ → sets `review.public_doc`. Offer flip other toggles too.
5. **Build command** — ask only when detection found wrapper: _"I see `<X>` — should the implementer build with it, or use the detected build tool (XcodeBuildMCP, `./gradlew`, package scripts, …)?"_ → sets `build.command` (+ `build.test_command` if test target exists). Nothing detected → leave both empty, don't ask. **Project win over plugin default**: repo that documents own build path documents it for agents too, and implementer torn between two mandates pick one silently.
6. **Commit policy** — _"Once YOU validate a feature, may I commit it myself, or always wait for you to commit?"_ → sets `auto_commit_after_validation`. Fill `commit.author_name` / `author_email` from `git config user.name` / `user.email` and show them in one line to confirm; none set → ask. Remind: commits always use your name, never Claude's. Outside autopilot, nothing committed before you validate.
7. **Branch policy** — _"Should `/wa-code` work on its own branch per task (`wa/<slug>`), or code straight on the current branch?"_ → sets `branch.per_task`. If yes, confirm `branch.prefix` and `branch.base` (`current`, or fixed base like `main`). Mention pairing: with per-task branches **and** auto-commit on, closing task commit it and check out next task branch for you (`branch.checkout_next`, on by default) — offer turn off. `/wa-autopilot` branch per task regardless. Say `branch.sprint_prefix` exist (`sprint/<sprint>`, tasks of sprint fork off it, `/wa-close` merge back) but **don't ask** — default work, sprints may never come up.
   **Then, only when `per_task`: what happen to branch when its task close** — _"When a task is done, should I open a PR onto `main`, merge it locally, or leave the branch alone and let you do the PR? (recommended: leave it alone — you keep control of what gets proposed to the team; switch to `pr` once you trust the flow)"_ → sets `close.strategy` (`nothing` | `pr` | `merge`) + `close.target`. Two things to say: task in **sprint** always merge into its sprint branch first, this setting only decide what happen to sprint branch at end; and `pr` need `gh` authenticated, and **ask every time before opening one**. `close.delete_branch` stay `auto` unless they ask — delete only what already landed elsewhere.
8. **Where things live** — _"Keep the backlog, tasks and wiki inside `.whackagent/`, or put some of them somewhere the team already reads — `docs/wiki/`, say? (recommended: `.whackagent/` — one folder, nothing to wire up; move them if teammates who don't run whackagent need to read them)"_ → sets `paths.*`. Ask **once, as one question**; split into per-path answers only if they say "some of them". Two things to say when they move something:
   - shared wiki or backlog want **committed, browsable** folder (`docs/`) — `.whackagent/` read fine for agents, bad for human on GitHub;
   - `paths.reports` = run output, not knowledge — leave local (and gitignore-able) unless asked.
   Absolute paths work too (wiki in sibling repo). `.whackagent/config.md` itself never move — it carry the paths.

9. **Where the backlog lives** — _"Keep the backlog as files in the repo, or on a GitHub Project so several agents in different worktrees share it without stepping on each other? (recommended: files — nothing to wire up; switch to GitHub once you run agents in parallel)"_ → sets `backlog.provider` (`local` | `github`). Detect first: repo has GitHub remote and `gh` logged in → offer it; else don't ask, `local`. `github` → run *GitHub backlog* below, and say it forces `branch.per_task: true` + `close.strategy: pr` (skip questions 7's close part).

Keep short — 7 to 10 questions (build one fire only on detected wrapper; close policy only when `per_task`). Rest take template default.

**Only if project is runnable (kind `app`, `web`, `server`, `cli`):** ask **who tests it** after green build — _"In autopilot the agent exercises what it built itself (taps + screenshots, browser, curl, CLI run) since nobody's watching. When you're at the keyboard, should it do the same, or stop at build + tests and let you test? (recommended: you test — you'll run it anyway, and driving it costs a few minutes per round)"_ → sets `verify.mode` (`autopilot` | `always` | `off`). Name third option only if they push back on autopilot driving at all: `off` = nobody drives it, ever. `package` → `verify.platform: none`, don't ask.

Then set `verify.platform` + `verify.target` from detection (confirm in one line, list when several — KMP app with iOS + Android = `[ios, android]`) and say what driver it needs:
- `ios` → **XcodeBuildMCP** (same server it builds with, nothing extra); physical device → **mobile-mcp**.
- `android` → **mobile-mcp** (`mobile-next/mobile-mcp`), emulator or device.
- `web` → browser automation MCP (Playwright MCP, Claude in Chrome).
- `desktop` → desktop/computer-use MCP if they have one; else GUI proof unavailable, build + tests only.
- `server`, `cli` → nothing to install: Bash (`curl`, the binary).
Driver missing → say so now, not at first autopilot run.

### GitHub backlog (only when `backlog.provider: github`)

Follow `${CLAUDE_PLUGIN_ROOT}/providers/github/README.md` → **Setup**, one step at a time, each confirmed:

1. `gh auth status` has scope `project` — missing → give user `! gh auth refresh -h github.com -s project`, wait.
2. Project: list theirs (`gh project list --owner <owner>`), propose reuse or new. Run `wa-backlog provision --title … | --project <n>` (+ `--state x=Name` when adopting a board whose column names differ — ask for any state it can't match; never rename their columns). Pass `--tasks-path {tasks}` and `--branch-prefix <branch.prefix>`.
3. Workflow → branch `wa-setup/board-hooks`, copy `providers/github/whackagent-board.yml` to `.github/workflows/`, fix its `branches:` filter if prefix isn't `wa/`, PR onto default branch. Never push default branch. Hooks live once merged — say so.
4. Secret `WA_PROJECT_TOKEN` — give token link + `! pbpaste | gh secret set WA_PROJECT_TOKEN -R <repo>`, wait, check `provision` / `gh secret list`.
5. Offer (ask each): import open issues (`wa-backlog get <n>` adds each as `todo`); smoke test (README step 5).
6. Scaffold without `{backlog}` file — board replaces it. `{tasks}` still created (holds specs on ticket branches).

**Migrating an existing local backlog** (reconfigure `local` → `github`) — offer once, apply on yes, per task:
- not `done`/`canceled` → `wa-backlog create` (title, summary, size, sprint), board order = `{backlog}` order.
- `todo` + `grilled: false` → stays `todo`.
- `todo` + `grilled: true` → rename file `{tasks}/<n>-<slug>.md`, rewrite frontmatter to GitHub shape (`issue: <n>`), commit on `wa/<n>-<slug>`, push — hook moves it to `grilled` (tests hook for real).
- `in-progress` / `review` / `validated` → same, local branch renamed `wa/<n>-<slug>`, pushed; ticket lands `grilled`. User re-claims to continue — never auto-claim for a session that may be gone.
- `done` / `canceled` → not imported, history stays in git.
- then delete `{backlog}` in one commit. GitHub → local: not supported.

## 2. Scaffold

Create directory and files (do not overwrite existing without asking).

**Everything below land at its `paths.*` value, not at literal path written here** — `{tasks}`, `{wiki}`, `{backlog}`, `{reports}`, `{conventions}` = whatever step 1 question 8 settled on. Create parent folders as needed; path outside `.whackagent/` normal, not mistake. `config.md` one exception: always `.whackagent/config.md`.

- `.whackagent/config.md` — copy `${CLAUDE_PLUGIN_ROOT}/templates/config.md`, fill answers above (including `paths:` block), set `review.modules` to modules you actually copy (next bullet).
- `{conventions}/` — copy **only relevant** convention modules there:
  - **Multi-module packs** — **Swift** (`${CLAUDE_PLUGIN_ROOT}/conventions/swift/`), **Kotlin** (`…/conventions/kotlin/`): always `style.md`, `elegance.md`, `testing.md`, `architecture-global.md` (YAGNI/SOLID/DRY/DI — every project in that language). Kind module: `architecture-app.md` if kind is `app`, else `architecture-package.md`. UI module **only if that toolkit used**: `swiftui.md` (Swift), `compose.md` (Kotlin) — skip for server/CLI/library with no UI, whole point.
  - **Single-file packs** — **TypeScript**, **generic** (every other language): copy `${CLAUDE_PLUGIN_ROOT}/conventions/<lang>.md` and set `review.modules` to it alone. Generic = fallback, not second class: tell user it's the file to grow with their team's real rules.
  - Polyglot repo with two packs → copy both into sub-folders (`{conventions}/swift/`, `{conventions}/kotlin/`), list both in `review.modules`.
  - Set `review.modules` in config to exactly what you copied — verifier read that list and nothing else, so module copied but left out of list = rulebook nobody opens.
- **Xcode projects only** (repo has `.xcodeproj`/`.xcworkspace`): create `.xcodebuildmcp/config.yaml` at repo root (not in `.whackagent/`) so XcodeBuildMCP build incrementally instead of full-rebuild every time. Content:
  ```yaml
  schemaVersion: 1
  incrementalBuildsEnabled: true
  ```
  Skip if the file already exists (don't clobber a user's config). This is why an implementer with no `build.command` builds through XcodeBuildMCP — command-line `xcodebuild` ignores this file and rebuilds from scratch. With a `build.command` set, the wrapper owns the build dir instead, and this file is just harmless.
- `{backlog}` — copy `${CLAUDE_PLUGIN_ROOT}/templates/BACKLOG.md`. **Skip under `backlog.provider: github`.**
- `{wiki}/index.md` — copy `${CLAUDE_PLUGIN_ROOT}/templates/wiki-index.md`.
- Create empty `{tasks}/` and `{reports}/` directories (`.gitkeep` fine).

## 3. Seed the wiki (optional, offer it)

Offer to bootstrap few wiki pages by reading the source (e.g. `architecture`, plus one page per major subsystem). Only if user says yes.

## 4. Compress docs (if `compress_wiki: true`)

To cut re-read tokens, run **caveman-compress** skill on `.whackagent/config.md` and every wiki page just written (`{wiki}/*.md`). After each compression, delete `*.original.md` backup it creates — git history is backup. Do **not** compress the backlog, task files, or reports. Skip this step entirely if `compress_wiki: false`.

**Wiki outside `.whackagent/` + `compress_wiki: true` → ask before compressing.** A wiki you moved to `docs/` is one a teammate reads directly; caveman prose is for the agents' token budget, not for humans. Recommend flipping `compress_wiki: false` in that case.

## Reconfigure mode — the project is already set up

The project already works. You're here to **change settings and pick up what the plugin added since**, not to reinstall. Everything the user wrote — config values, free-form notes, edited convention modules, the backlog — is theirs.

### 1. Take stock, before asking anything

1. **Read `.whackagent/config.md`.**
2. **Re-run the detection pass** from step 1 and compare it to the config. Drift is worth a line each — the project adopted SwiftUI or Compose, a build wrapper appeared, the kind changed from `package` to `app`. **Surface it, never auto-apply**: a value the user set by hand outranks anything you detect.
3. **Diff the config's keys against `${CLAUDE_PLUGIN_ROOT}/templates/config.md`.** Keys in the template and missing from the config are features shipped after this project was set up (`paths:` is exactly that for anything set up before it existed). They're the main reason to re-run this command — list them with their default and what they buy, and ask.
4. **Check the paths resolve.** A `paths.*` key pointing at nothing means files moved by hand: say which key and what it points at, offer to re-point the key or move the files back. Don't scaffold over it.

### 2. Show the state, then ask what changes

One table — current value, and a flag on anything worth attention:

```
| Setting      | Current               | |
|--------------|-----------------------|-|
| review.when  | on_validation         | |
| paths.wiki   | .whackagent/wiki      | 🆕 movable (docs/wiki) for team sharing |
| verify.mode  | autopilot             | |
| build.command| (empty)               | ⚠️ `make build` detected since |
```

Then **one question: what do you want to change?** Re-ask a full question (step 1's wording) only for what they name, plus every new key from stock-taking step 3 — those they've never been asked. Current value is the default in every one; "leave it" is always a valid answer. Don't walk all eight questions at somebody who came to flip one toggle.

With an arg (`/wa-setup paths`), skip the table's unrelated rows and go straight to that section's questions.

### 3. Apply

**Edit the config in place, key by key. Never re-copy the template over it** — that erases the free-form notes, the per-project comments and every value you didn't ask about. Add a missing key with the template's default plus its comment block; leave every untouched key byte-for-byte.

**A path change means moving files — do it, don't just rewrite the key.** Nothing back-fills, and a re-pointed `paths.wiki` with the pages left behind is a wiki that silently vanished.

1. **List what will move, ask, then move.** `git mv` when the files are tracked, plain move otherwise; create parent folders first.
2. **Target already exists and isn't empty → stop and ask.** Merge into it, pick another path, or abort — never overwrite, never mix two wikis silently.
3. **Fix the links after the move**: backlog → task files (relative to the backlog's own folder), and any `[[page]]` or task `wiki:` reference whose page moved.
4. **Dirty tree → say so before moving anything.** A move mixed into uncommitted work is painful to unpick.
5. **Wiki moved out of `.whackagent/` → recommend `compress_wiki: false`** (same reason as step 4: humans read it now).

**Conventions dir — additive only.** Copy in modules that are missing (a module the plugin added, or `swiftui.md`/`compose.md` because the project uses that toolkit now) and update `review.modules` to match. **Never overwrite a module that's already there**: those copies hold the rules `/wa-feedback` captured from the user. A plugin-side module changed upstream → say so, show the diff, copy only on their yes.

**Never re-scaffold what exists.** Backlog, task files, reports and wiki pages are content — this command doesn't touch their contents, ever. Missing entirely (a `{tasks}` folder someone deleted) → recreate the empty folder, mention it.

**Don't re-run the wiki seeding or the compression pass** over pages that already exist. Compression is for pages written this run; there are none.

### 4. Report

What changed, one line each: config keys (before → after), files moved, modules added. Nothing changed → say that plainly rather than inventing a diff.

## Next step

End by suggesting: **`/wa-board`** to see backlog and pick first task, or `/wa-task <description>` to create one. Reconfigure run → **`/wa-board`** to check the backlog still reads right, above all after a path move.