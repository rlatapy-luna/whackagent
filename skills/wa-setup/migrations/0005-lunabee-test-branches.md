# 0005 · Lunabee test branches and PR markers

Local test branches are `lb-test/<key>`, not `wa-test/<key>`, and PR bodies carry `lb-*` markers (**reference/test-branch.md**, **reference/pull-requests.md**). Skills stop on the old names; this renames them, whatever the provider. Board data (variables, labels, claim refs, workflow, PRs of a GitHub or Plane board) stays with *Take stock* step 7, *Lunabee names*: it must follow the board PR merge.

## Detect

Any of:

- local branch `wa-test/*`, or worktree `{worktrees}/wa-test-*` (`git branch --list 'wa-test/*'`, `git worktree list`);
- `backlog.provider: local`, `gh` logged in, open PR body holding `<!-- whackagent -->`, `<!-- wa-report -->` or `<!-- wa-screenshots` (`gh pr list --state open --json number,body`).

## Plan

`0005 Lunabee test branches : <n> branches, <m> PRs`, one line per branch (`wa-test/develop → rebuilt as lb-test/develop`) and per PR (`#18 markers renamed`). Answers: `yes` (recommended: skills run again, one marker per PR) · `skip`.

## Apply

1. Each `wa-test/<key>` throwaway → `git worktree remove` its worktree, `git branch -D`; next run builds `lb-test/<key>`. Dirty, or commits beyond its merges → keep it under the new name: `git branch -m wa-test/<key> lb-test/<key>`, its worktree `git worktree move` to `{worktrees}/lb-test-<key>`; say so (*Never rebuilt over user work* then protects it).
2. Each PR body: `<!-- whackagent -->` `<!-- /whackagent -->` → `<!-- lb-agents -->` `<!-- /lb-agents -->`, `wa-report` → `lb-report`, `wa-screenshots` → `lb-screenshots` in markers, rest byte-for-byte (`gh pr edit <n> --body-file`).
