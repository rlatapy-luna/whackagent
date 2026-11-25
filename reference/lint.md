# Lint

Strict linter from plugin template: convention rules become tool errors, for agents, devs and CI alike. Config `lint` = template installed (`swiftlint` | `eslint` | `detekt` | `none`, default `none`). Runs through `tools:` like any project tool — no run path of its own. Templates `${CLAUDE_PLUGIN_ROOT}/templates/lint/<language>/`.

## Tools

| `lint` | Pack | Config (from template) | `tools:` entry `run` · `fix` | Baseline | Build wiring (offered) |
|---|---|---|---|---|---|
| `swiftlint` | swift | `swift/.swiftlint.yml` → repo root · `swift/Tests.swiftlint.yml` → `.swiftlint.yml` in each test folder (`Tests/`, `<App>Tests/`, `<App>UITests/`) | `swiftlint lint --quiet` · `swiftlint --fix` | `swiftlint lint --write-baseline .swiftlint.baseline`, then `baseline: .swiftlint.baseline` in yml | SwiftLintPlugins build tool plugin |
| `eslint` | typescript | `typescript/eslint.config.js` → root, dev deps `eslint typescript typescript-eslint` | `npx eslint . --max-warnings 0` · `npx eslint . --fix` | `npx eslint . --suppress-all` (ESLint ≥ 9.24 → `eslint-suppressions.json`) | `"lint"` script + `"prebuild": "npm run lint"` |
| `detekt` | kotlin | `kotlin/detekt.yml` → `config/detekt/detekt.yml` · Gradle plugin `io.gitlab.arturbosch.detekt` 1.23.x + `detektPlugins("io.gitlab.arturbosch.detekt:detekt-formatting:<same>")` (ktlint rules) | `./gradlew detekt` · `./gradlew detekt --auto-correct` | `./gradlew detektBaseline` → `detekt-baseline.xml` per module | `preBuild` (Android) / `compileKotlin` depends on `detekt` |

- Offered only when pack is swift, kotlin or typescript **and** detection found no linter for it. Linter found → project's own, goes to `tools:` as detected, `lint` stays `none`, template never offered. Generic pack → no template, `none`.
- Run commands = defaults: project script or wrapper (`make lint`, CI step) wins when one exists.

## Setup

One plan shown, applied on yes. Linter config already there → keep it, diff vs template, offer missing rules. Never overwrite.

1. **Config** — copy per *Tools*. `review.public_doc: false` → drop doc rules (`missing_docs` Swift, `Undocumented*` Kotlin).
   - Kotlin: plugin + `detektPlugins` in every module with Kotlin sources — project's convention plugin when it has one, else root `subprojects { }`. `detekt { buildUponDefaultConfig = true; config.setFrom("$rootDir/config/detekt/detekt.yml"); baseline = file("detekt-baseline.xml") }`. Version from catalog when present.
2. **Tool entry** — `tools:` gets `name: <lint>`, `run`, `fix`, `when: [code, validation]`. Config `lint: <tool>`.
3. **Autofix** — offer `fix` over whole repo (recommended: yes — mechanical, shrinks baseline). Say how many files changed. Never committed by setup: user reviews diff.
4. **Baseline** — what autofix left frozen per *Tools*. Nothing left → no baseline file, Swift `baseline:` line stays commented. Anything frozen → count per rule, offer one task to clear it (`/wa-task Clear lint baseline`, counts in summary).
5. **Wire into build** — separate question, never forced (*Tools* last column):
   - SwiftPM: dependency `.package(url: "https://github.com/SimplyDanny/SwiftLintPlugins", from: "<latest tag>")`, every target `plugins: [.plugin(name: "SwiftLintBuildToolPlugin", package: "SwiftLintPlugins")]`.
   - Xcode project: edit `project.pbxproj` — one `XCRemoteSwiftPackageReference` (`kind = upToNextMajorVersion; minimumVersion = <latest tag>;`) in project `packageReferences`; per target an `XCSwiftPackageProductDependency` (`package` → it, `productName = "plugin:SwiftLintBuildToolPlugin"`) and a `PBXTargetDependency` with `productRef` → it, in target `dependencies`. New 24-hex ids, unused elsewhere. Check `xcodebuild -list` still parses. Plugin trust: every CLI build passes `-skipPackagePluginValidation` (XcodeBuildMCP `extraArgs`, `build.command` wrapper, CI); say in Xcode click **Trust & Enable** once.
   - TypeScript: scripts per *Tools*. Kotlin: `tasks.named("preBuild") { dependsOn("detekt") }` per Android module, else `compileKotlin`.
   - Declined → tool runs only through `tools:` (agents) and whatever CI step team adds.
6. **Prove** — `run` once, green (exit 0). Red → stop, report first error.

## Rules

- Linter config + baseline = project's. `/wa-setup` reconfigure diffs project config vs template: rule in template, missing in project → offered, never removes user's. Yes → its violations join baseline, as at setup.
- Baseline shrinks only. Agents never edit config, baseline or suppressions file, never add disable comment (`swiftlint:disable`, `eslint-disable`, `@Suppress` naming a detekt rule, `ktlint-disable`). Rule can't be met → `BLOCKED:`.
- Each lint-backed module section carries `lint: <rule ids>`. Verifier handed `lint: <tool>` skips those rules (tool proves them every round), judges rest. `lint: none` → `lint:` lines inert, every rule judged by eye.
