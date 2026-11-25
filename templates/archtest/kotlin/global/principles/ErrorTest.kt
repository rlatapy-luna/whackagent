package architecture.principles

import architecture.support.ArchRule
import architecture.support.Violation
import architecture.support.check
import com.lemonappdev.konsist.api.Konsist
import com.lemonappdev.konsist.api.declaration.KoClassDeclaration
import com.lemonappdev.konsist.api.declaration.KoInterfaceDeclaration
import com.lemonappdev.konsist.api.container.KoScope
import kotlin.test.Test

/** architecture-global → Design principles: errors as types for expected failures. */
class ErrorTest {
    private val rule: ArchRule = ArchRule(
        id = "error_is_sealed",
        description = "every `FooError` type is sealed (or an enum, or a case of a sealed error).",
        rationale = "Expected failures are closed sets: callers `when` over every case, no codes or sentinels.",
        fix = "Declare `sealed interface FooError`, one subtype per failure, data as properties. " +
            "Programmer errors stay exceptions (`FooException`). See architecture-global → Design principles.",
    )

    private val throwables: Set<String> = setOf("Throwable", "Exception", "RuntimeException", "Error", "IllegalStateException")

    @Test
    fun `error_is_sealed`() {
        val scope: KoScope = Konsist.scopeFromProduction()
        val classes: List<KoClassDeclaration> = scope.classes()
        val interfaces: List<KoInterfaceDeclaration> = scope.interfaces()
        val sealed: Set<String> = (classes.filter { it.hasSealedModifier }.map { it.name } +
            interfaces.filter { it.hasSealedModifier }.map { it.name }).toSet()
        val classViolations: List<Violation> = classes
            .filter { it.name.endsWith("Error") }
            .filterNot { type -> type.parents().any { baseName(it.name) in throwables } }
            .filterNot { type ->
                type.hasSealedModifier || type.hasEnumModifier || type.parents().any { baseName(it.name) in sealed }
            }
            .map { Violation(it.name, it.location) }
        val interfaceViolations: List<Violation> = interfaces
            .filter { it.name.endsWith("Error") }
            .filterNot { type -> type.hasSealedModifier || type.parents().any { baseName(it.name) in sealed } }
            .map { Violation(it.name, it.location) }
        rule.check(classViolations + interfaceViolations)
    }

    private fun baseName(type: String): String = type.substringBefore('<').substringBefore('(').substringAfterLast('.').trim()
}
