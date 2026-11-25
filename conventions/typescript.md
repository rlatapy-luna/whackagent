# Conventions — TypeScript

> Convention module · single file, front end and back end. Read by the verifier; the implementer writes against it. Edit the **Toggles** block per project.

## Toggles

```yaml
public_doc: true          # TSDoc on every exported symbol
comment_discipline: true  # comments only explain non-obvious "why"
strict_types: true        # no `any`; prefer `unknown` + narrowing
no_default_export: true   # named exports only
```

## Review checklist

1. **Public documentation** (`public_doc`) — every exported function/type/const carries `/** TSDoc */`.
2. **Comment discipline** (`comment_discipline`) — no comment restates code; only non-obvious *why*.
3. **Strict types** (`strict_types`) — no `any`; use `unknown` + narrowing, discriminated unions, `as const`. No non-null `!`.
   lint: @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/consistent-type-imports
4. **Idiomatic** — `const` over `let`, immutability, `map`/`filter`/`reduce`, optional chaining / nullish coalescing, early return.
   lint: prefer-const, no-var, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/prefer-optional-chain
5. **Modules** (`no_default_export`) — named exports; one main concept per file.
   lint: no-restricted-syntax
6. **Async** — `async`/`await`, never floating promises; handle rejections.
   lint: @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/require-await
7. **Testing** — colocated `*.test.ts`, one `describe` per unit, clear test names. UI: query by role/label/`data-testid`, never CSS selectors or copy.
8. **Logging** — project logger, never `console.*`. No `TODO` / `FIXME` left: do it now, or ask.
   lint: no-console, no-warning-comments
9. **YAGNI · SOLID · DRY** — no speculative generality (YAGNI); single responsibility, depend on abstractions (interfaces/types) not concretions, small composable units (SOLID); no duplicated logic — factor it, reuse what exists (DRY).

## Architecture (review category: architecture)

- **Group by feature/domain, not by type.** No god `utils/`, `types/`, `services/` buckets.
- **No flat tree.** Big folders get sub-folders; nest as area grows.
- **Clear module boundaries**, one-directional deps, no cycles.
- **Barrel/`index.ts`** only at intentional public boundaries, not everywhere.

## Build proof

Implementer must show typecheck + tests passing (`tsc --noEmit`, then project's test runner) before reporting done — plus lint when project runs it (`eslint . --max-warnings 0`).