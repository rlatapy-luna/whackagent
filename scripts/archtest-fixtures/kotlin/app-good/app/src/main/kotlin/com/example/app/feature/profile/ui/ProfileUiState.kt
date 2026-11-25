package com.example.app.feature.profile.ui

import com.example.app.feature.profile.domain.model.User

sealed interface ProfileUiState {
    data object Loading : ProfileUiState
    data class Loaded(val user: User) : ProfileUiState
}
