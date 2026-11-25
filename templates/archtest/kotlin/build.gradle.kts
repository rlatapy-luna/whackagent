// Lunabee architecture rules as unit tests (Konsist). JVM test module: reads sources, builds none of them.
// Run: ./gradlew :architecture:test
// Agents never edit this module: a rule changes through a task, module + test together.

plugins {
    kotlin("jvm")
}

dependencies {
    testImplementation("com.lemonappdev:konsist:0.18.1")
    testImplementation(kotlin("test"))
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
    // Konsist reads the whole project tree: rerun on every call, never served from cache.
    outputs.upToDateWhen { false }
    // Each failure prints its violations (`path:line: rule — name`), why and fix, no stack trace.
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStackTraces = false
    }
}
