package architecture.filetree

import architecture.support.ArchRule
import architecture.support.Layers
import architecture.support.Violation
import architecture.support.check
import com.lemonappdev.konsist.api.Konsist
import kotlin.test.Test

/** architecture-app → File tree: group by feature, never by type. */
class TypeBucketTest {
    private val rule: ArchRule = ArchRule(
        id = "no_type_bucket",
        description = "no type-bucket package (`viewmodels`, `repositories`, `models`…): code sits in its feature.",
        rationale = "Each feature owns its screen, state holder, data and models; type buckets grow into junk drawers.",
        fix = "Move the file into its feature package (`feature/<name>/…`), or `core/` for cross-cutting infra. " +
            "See architecture-app → File tree.",
    )

    private val buckets: Set<String> = setOf(
        "viewmodels", "presenters", "repositories", "usecases", "datasources", "screens", "models", "helpers", "managers",
    )

    @Test
    fun `no_type_bucket`() {
        val violations: List<Violation> = Konsist.scopeFromProduction().files
            .filter { file -> Layers.segments(file.packagee?.name).any { it in buckets } }
            .map { Violation(it.nameWithExtension, it.path) }
        rule.check(violations)
    }
}
