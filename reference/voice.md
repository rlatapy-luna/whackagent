## Voice

Canonical, every whackagent skill. Applies to **screen output and `{reports}`**. Text teammate reads cold (PR, commits, task spec) → *Human text* below.

- **Telegraphic.** Fragments OK. No articles filler, no pleasantries, no hedging, no re-explaining the flow. One idea per line.
- **Tech terms stay English** — build, branch, merge, commit, review, worktree, emulator, endpoint, loading, fix… Never translate them, whatever `discussion_language` is.
- **Short common words.** `fix` not `apply a correction`, `test it` not `proceed to testing`.
- **Clarity beats brevity.** Fragment readable two ways → write the full sentence.
- **Task files are the exception** — `## Context / Decisions`, `## Acceptance criteria` follow *Human text*: verifier and user reread them months later, fragments there get misread.
- Screen headings and labels follow `discussion_language`. Task file section headings stay English always — skills look them up by name.

### Human text

Text teammate reads later, cold, no chat: PR body, commit messages, task `## Context / Decisions` and `## Acceptance criteria`. Terminal stays telegraphic (above).

- **Short full sentences.** Subject + conjugated verb, one idea each. Bullets from 2 facts, each standing alone.
- **Everyday words.** `fix`, `show`, never rare precise one. What app shows, not code concept: `the count`, not `the view`. Type name only when line is about code.
- **Say less.** Reader wouldn't miss it → cut. No recap, no conclusion, no announce.
- **Verb in prose**: `sync fails`, not `sync in failure`. **No stacked qualifiers**: split into two sentences.
- **Written in output language**, never translated from another one: no calque. Tech terms stay English (above).
- **No dash as separator** (`—`, ` - `): `:` or new line. Fixed strings exempt, kept verbatim: PR status line `Draft — …` (`BOARD.md` too), signature `_— Claude · lb-agents_` (pane parses it).
- **Meaning never lost.** Readable two ways → add word. Reread once against tics below before publishing.

| tic | ❌ | ✅ |
|---|---|---|
| thing with intent | `the button takes care of saving` | `the button saves` |
| explain the format | `Each section below covers one change` | *(cut)* |
| say the obvious | `Rename X to Y: X is now called Y` · `Add tests that test the parsing` | `Rename X to Y` · `Add parsing tests` |
| over-precise | `move only, no logic change` · `iOS side only, Android not concerned` | *(cut)* · `iOS only` |
| calque | `the sheet carries this background` · `without expected visual change` | `the sheet has this background` · `same look` |
| AI linkers | `This ensures that the cache is cleared` · `in order to guarantee consistency` | `The cache is cleared.` · *(cut)* |
| judgment | `robust error handling` · `seamless transition` · `displays correctly` | `Network errors retry 3 times.` · `no flicker` · `displays` |
| announce | `Here's a summary of the fix:` · `To sum up,` | *(say it)* |
| stacked fragments | `pool full → waiter queued, timeout 5s` | `When the pool is full, the call waits up to 5 s.` |

**Banned words** (never in Human text): `seamless` · `robust` · `leverage` · `ensures` · `it's worth noting` · `note that` · `here's`
Same for their equivalents in `discussion_language`.

### Sketch

Question whose options differ by mechanism → small sketch under each option: user compares how, not just names.

- Flow → one arrow line: `Sync: headers → save → bodies → save`.
- Branches, states → ASCII (`─│└▶`), ≤ 8 lines, no emoji.
- Logic → pseudo-code. Contract → real code, cut with `…`. ≤ 6 lines.
- Names: real types or glossary terms, never invented.
- Never mermaid in terminal.

### Next line

Run ending on suggested command → **last line** starts with `→`: `→ next:` (label per `discussion_language`, arrow always) + recommended command **in backticks, complete**: real slug or `#`, never `<slug>` (`` → next: test it, then `/wa-validate 216` ``). Recommended command = **first** backticked one on line; alternatives after, backticked too (`` (or `/wa-feedback 216 <notes>`) ``). Text only user can write stays `<placeholder>`, at end. Backlog pane offers that first command as prompt suggestion (Tab takes it) — order and backticks matter.

### Titles and summaries

Title = **label**, not sentence. Names the thing + what is done to it. ≤ 5 words. Must read like a dev wrote it in a ticket.

- **Never a narrative sentence.** Subject-verb-object that tells a story = failed title. `The dashboard asks the questions instead of the commands` → `Prompts in dashboard`.
- **Never a metaphor or image.** `Tests turn red at random` means nothing to anyone → `Fix flaky CLI tests`.
- **Tech terms stay tech terms**, here too — flaky, job, watermark, toggle, prompt, scope, seed, dashboard, child process. Paraphrasing or translating them produces gibberish.
- **No elegant rewording.** User says `rework UI` → write `Rework UI`, not `A shared style for the screens`.
- **Verb matches task `type:`** when set (`${CLAUDE_PLUGIN_ROOT}/reference/task-types.md`): `bug` → `Fix …`. Contradiction → fix title, not type.

Summary = **the goal, plainly**, ≤ 8 words. What it gives once done. Not the mechanism, not the story, not the list of what disappears.

| ❌ | ✅ title | ✅ summary |
|---|---|---|
| After a purge, jobs don't replay | `Replay jobs after purge` | purge doesn't reset watermarks |
| Import the whole country, or just a region | `Configurable import scope` | DATA_SCOPE: region locally, country in prod |
| CLI tests turn red at random | `Fix flaky CLI tests` | 4 TUI tests fail in suite, pass isolated |
| A shared style for the CLI screens | `Rework CLI screens UI` | shared design system in tui/design/ |
| The dashboard asks the questions instead of the commands | `Prompts in dashboard` | commands take options, dashboard asks |
| Dashboard navigation follows the command tree | `Dashboard nav by group` | one tab = one group, no more MENU_* |
| The Data screen reads the backend job list | `Data screen reads GET /admin/jobs` | no more job catalog duplicated in CLI |
