package com.example.app.feature.profile.data

import com.example.app.feature.profile.data.remote.ProfileRemoteDataSource
import com.example.app.feature.profile.domain.model.User

class DefaultProfileRepository(private val remote: ProfileRemoteDataSource) : ProfileRepository {
    override suspend fun user(): User = remote.user().toModel()
}
