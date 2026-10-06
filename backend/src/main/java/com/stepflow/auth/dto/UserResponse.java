package com.stepflow.auth.dto;

import com.stepflow.auth.model.User;

/** Safe view of a user (never exposes the password hash). */
public record UserResponse(
        Long id,
        String name,
        String email,
        String role
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}
