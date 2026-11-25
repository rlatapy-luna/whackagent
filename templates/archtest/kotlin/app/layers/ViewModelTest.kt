package architecture.layers

import architecture.support.ArchRule
import architecture.support.Layers
import architecture.support.Violation
import architecture.support.check
import com.lemonappdev.konsist.api.Konsist
import com.lemonappdev.konsist.api.declaration.KoClassDeclaration
import kotlin.test.Test

/** architecture-app → Layers: the state holder never holds a Context, View or Composable. */
class ViewModelTest {
    private val rule: ArchRule = ArchRule(
        id = "view_model_no_android_ui",
        description = "presentation logic (`Layers.presentation`) never holds a Context, View, Activity, Fragment or UI toolkit type.",
        rationale = "State holders outlive screens: a held Context or View leaks, and ties logic to Android UI it can't test.",
        fix = "Expose state and take events; resources, navigation and toasts go through an injected interface or the screen. " +
            "See architecture-app → Layers.",
    )

    private val uiImports: List<String> = listOf(
        "android.content.Context", "android.app.Activity", "android.view.", "android.widget.",
        "androidx.fragment.", "androidx.appcompat.", "androidx.compose.ui.", "androidx.compose.foundation.",
        "androidx.compose.material",
    )

    private val uiTypes: Set<String> = setOf(
        "Context", "Activity", "ComponentActivity", "AppCompatActivity", "Fragment", "View", "AndroidViewModel",
    )

    @Test
    fun `view_model_no_android_ui`() {
        val violations: List<Violation> = Konsist.scopeFromProduction().classes()
            .filter { Layers.isPresentation(it.name) }
            .filter { holdsUi(it) }
            .map { Violation(it.name, it.location) }
        rule.check(violations)
    }

    private fun holdsUi(type: KoClassDeclaration): Boolean {
        val imports: Boolean = type.containingFile.imports.any { import -> uiImports.any { import.name.startsWith(it) } }
        val parents: Boolean = type.parents().any { baseName(it.name) in uiTypes }
        val fields: List<String> = type.properties().mapNotNull { it.type?.name } +
            type.primaryConstructor?.parameters.orEmpty().map { it.type.name }
        return imports || parents || fields.any { baseName(it) in uiTypes }
    }

    private fun baseName(type: String): String = type.substringBefore('<').substringBefore('(').substringAfterLast('.').trim('?', ' ')
}
