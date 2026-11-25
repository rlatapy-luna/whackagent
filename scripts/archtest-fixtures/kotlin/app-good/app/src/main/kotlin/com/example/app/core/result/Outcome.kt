package com.example.app.core.result

sealed class Outcome {
    class Success(val value: String) : Outcome()
    class Failure(val reason: String) : Outcome()
}
