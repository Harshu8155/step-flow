package com.stepflow.auth.dto;

/** Returned by register / login / refresh. */
public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInMs,
        UserResponse user
) {
    public static AuthResponse of(String accessToken, String refreshToken, long expiresInMs, UserResponse user) {
        return new AuthResponse(accessToken, refreshToken, "Bearer", expiresInMs, user);
    }
}
