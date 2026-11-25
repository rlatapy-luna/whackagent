package com.example.app.feature.profile.domain

sealed interface ProfileError {
    data object Offline : ProfileError
    data class NotFoundError(val id: String) : ProfileError
}
