package com.example.app.feature.profile.data.remote

import com.example.app.feature.profile.domain.model.User

data class UserDto(val name: String) {
    fun toModel(): User = User(name)
}
