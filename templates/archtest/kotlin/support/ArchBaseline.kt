package architecture.support

/**
 * Legacy violations frozen at setup, per rule id: type names (file names for file rules).
 * Written at setup only (agent setup, or by hand). Agents may only delete a stale entry.
 * Shrinks, never grows: an entry that now passes, or matches nothing, fails the run.
 */
object ArchBaseline {
    const val PATH: String = "architecture/src/test/kotlin/architecture/support/ArchBaseline.kt"

    val entries: Map<String, List<String>> = mapOf()
}
