package architecture.support

/**
 * One architecture rule. [id] = test name = the convention module's `arch:` tag = baseline key.
 * [rationale] and [fix] cite the module section: a failure explains itself.
 */
data class ArchRule(
    val id: String,
    val description: String,
    val rationale: String,
    val fix: String,
)

/** A declaration breaking a rule. [name] = baseline entry, [location] = `path:line:column`. */
data class Violation(
    val name: String,
    val location: String,
)

/**
 * Fails on every violation the baseline doesn't hold, and on every baseline entry no violation
 * matches: stale, the rule passes there now, so the entry is deleted in the same change.
 */
fun ArchRule.check(violations: List<Violation>) {
    val frozen: List<String> = ArchBaseline.entries[id].orEmpty()
    val fresh: List<Violation> = violations.filter { it.name !in frozen }
    val stale: List<String> = frozen.filter { entry -> violations.none { it.name == entry } }
    val lines: List<String> = fresh.map { "${it.location}: $id — ${it.name}: $description" } +
        stale.map { "${ArchBaseline.PATH}: $id — stale baseline entry `$it`: rule passes now. Delete it." }
    if (lines.isNotEmpty()) {
        throw AssertionError((lines + "Why: $rationale" + "Fix: $fix").joinToString("\n"))
    }
}
