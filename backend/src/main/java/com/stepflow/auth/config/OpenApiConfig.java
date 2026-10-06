package com.stepflow.auth.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger metadata + a JWT bearer scheme so the Swagger UI shows an
 * "Authorize" button. Paste an access token there to call /me and /logout.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "StepFlow Auth API",
                version = "v1",
                description = "Registration, login, logout and token refresh for the StepFlow app."
        ),
        servers = @Server(url = "http://localhost:8080", description = "Local")
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Paste the accessToken returned by /login or /register (no 'Bearer ' prefix)."
)
public class OpenApiConfig {
}
