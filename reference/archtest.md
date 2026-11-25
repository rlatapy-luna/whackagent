# Archtest

Architecture rules as unit tests: violation = red test, for agents, devs and CI alike. Config `archtest` = suite installed (`harmonize` | `konsist` | `none`, default `none`). Runs through `tools:` entry `archtest`, `when: [validation]` — no run path of its own. Templates `${CLAUDE_PLUGIN_ROOT}/templates/archtest/<language>/`.

## Tools

| `archtest` | Pack | Suite folder | `tools:` `run` | Baseline |
|---|---|---|---|---|
| `harmonize` | swift | `Architecture/` SwiftPM package (macOS host, [Harmonize](https://github.com/perrystreetsoftware/Harmonize)) + `.harmonize.yaml` at root | `swift test --package-path Architecture` | `Architecture/Tests/ArchitectureTests/Support/ArchBaseline.swift` |
| `konsist` | kotlin | `architecture/` Gradle JVM test module ([Konsist](https://docs.konsist.lemonappdev.com)) | `./gradlew :architecture:test` | `architecture/src/test/kotlin/architecture/support/ArchBaseline.kt` |

- Offered for swift and kotlin packs. Rule sets: Swift `global/` + `app/` or `package/` per kind; Kotlin `global/` + `app/` for kind `app`, `global/` alone otherwise. Other packs → `none`.
- One file per subject, one test per rule. Test name = rule id = module `arch:` tag = baseline key.
- Each rule carries why + fix citing its module section: failure explains itself, at violation's `path:line`.
- Swift: every `@Suite` `@MainActor` (Harmonize deadlocks on cooperative pool). First run ~20 s (swift-syntax), then ~3 s. `Architecture/.build/` git-ignored.
- Kotlin: Konsist parses sources, compiles none: seconds. Finds project root by `gradlew`. `support/Layers.kt` = project's own names for its layers (presentation class suffixes, UI and data package segments), set at setup from screen pattern project already follows (MVVM, MVI, presenter/reducer): rules never hard-code a pattern.

## Setup

One plan shown, applied on yes. Suite already there → keep it, diff vs template, offer missing rules. Never overwrite.

1. **Copy**
   - Swift: `.harmonize.yaml` → repo root, `Package.swift` → `Architecture/`, `Architecture/.build/` → `.gitignore`. `Support/` + `global/*` + `<kind>/*` (`app` → `app/`, else `package/`) → `Architecture/Tests/ArchitectureTests/`; subject folders merge.
   - Kotlin: `build.gradle.kts` → `architecture/`, `include(":architecture")` in settings. Root must resolve Kotlin JVM plugin: none there → `kotlin("jvm") version <project Kotlin> apply false` (catalog alias when project has one). Konsist version from catalog when present. `support/` + `global/*` (+ `app/*` for kind `app`) → `architecture/src/test/kotlin/architecture/`. Fill `Layers.kt` from code: presentation suffixes (`ViewModel`, `Presenter`…), UI and data package segments — show values, confirm.
2. **Tool entry** — `tools:` gets `name: archtest`, `run` per *Tools*, no `fix`, `when: [validation]`. Config `archtest: <tool>`.
3. **Run** once. Build error → stop, report first.
4. **Baseline** each failing rule: violation's type name (file name for file-tree rules) → baseline literal under its rule id. Edit that literal only. Re-run: green. Anything frozen → count per rule, offer one task to clear it (`/wa-task Clear architecture baseline`).
5. **Wire** — say: add `run` to CI next to tests. Xcode: drag `Architecture/` into workspace to see it in Test navigator. Never forced.
6. **Prove** — one green run.

## Rules

- Suite + baseline = project's. `/wa-setup` reconfigure diffs project suite vs template: rule id in template, missing in project → offered, never removes user's. Yes → copy its file, its violations join baseline.
- Baseline shrinks only: entry whose rule now passes, or that matches nothing, fails run. **Stale entry = this task's failure**, whatever file it names: diff fixed that violation, so same change deletes entry. Every other failure in file diff never touched = pre-existing, as any tool.
- Agents never touch suite folder (`Architecture/`, `architecture/`), `.harmonize.yaml` or baseline — no new entry, no disabled test, no `Layers.kt` edit — except deleting stale entry run names. Rule can't be met → `BLOCKED:`.
- Rule changes through a task: module section + test, same commit.
- Each archtest-backed module section carries `arch: <rule ids>`. Verifier handed `archtest: <tool>` never judges those rules by eye: tests prove them at validation.
