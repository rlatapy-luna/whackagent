package architecture.support

/**
 * The project's own names for its layers, set at setup from the screen pattern it already follows
 * (MVVM, MVI, presenter/reducer…). Rules read these, never hard-code a pattern.
 */
object Layers {
    /** Class name suffixes of presentation logic: the state holder a screen observes. */
    val presentation: List<String> = listOf("ViewModel")

    /** Package segments holding UI code: screens, components. */
    val ui: List<String> = listOf("ui")

    /** Package segments holding the data layer: repository implementations, data sources, DTOs, entities. */
    val data: List<String> = listOf("data")

    fun isPresentation(name: String): Boolean = presentation.any { name.endsWith(it) }

    fun segments(packageName: String?): List<String> = packageName.orEmpty().split('.')
}
