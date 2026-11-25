package com.example.app.feature.profile.ui

import androidx.lifecycle.ViewModel
import com.example.app.feature.profile.data.ProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ProfileViewModel(private val repository: ProfileRepository) : ViewModel() {
    private val _state: MutableStateFlow<ProfileUiState> = MutableStateFlow(ProfileUiState.Loading)
    val state: StateFlow<ProfileUiState> = _state
}
