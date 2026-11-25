## How it works

`pr.how_it_works: true` only (key missing → plain *Changes* lines, **reference/pull-requests.md**). Each non-trivial *Changes* line folds open to show how change works, for reviewer new to task. Every ticket PR body write or refresh.

- **Signals first** — from ticket checkout: `${CLAUDE_PLUGIN_ROOT}/scripts/pr-check signals <base>`. `<base>` = PR base branch, never sha: sprint branch, `close.target`, track trunk, or blocker branch when stacked (**reference/code-github.md**, *Stacked PRs*). Script narrows to ticket range itself (`task: grill|spec` marker), picks freshest of local / origin. PR branch not checked out → `--head <branch>`. Swift, Kotlin, TypeScript get signals; other languages none → judge from diff same way. `generated (skipped)` → no signal.
- **Coverage** — each code file → one *Changes* line; file in none → add its line. Tests follow their code. New types of one line not linked → one line per group. Line signals = union of its files. Judgment adds blocks, never drops.

| signal | block in fold |
|---|---|
| always | **Before** / **Now**, code fold |
| `type` | **Overview**, other types named in **Now** |
| `signature` | **Callers** |
| `states` | transitions → `stateDiagram-v2`, else cases listed in **Now** |
| ≥ 5 files, or ≥ 2 steps | parts |
| `async` | part `When … at once` |
| `failure` | part `If … fails` |

Cap: 2 Overview types, 2 diagrams, 4 parts. Over → split line, never cut.

- **Place** — line itself folds: `<dl><dd><details>`, `<summary>` = line text (code → `<code>`), content in `<dl><dd><br>` … `</dd></dl>`, then `</details></dd></dl>`. Never own section. No signal, trivial (copy, rename, translations) → plain `- ` line. `generated (skipped)` → at most one plain line naming its source (`Update translations from Loco`). Template owns changes section → folds there.
- **PR overview** — `overview: yes` and types span ≥ 2 lines → one `<details>`, `<summary>Overview</summary>`, after summary, before *Changes*. One real scenario end to end: bold title = trigger (`**Foldable half folded, vertical fold**`), numbered steps (subject + what it does, values from code or tests only), `→` visible result. Branches → `flowchart TD` of steps instead. No code.

### Fold

Labels in PR language, this order:

1. **Before** / **Now**. Nothing before → **Problem**. Test-only line → **Situation**, **Risk**, **Expected**.
2. **Overview** — type carrying mechanism, real code: stored properties, signatures called from outside, bodies `{ … }`, role comment per member. ≤ 20 lines.
3. **Callers** — why in one sentence, others named, one ` ```diff ` on one caller, ≤ 12 lines.
4. Diagram — only on branches or states (*Diagram*).
5. Parts, execution order — bold title, ≤ 1 context sentence, bullets, code fold. No parts → one code fold.
6. **Read** — entry function → next → next, each linked to its line: in diff → `pull/<n>/files#diff-<sha256(path)>R<line>`, else `blob/<head sha>/<path>#L<line>`. End of fold.

≤ 2 fold levels.

- **Code fold** — `<summary>` = 🧩 + what it shows (`<code>Pool.borrow</code>`). Mechanism → pseudo-code, real names; contract → real code from diff, cut, ≤ 15 lines. Inside its real owner (`actor SessionPool {`), role comment on type line. Comments say intent, not name; each branch says when it happens. No name reader can't find in diff.
- **Diagram** — steps or states, never who uses whom; linear → numbered list. `flowchart TD` (never `LR`) → steps with branches; `sequenceDiagram` → exchanges; `stateDiagram-v2` → states with transitions. Node = step (`Cut line at fold`) or state, **never bare type name** (pr-check refuses it). Arrow = condition or real data, ≤ 4 words. ≤ 8 nodes. No caption.
- **Words** — **reference/voice.md** applies. Part title starts with situation: `How` / `When` / `If`, subject + verb, no `?` (`When all 3 sessions are busy`). ≥ 2 facts → bullets. Concept named in code → code's word, never translated. Concrete subject, never `we`.
- **Vocabulary** — optional `### Vocabulary` fold after *Changes*: terms new reviewer may not know, ≤ 8, numbered, ≤ 30 words each. Term in `{wiki}/glossary.md` → its glossary definition, linked. Never common dev words or Overview types.
- **Truth** — from ticket range diff + `## Context / Decisions`. Link unsure → read caller, never guess.
- **Check** — final body file, from ticket checkout: `${CLAUDE_PLUGIN_ROOT}/scripts/pr-check check <body-file> <base>`. ❌ → fix body, rerun. ⚠️ on commit = wording to avoid next time, never rewrite pushed commits. Publish per **reference/pull-requests.md**, *Publish*: guard reruns check, refuses red body.
- **Refresh** — folds rewritten whole from current diff, never patched.
- **Example** — `${CLAUDE_PLUGIN_ROOT}/scripts/pr-check-fixtures/swift/body-good.md`.
