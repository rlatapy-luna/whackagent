package architecture.principles

import architecture.support.ArchRule
import architecture.support.Violation
import architecture.support.check
import com.lemonappdev.konsist.api.Konsist
import com.lemonappdev.konsist.api.declaration.KoClassDeclaration
import kotlin.test.Test

/** architecture-global → Design principles: composition over inheritance. */
class InheritanceTest {
    private val rule: ArchRule = ArchRule(
        id = "no_class_inheritance",
        description = "a class never extends an open or abstract class of this project (sealed parents excepted).",
        rationale = "Composition over inheritance: shared behavior = injected dependency or interface.",
        fix = "Data → data class, behavior → interface + constructor-injected implementation. " +
            "Closed one-of → sealed parent. See architecture-global → Design principles.",
    )

    @Test
    fun `no_class_inheritance`() {
        val classes: List<KoClassDeclaration> = Konsist.scopeFromProduction().classes()
        val byName: Map<String, KoClassDeclaration> = classes.associateBy { it.name }
        val violations: List<Violation> = classes
            .filter { type ->
                val parent: KoClassDeclaration? = type.parentClass?.name?.let { byName[baseName(it)] }
                parent != null && !parent.hasSealedModifier
            }
            .map { Violation(it.name, it.location) }
        rule.check(violations)
    }

    private fun baseName(type: String): String = type.substringBefore('<').substringAfterLast('.').trim()
}
