---
title:                  # label ≤ 5 words, not a sentence ("Fix flaky CLI tests", not "Tests turn red at random")
summary:                # ≤ 8 words, the goal plainly — never the mechanism, never repeat the title
size: medium            # quickwin | medium | large  → 🟢 | 🟡 | 🔴 in backlog list
sprint:                 # OPTIONAL kebab-case label group big work ("login-refacto").
                        # Empty = standalone task. Sprint exist because task name it —
                        # no sprint file, no create command. See /wa-task → Sprints.
status: todo            # todo | in-progress | review | validated | done | canceled
                        #   review    = coded, wait YOU test it
                        #   validated = you say match spec, verifier ran, wait your retest
                        #   done       = retested + closed by /wa-close
grilled: false          # true once clarified via /wa-task (grill-me)
wiki:                   # [[page]] refs, comma-separated
note:                   # free-form trigger / context (optional, not auto-evaluated)
created:                # YYYY-MM-DD
---

## Context / Decisions

<!-- Fill by /wa-task. What, why, scope (YAGNI), decisions resolved in grill. -->

## Acceptance criteria

<!-- Fill by /wa-task. Observable checks mean "done" — each one thing you see
     on screen or state input must produce. wa-implementer drives these on device
     when verify.mode puts runtime proof on agent; wa-verifier checks diff meets them. -->

## Implementation

<!-- Fill by /wa-code. Approach, files touched, build proof, notes from wa-implementer. -->

## Review

<!-- Fill by /wa-validate (and /wa-code when review.when: each_round). Findings tagged by
     lens (style / elegance / structure / correctness) + what autofix changed, one block per
     round. -->

## Verification

<!-- Fill by /wa-code and /wa-feedback. wa-implementer runtime CHECKS (✅/❌) + screenshot paths per
     criterion, or "manual validation — not run by agent" when verify.mode leaves the run to you. -->

## Feedback

<!-- Fill by /wa-feedback, one block per round: what you asked (your words), triage
     (defect / adjustment / new scope / rule), what changed, review + verify verdicts,
     any rule promoted into convention module. Rounds append, never overwrite. -->