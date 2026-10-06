package com.stepflow.auth.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A one-time email-verification token. Emailed to the user on registration;
 * consumed (deleted) when they click the link.
 */
@Entity
@Table(
    name = "verification_tokens",
    uniqueConstraints = @UniqueConstraint(name = "uk_verification_token", columnNames = "token")
)
public class VerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_verification_user"))
    private User user;

    @Column(nullable = false)
    private Instant expiryDate;

    public VerificationToken() {
    }

    public VerificationToken(String token, User user, Instant expiryDate) {
        this.token = token;
        this.user = user;
        this.expiryDate = expiryDate;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiryDate);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Instant getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(Instant expiryDate) {
        this.expiryDate = expiryDate;
    }
}
