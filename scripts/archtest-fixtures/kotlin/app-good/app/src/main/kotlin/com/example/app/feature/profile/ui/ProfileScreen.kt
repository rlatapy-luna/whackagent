package com.example.app.feature.profile.ui

import androidx.compose.runtime.Composable
import com.example.app.feature.profile.domain.model.User

@Composable
fun ProfileScreen(state: ProfileUiState, onRefresh: () -> Unit) {
    val user: User? = (state as? ProfileUiState.Loaded)?.user
}
