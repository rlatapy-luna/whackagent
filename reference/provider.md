## Backlog provider

Canonical, every skill. `backlog.provider` in config (missing → `local`) decides where tickets live. Contract: `${CLAUDE_PLUGIN_ROOT}/providers/CONTRACT.md` — skills speak its verbs and six states, never tracker terms.

- **`local`** — `{backlog}` + task file frontmatter, as every skill describes by default. Mapping: `providers/local.md`.
- **`github`** — rules: **reference/code-github.md** + **reference/board-github.md**.
- **`plane`** — **experimental**, Plane CE board, code on GitHub. Rules: **reference/code-github.md** + **reference/board-plane.md**.

`vcs.provider` (missing → `github`, only value) = code host under non-`local` board. `local` ignores it.
