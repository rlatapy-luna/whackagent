## Findings

Review finding = **claim, not order**. Verifier finding, PR reviewer comment (human or bot): same rule. Canonical, every skill that acts on findings (`/wa-code`, `/wa-validate`, `/wa-autopilot`, `/wa-review --fix`, `/wa-feedback`).

- **Check, then fix.** Whoever fixes (implementer in fix mode, or you on inline micro-fix) checks each finding against code as it is **now**, first: read cited lines, trace claim — call sites, null path, input that breaks it, rule as module words it, criterion as task words it. One verdict per finding:
  - **confirmed** → fix.
  - **rejected** → no edit. Evidence one line: `path:line` + what code, module or criterion actually says (`Login.kt:42 already guards null two lines up`, `style.md has no such rule`). "Looks fine" = no evidence = not rejection.
  - Half true → fix true part, reject rest, say which.
  - Can't settle from code → rejected `can't confirm: <what would settle it>`. Never fix blind to end argument.
- **Severity proves nothing.** 🔴 checked same as 🟡. Finding citing line diff never touched, rule module lacks, criterion task lacks → check twice: usual false positive.
- **`tool:` findings exempt** — tool output is fact, tool re-run is the check. `tool:build` (open build warning) too: rebuild that recompiles its file is the check. False positive of tool itself (suppression, config) = user's call, never silent.
- **Rejection goes back to its author, once.** Verifier → next round gets rejection + evidence, re-states it `withdrawn` (evidence holds) or `still open` + new evidence. New evidence → fixer checks again: confirmed → fix, rejected again → **disputed**. Neither side drops one silently.
- **Disputed → user.** Out of autofix loop (counts as no progress, never re-sent). Shown with both sides, one line each, plus recommendation. User decides: fix (`/wa-feedback`), accept, or drop. Open disputed finding = verdict not clean.
- **Record** in task `## Review`, round block: per finding `fixed` / `withdrawn — <evidence>` / `disputed — <both sides>`. Report: count of withdrawn + disputed next to fixed. Withdrawn 🔴 named in report, never only counted.
- **PR reviewer comments** (`/wa-feedback`) → triage bucket **invalid**: claim fails check → no change, reply carries evidence (**wa-feedback → GitHub provider**, *Answer PR comments*). User's own notes = not findings, never rejected: note contradicting code → say what code shows, ask with recommended answer.
