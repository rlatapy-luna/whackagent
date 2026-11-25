package com.example.app.feature.profile.data

import com.example.app.feature.profile.domain.model.User

interface ProfileRepository {
    suspend fun user(): User
}
