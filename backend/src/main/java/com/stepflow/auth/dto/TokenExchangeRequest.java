package com.stepflow.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** Sent by the app after it opens via the deep link, to trade the token for a session. */
public record TokenExchangeRequest(
        @NotBlank(message = "token is required")
        String token
) {
}
