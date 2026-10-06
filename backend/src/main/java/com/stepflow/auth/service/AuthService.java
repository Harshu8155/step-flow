package com.stepflow.auth.service;

import com.stepflow.auth.dto.*;
import com.stepflow.auth.model.RefreshToken;
import com.stepflow.auth.model.Role;
import com.stepflow.auth.model.User;
import com.stepflow.auth.model.VerificationToken;
import com.stepflow.auth.repository.UserRepository;
import com.stepflow.auth.repository.VerificationTokenRepository;
import com.stepflow.auth.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final VerificationTokenRepository verificationTokenRepository;
    private final EmailService emailService;
    private final String baseUrl;
    private final long verificationExpirationMs;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       RefreshTokenService refreshTokenService,
                       VerificationTokenRepository verificationTokenRepository,
                       EmailService emailService,
                       @Value("${app.base-url}") String baseUrl,
                       @Value("${app.verification-expiration-ms}") long verificationExpirationMs) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.verificationTokenRepository = verificationTokenRepository;
        this.emailService = emailService;
        this.baseUrl = baseUrl;
        this.verificationExpirationMs = verificationExpirationMs;
    }

    /** Creates the account and emails the magic link. Does NOT log the user in —
     *  clicking the link (via /exchange) is what starts the session. */
    public void register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        User user = new User(
                request.name().trim(),
                request.email().trim().toLowerCase(),
                passwordEncoder.encode(request.password()),
                Role.USER
        );
        userRepository.save(user);

        sendVerificationEmail(user);
    }

    /** Creates a one-time verification token and emails the deep-link to the user. */
    private void sendVerificationEmail(User user) {
        String tokenValue = UUID.randomUUID().toString();
        VerificationToken token = new VerificationToken(
                tokenValue, user, Instant.now().plusMillis(verificationExpirationMs));
        verificationTokenRepository.save(token);

        String link = baseUrl + "/api/auth/verify?token=" + tokenValue;
        emailService.sendVerificationEmail(user.getEmail(), user.getName(), link);
    }

    /**
     * Consumes a verification token (from the deep link): marks the user verified,
     * deletes the token (one-time use), and logs them in by issuing a fresh session.
     */
    @Transactional
    public AuthResponse exchangeVerificationToken(String tokenValue) {
        VerificationToken token = verificationTokenRepository.findByToken(tokenValue).orElse(null);
        if (token == null || token.isExpired()) {
            if (token != null) verificationTokenRepository.delete(token);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Link is invalid or has expired");
        }
        User user = token.getUser();
        user.setVerified(true);
        userRepository.save(user);
        verificationTokenRepository.delete(token);
        return issueTokens(user);
    }

    public AuthResponse login(LoginRequest request) {
        // Throws BadCredentialsException (-> 401) if email/password don't match.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email().trim().toLowerCase(),
                        request.password()
                )
        );

        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        return issueTokens(user);
    }

    /** Exchange a valid refresh token for a fresh access token (refresh token is rotated). */
    public AuthResponse refresh(String refreshTokenValue) {
        RefreshToken current = refreshTokenService.verifyUsable(refreshTokenValue);
        User user = current.getUser();

        // Rotate: revoke the used token and issue a new pair.
        refreshTokenService.revoke(refreshTokenValue);
        return issueTokens(user);
    }

    public void logout(String refreshTokenValue) {
        refreshTokenService.revoke(refreshTokenValue);
    }

    public UserResponse me(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return UserResponse.from(user);
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user.getEmail());
        RefreshToken refreshToken = refreshTokenService.create(user);
        return AuthResponse.of(
                accessToken,
                refreshToken.getToken(),
                jwtService.getAccessExpirationMs(),
                UserResponse.from(user)
        );
    }
}
