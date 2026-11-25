package com.example.app.feature.profile.data.remote

interface ProfileRemoteDataSource {
    suspend fun user(): UserDto
}
