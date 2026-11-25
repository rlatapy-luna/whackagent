# Shots

iOS PR screenshots replayed by XCUITest: `wa-screenshot` writes the path to each state once, `xcodebuild` replays it on base and branch — identical before/after paths, fewer tokens than driving tap by tap. Config `pr.screenshots_replay` (`on` | `off`, default `off`). iOS only: every other platform, and iOS without target, keeps driving by hand (**reference/code-github.md**, *Screenshots*). Template `${CLAUDE_PLUGIN_ROOT}/templates/shots/`.

## Target

```
<App>.xcodeproj
<App>Screenshots/                 ← UI Testing Bundle, synchronized folder (Xcode 16+)
├── Support/ShotCase.swift        ← committed, from template
└── Generated/                    ← git-ignored; one task's tests, written by wa-screenshot
```

- Target `<App>Screenshots`, target to test = the app.
- Shared scheme `<App>Screenshots`, test action = this target only. In no other scheme or test plan: CI and dev tests never run it.
- Present = `xcodebuild -list` shows scheme `<App>Screenshots`.
- Strict linter and architecture tests skip it (`*Screenshots` excluded in their templates).

## Setup

Only iOS app (`verify.platform` holds `ios`, or iOS app target detected at setup), `pr.screenshots` ≠ `off`, user said yes to replay question (**wa-setup → 1. Interactive config**). One plan shown, applied on yes. Target present → keep it, diff `ShotCase.swift` vs template, copy on yes.

1. **Create**, first that applies:
   - `project.yml` (XcodeGen) / `Project.swift` (Tuist) → add target + scheme to spec, regenerate.
   - Xcode MCP tool for new targets available → UI Testing Bundle `<App>Screenshots`, target the app.
   - Else → say: File › New › Target › UI Testing Bundle `<App>Screenshots`, target the app. Keep `pr.screenshots_replay: off`, say `rerun /wa-setup pr once done`. Stop.
2. **Clean** — delete test files Xcode generated. Copy `ShotCase.swift` → `<App>Screenshots/Support/`.
3. **Schemes** — remove target from app scheme's test action and test plans. Shared scheme `<App>Screenshots` testing it alone.
4. **Ignore** — `<App>Screenshots/Generated/` → `.gitignore`.
5. **Prove** — `xcodebuild build-for-testing -scheme <App>Screenshots -destination 'generic/platform=iOS Simulator'` green (`-skipPackagePluginValidation` when project has SwiftLint build plugin). Red → stop, report first error.
6. `pr.screenshots_replay: on`.

## Rules

- Target = project's. `/wa-setup` reconfigure offers `ShotCase.swift` diffs, never rewrites.
- `Generated/` holds one task's test at a time, never committed. Agent writes nowhere else in repo.
- Never add launch arguments, hooks, ids or fixtures to app for a shot.
- `on` + scheme missing on checkout or base → whole run drives by hand (never two runners in one pair), `NOTES:` says why. Missing on checkout → `→ /wa-setup pr`.
