package com.codeforge.auth.oauth2.entity;

import com.codeforge.auth.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "oauth_providers",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_oauth_user_provider", columnNames = {"user_id", "provider"}),
                @UniqueConstraint(name = "uk_oauth_provider_id", columnNames = {"provider", "provider_id"})
        },
        indexes = {
                @Index(name = "idx_oauth_providers_user_id", columnList = "user_id"),
                @Index(name = "idx_oauth_provider_provider_id", columnList = "provider, provider_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class OAuthProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Provider provider;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(name = "provider_email")
    private String providerEmail;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "linked_at", nullable = false)
    private LocalDateTime linkedAt;

    @PrePersist
    protected void onPersist() {
        if (linkedAt == null) {
            linkedAt = LocalDateTime.now();
        }
    }
}
