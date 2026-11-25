package architecture.layers

import architecture.support.ArchRule
import architecture.support.Layers
import architecture.support.Violation
import architecture.support.check
import com.lemonappdev.konsist.api.Konsist
import com.lemonappdev.konsist.api.declaration.KoFileDeclaration
import com.lemonappdev.konsist.api.declaration.KoImportDeclaration
import kotlin.test.Test

/** architecture-app → Layers: UI never talks to the data layer. */
class UiLayerTest {
    private val rule: ArchRule = ArchRule(
        id = "ui_no_data_import",
        description = "UI code (`Layers.ui` packages, presentation classes excepted) never imports the data layer: " +
            "`Layers.data` packages, data sources, DTOs, entities.",
        rationale = "UI renders state and sends events; the state holder reaches data through the repository.",
        fix = "Map what the screen needs into its UI state in the state holder; the screen imports domain or UI models only. " +
            "See architecture-app → Layers.",
    )

    private val dataSuffixes: List<String> = listOf("DataSource", "Dto", "DTO", "Entity", "Dao", "RepositoryImpl")

    @Test
    fun `ui_no_data_import`() {
        val violations: List<Violation> = Konsist.scopeFromProduction().files
            .filter { file -> Layers.segments(file.packagee?.name).any { it in Layers.ui } }
            .filterNot { file -> file.classes().any { Layers.isPresentation(it.name) } }
            .mapNotNull { file -> dataImport(file)?.let { Violation(file.nameWithExtension, it.location) } }
        rule.check(violations)
    }

    private fun dataImport(file: KoFileDeclaration): KoImportDeclaration? = file.imports.firstOrNull { import ->
        val parts: List<String> = import.name.split('.')
        parts.dropLast(1).any { it in Layers.data } || dataSuffixes.any { parts.last().endsWith(it) }
    }
}
