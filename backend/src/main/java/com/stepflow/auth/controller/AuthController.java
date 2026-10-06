package com.stepflow.auth.controller;

import com.stepflow.auth.dto.*;
import com.stepflow.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final String deepLink;

    public AuthController(AuthService authService,
                          @Value("${app.deep-link}") String deepLink) {
        this.authService = authService;
        this.deepLink = deepLink;
    }

    @PostMapping("/register")
    public ResponseEntity<MessageResponse> register(@Valid @RequestBody RegisterRequest request) {        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new MessageResponse("Verification email sent. Open the link to finish signing in."));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody TokenRefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    /** Requires a valid access token; revokes the supplied refresh token. */
    @Operation(summary = "Log out", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.ok(new MessageResponse("Logged out successfully"));
    }

    /** Requires a valid access token; returns the current user. */
    @Operation(summary = "Current user", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        return ResponseEntity.ok(authService.me(authentication.getName()));
    }

    /**
     * The link that lands in the user's email (opened in a browser). It does NOT
     * consume the token — it just bounces the phone into the app with the token,
     * and the app calls /exchange to actually verify + log in. Public.
     */
    @Operation(summary = "Open the app from the email link")
    @GetMapping(value = "/verify", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> verify(@RequestParam("token") String token) {
        String appUrl = deepLink + "?token=" + token;   // e.g. stepflowapp://verify?token=...
        return ResponseEntity.ok(redirectPage(appUrl));
    }

    /**
     * Called by the app after it opens via the deep link. Consumes the token,
     * marks the user verified, and returns a real session (access + refresh).
     */
    @Operation(summary = "Exchange a verification token for a session")
    @PostMapping("/exchange")
    public ResponseEntity<AuthResponse> exchange(@Valid @RequestBody TokenExchangeRequest request) {
        return ResponseEntity.ok(authService.exchangeVerificationToken(request.token()));
    }

    private String redirectPage(String appUrl) {
        return "<!DOCTYPE html><html><head>"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
                + "<meta http-equiv=\"refresh\" content=\"0; url=" + appUrl + "\">"
                + "</head><body style=\"font-family:sans-serif;text-align:center;padding:48px;color:#1a1a24\">"
                + "<h2>Opening StepFlow&hellip;</h2>"
                + "<p><a href=\"" + appUrl + "\" style=\"color:#7c5cfc;font-weight:600\">Tap here if the app didn't open</a></p>"
                + "<script>window.location.href='" + appUrl + "';</script>"
                + "</body></html>";
    }
}
