# Low Level Design (LLD)

**Project:** CodeForge — AI-Powered Coding Assessment, Contest Management & Learning Platform
**Version:** 1.0
**Status:** Draft
**Date:** 2026-06-19
**Based on:** HLD v1.5

---

## Table of Contents

1. [ER Diagram](#1-er-diagram)
2. [Class Diagrams](#2-class-diagrams)
3. [Sequence Diagrams](#3-sequence-diagrams)
4. [API Contracts](#4-api-contracts)
5. [Design Patterns](#5-design-patterns)

---

## 1. ER Diagram

> Each service owns its own isolated PostgreSQL database. Cross-service references use stored UUIDs — no foreign keys across databases. All entities include audit columns (`created_at`, `updated_at`, `created_by`) unless otherwise noted.

---

### 1.1 Auth Database (`auth_db`)

```
┌──────────────────────────────────────────────────────────────────┐
│                            users                                 │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ full_name        │ VARCHAR(100)  NOT NULL                         │
│ email            │ VARCHAR(255)  UNIQUE  NOT NULL                 │
│ password         │ VARCHAR(255)  NULL  (BCrypt / NULL for OAuth)  │
│ role             │ ENUM(STUDENT, ORGANIZER, ADMIN)  DEFAULT STUDENT│
│ status           │ ENUM(ACTIVE, SUSPENDED, INACTIVE) DEFAULT ACTIVE│
│ avatar_url       │ VARCHAR(500)  NULL                             │
│ auth_type        │ ENUM(LOCAL, OAUTH, BOTH)  DEFAULT LOCAL        │
│ created_at       │ TIMESTAMP  NOT NULL                            │
│ updated_at       │ TIMESTAMP  NOT NULL                            │
│ created_by       │ VARCHAR(255)  (system or email)                │
└──────────────────────────────────────────────────────────────────┘
         │ 1
         │
         │ N
┌──────────────────────────────────────────────────────────────────┐
│                        oauth_providers                           │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ user_id          │ UUID  FK → users.id  NOT NULL                  │
│ provider         │ ENUM(GOOGLE, GITHUB)  NOT NULL                 │
│ provider_id      │ VARCHAR(255)  NOT NULL                         │
│ provider_email   │ VARCHAR(255)                                   │
│ avatar_url       │ VARCHAR(500)                                   │
│ linked_at        │ TIMESTAMP  NOT NULL                            │
│                  │ UNIQUE(user_id, provider)                      │
│                  │ UNIQUE(provider, provider_id)                  │
└──────────────────────────────────────────────────────────────────┘

         │ 1
         │
         │ N
┌──────────────────────────────────────────────────────────────────┐
│                        refresh_tokens                            │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ user_id          │ UUID  FK → users.id  NOT NULL                  │
│ token            │ TEXT  NOT NULL                                 │
│ expires_at       │ TIMESTAMP  NOT NULL                            │
│ revoked          │ BOOLEAN  DEFAULT FALSE                         │
│ created_at       │ TIMESTAMP  NOT NULL                            │
└──────────────────────────────────────────────────────────────────┘

Relationships:
  users  1──N  oauth_providers  (one user, many linked OAuth providers)
  users  1──N  refresh_tokens   (one user, many refresh tokens over time)

Indexes:
  users(email)
  oauth_providers(user_id)
  oauth_providers(provider, provider_id)
  refresh_tokens(user_id)
  refresh_tokens(token)
```

---

### 1.2 Contest Database (`contest_db`)

```
┌──────────────────────────────────────────────────────────────────┐
│                           problems                               │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ title            │ VARCHAR(200)  NOT NULL                         │
│ description      │ TEXT  NOT NULL  (Markdown)                     │
│ difficulty       │ ENUM(EASY, MEDIUM, HARD)  NOT NULL             │
│ category         │ ENUM(ARRAYS, STRINGS, LINKED_LIST, TREES,      │
│                  │      GRAPHS, DYNAMIC_PROGRAMMING, GREEDY,      │
│                  │      BACKTRACKING, SORTING, SEARCHING,         │
│                  │      MATH, SQL, SYSTEM_DESIGN, MISCELLANEOUS)  │
│ time_limit       │ INTEGER  NOT NULL  (seconds, 1–10)             │
│ memory_limit     │ INTEGER  NOT NULL  (MB, 16–512)                │
│ input_format     │ TEXT  NOT NULL                                 │
│ output_format    │ TEXT  NOT NULL                                 │
│ constraints_text │ TEXT  NOT NULL                                 │
│ explanation      │ TEXT  NULL                                     │
│ tags             │ VARCHAR(500)  NULL  (comma-separated, max 10)  │
│ visibility       │ ENUM(PUBLIC, PRIVATE)  NOT NULL                │
│ status           │ ENUM(DRAFT, PUBLISHED)  DEFAULT DRAFT          │
│ created_by       │ UUID  NOT NULL  (user_id from auth_db, no FK)  │
│ created_at       │ TIMESTAMP  NOT NULL                            │
│ updated_at       │ TIMESTAMP  NOT NULL                            │
│ deleted_at       │ TIMESTAMP  NULL  (soft delete)                 │
└──────────────────────────────────────────────────────────────────┘
         │ 1
         │
         │ N
┌──────────────────────────────────────────────────────────────────┐
│                          test_cases                              │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ problem_id       │ UUID  FK → problems.id  NOT NULL               │
│ input            │ TEXT  NOT NULL                                 │
│ expected_output  │ TEXT  NOT NULL                                 │
│ type             │ ENUM(SAMPLE, HIDDEN)  NOT NULL                 │
│ score_weight     │ INTEGER  DEFAULT 1                             │
│ created_at       │ TIMESTAMP  NOT NULL                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                           contests                               │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ title            │ VARCHAR(200)  NOT NULL                         │
│ description      │ TEXT  (Markdown, max 5000 chars)               │
│ start_time       │ TIMESTAMP  NOT NULL                            │
│ end_time         │ TIMESTAMP  NOT NULL                            │
│ status           │ ENUM(DRAFT, SCHEDULED, ACTIVE,                 │
│                  │      COMPLETED, CANCELLED)  DEFAULT DRAFT      │
│ visibility       │ ENUM(PUBLIC, PRIVATE)  NOT NULL                │
│ reg_type         │ ENUM(OPEN, INVITE_ONLY)  NOT NULL              │
│ scoring_mode     │ ENUM(POINTS, PENALTY_TIME, PERCENTAGE) NOT NULL│
│ max_participants │ INTEGER  NULL  (unlimited if null)             │
│ invite_code      │ VARCHAR(8)  UNIQUE  NULL                       │
│ invite_link      │ VARCHAR(255)  NULL                             │
│ host_id          │ UUID  NOT NULL  (user_id from auth_db, no FK)  │
│ created_by       │ UUID  NOT NULL  (user_id from auth_db, no FK)  │
│ created_at       │ TIMESTAMP  NOT NULL                            │
│ updated_at       │ TIMESTAMP  NOT NULL                            │
│ deleted_at       │ TIMESTAMP  NULL  (soft delete)                 │
└──────────────────────────────────────────────────────────────────┘
         │ 1                                    │ 1
         │                                      │
         │ N                                    │ N
┌──────────────────────────┐      ┌─────────────────────────────────┐
│     contest_problems     │      │       contest_participants       │
├──────────┬───────────────┤      ├──────────────┬──────────────────┤
│ id       │ UUID  PK      │      │ id           │ UUID  PK         │
│contest_id│ UUID  FK→     │      │ contest_id   │ UUID  FK→        │
│          │ contests.id   │      │              │ contests.id      │
│problem_id│ UUID  FK→     │      │ user_id      │ UUID  NOT NULL   │
│          │ problems.id   │      │              │ (no FK cross-db) │
│ points   │ INTEGER       │      │ registered_at│ TIMESTAMP        │
│sequence_no│ INTEGER      │      │UNIQUE(contest_id, user_id)      │
│UNIQUE(contest_id,        │      └─────────────────────────────────┘
│  problem_id)             │
└──────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                          leaderboard                             │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ contest_id       │ UUID  FK → contests.id  NOT NULL               │
│ user_id          │ UUID  NOT NULL  (user_id from auth_db, no FK)  │
│ rank             │ INTEGER  NOT NULL                              │
│ score            │ INTEGER  DEFAULT 0                             │
│ penalty_time     │ INTEGER  DEFAULT 0  (minutes)                  │
│ problems_solved  │ INTEGER  DEFAULT 0                             │
│ last_ac_time     │ TIMESTAMP  NULL                                │
│ updated_at       │ TIMESTAMP  NOT NULL                            │
│                  │ UNIQUE(contest_id, user_id)                    │
└──────────────────────────────────────────────────────────────────┘

Relationships:
  problems       1──N  test_cases          (one problem, many test cases)
  contests       1──N  contest_problems    (one contest, many problems via join)
  problems       1──N  contest_problems    (one problem, used in many contests)
  contests       1──N  contest_participants (one contest, many participants)
  contests       1──N  leaderboard        (one contest, one row per participant)

Indexes:
  problems(created_by), problems(status), problems(visibility)
  test_cases(problem_id)
  contests(status), contests(invite_code), contests(host_id)
  contest_problems(contest_id), contest_problems(problem_id)
  contest_participants(contest_id, user_id)
  leaderboard(contest_id, rank)
```

---

### 1.3 Execution Database (`execution_db`)

```
┌──────────────────────────────────────────────────────────────────┐
│                          submissions                             │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ user_id          │ UUID  NOT NULL  (from auth_db, no FK)          │
│ problem_id       │ UUID  NOT NULL  (from contest_db, no FK)       │
│ contest_id       │ UUID  NULL      (from contest_db, no FK)       │
│ language         │ ENUM(JAVA, PYTHON, CPP, JAVASCRIPT)  NOT NULL  │
│ source_code      │ TEXT  NOT NULL                                 │
│ verdict          │ ENUM(PENDING, AC, WA, CE, RE, TLE, MLE)        │
│                  │ DEFAULT PENDING                                │
│ execution_time   │ INTEGER  NULL  (ms)                            │
│ memory_used      │ INTEGER  NULL  (MB)                            │
│ error_message    │ TEXT  NULL                                     │
│ submitted_at     │ TIMESTAMP  NOT NULL                            │
│ created_at       │ TIMESTAMP  NOT NULL                            │
│ updated_at       │ TIMESTAMP  NOT NULL                            │
│ created_by       │ VARCHAR(255)  NOT NULL                         │
└──────────────────────────────────────────────────────────────────┘
         │ 1
         │
         │ N
┌──────────────────────────────────────────────────────────────────┐
│                     submission_test_results                      │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ submission_id    │ UUID  FK → submissions.id  NOT NULL            │
│ test_case_id     │ UUID  NOT NULL  (from contest_db, no FK)       │
│ passed           │ BOOLEAN  NOT NULL                              │
│ execution_time   │ INTEGER  NOT NULL  (ms)                        │
│ memory_used      │ INTEGER  NOT NULL  (MB)                        │
│ actual_output    │ TEXT  NULL  (stored for debugging)             │
│ created_at       │ TIMESTAMP  NOT NULL                            │
└──────────────────────────────────────────────────────────────────┘

Relationships:
  submissions  1──N  submission_test_results

Indexes:
  submissions(user_id), submissions(problem_id), submissions(contest_id)
  submissions(verdict), submissions(submitted_at)
  submission_test_results(submission_id)
```

---

### 1.4 AI Database (`ai_db`)

```
┌──────────────────────────────────────────────────────────────────┐
│                          ai_reviews                              │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ submission_id    │ UUID  NOT NULL  (from execution_db, no FK)     │
│ user_id          │ UUID  NOT NULL  (from auth_db, no FK)          │
│ quality_score    │ INTEGER  NULL  (0–100)                         │
│ time_complexity  │ VARCHAR(50)  NULL  (e.g., O(n log n))          │
│ space_complexity │ VARCHAR(50)  NULL  (e.g., O(n))                │
│ feedback         │ JSONB  NULL  (structured sections array)       │
│ optimization_tips│ JSONB  NULL  (array of strings)                │
│ status           │ ENUM(PENDING, COMPLETED, FAILED)  DEFAULT PENDING│
│ created_at       │ TIMESTAMP  NOT NULL                            │
│ updated_at       │ TIMESTAMP  NOT NULL                            │
│ created_by       │ VARCHAR(255)  NOT NULL                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         hint_requests                            │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ user_id          │ UUID  NOT NULL  (from auth_db, no FK)          │
│ problem_id       │ UUID  NOT NULL  (from contest_db, no FK)       │
│ hint_level       │ INTEGER  NOT NULL  (1 = gentle, 2 = moderate,  │
│                  │                    3 = near-solution)          │
│ hint_content     │ TEXT  NOT NULL                                 │
│ created_at       │ TIMESTAMP  NOT NULL                            │
│                  │ UNIQUE(user_id, problem_id, hint_level)        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       learning_roadmaps                          │
├──────────────────┬───────────────────────────────────────────────┤
│ id               │ UUID  PK                                       │
│ user_id          │ UUID  UNIQUE  NOT NULL  (from auth_db, no FK)  │
│ weak_topics      │ JSONB  NOT NULL  (array of topic strings)      │
│ recommended      │ JSONB  NOT NULL  (array of learning resources) │
│ practice_problems│ JSONB  NOT NULL  (array of problem IDs)        │
│ generated_at     │ TIMESTAMP  NOT NULL                            │
│ refreshed_at     │ TIMESTAMP  NULL                                │
└──────────────────────────────────────────────────────────────────┘

Indexes:
  ai_reviews(submission_id)
  ai_reviews(user_id)
  hint_requests(user_id, problem_id)
  learning_roadmaps(user_id)
```

---

### 1.5 Cross-Service Reference Summary

```
auth_db.users.id  ─────── referenced as ────────►  contest_db.problems.created_by
                                                    contest_db.contests.host_id
                                                    contest_db.contests.created_by
                                                    contest_db.contest_participants.user_id
                                                    contest_db.leaderboard.user_id
                                                    execution_db.submissions.user_id
                                                    ai_db.ai_reviews.user_id
                                                    ai_db.hint_requests.user_id
                                                    ai_db.learning_roadmaps.user_id

contest_db.problems.id  ── referenced as ─────────► execution_db.submissions.problem_id
                                                    ai_db.hint_requests.problem_id
                                                    execution_db.submission_test_results.test_case_id

contest_db.contests.id  ── referenced as ─────────► execution_db.submissions.contest_id

execution_db.submissions.id  referenced as ────────► ai_db.ai_reviews.submission_id

► These are UUID references only — NO database-level foreign keys across services.
  Referential integrity is enforced at the application layer.
```

---

## 2. Class Diagrams

---

### 2.1 Auth Service

#### Entities

```java
// ── users table
@Entity @Table(name = "users")
class User {
    UUID          id;              // PK, generated UUID
    String        fullName;        // NOT NULL
    String        email;           // UNIQUE, NOT NULL
    String        password;        // nullable (BCrypt or NULL for OAuth)
    Role          role;            // ENUM: STUDENT | ORGANIZER | ADMIN
    UserStatus    status;          // ENUM: ACTIVE | SUSPENDED | INACTIVE
    String        avatarUrl;       // nullable
    AuthType      authType;        // ENUM: LOCAL | OAUTH | BOTH
    // audit: createdAt, updatedAt, createdBy (via @EntityListeners)
}

// ── oauth_providers table
@Entity @Table(name = "oauth_providers")
class OAuthProvider {
    UUID          id;
    User          user;            // FK → users, @ManyToOne
    Provider      provider;        // ENUM: GOOGLE | GITHUB
    String        providerId;      // Provider's user ID
    String        providerEmail;
    String        avatarUrl;
    LocalDateTime linkedAt;
    // UNIQUE constraint: (user_id, provider) and (provider, provider_id)
}

// ── refresh_tokens table
@Entity @Table(name = "refresh_tokens")
class RefreshToken {
    UUID          id;
    User          user;            // FK → users, @ManyToOne
    String        token;           // hashed token string
    LocalDateTime expiresAt;
    boolean       revoked;
    LocalDateTime createdAt;
}

// Enumerations
enum Role          { STUDENT, ORGANIZER, ADMIN }
enum UserStatus    { ACTIVE, SUSPENDED, INACTIVE }
enum AuthType      { LOCAL, OAUTH, BOTH }
enum Provider      { GOOGLE, GITHUB }
```

#### Repositories

```java
interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User>  findByEmail(String email);
    boolean         existsByEmail(String email);
}

interface OAuthProviderRepository extends JpaRepository<OAuthProvider, UUID> {
    Optional<OAuthProvider> findByProviderAndProviderId(Provider p, String id);
    List<OAuthProvider>     findByUserId(UUID userId);
    Optional<OAuthProvider> findByUserIdAndProvider(UUID userId, Provider p);
    boolean                 existsByUserIdAndProvider(UUID userId, Provider p);
    long                    countByUserId(UUID userId);
}

interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);
    void                   revokeAllByUserId(UUID userId);  // @Modifying UPDATE SET revoked=true
    void                   deleteByUserId(UUID userId);
}
```

#### Service Interfaces & Implementations

```java
// ── UserService
interface UserService {
    TokenResponse    register(RegisterRequest req);   // auto-login: returns token on signup
    TokenResponse    login(LoginRequest req);
    TokenResponse    refreshToken(String refreshToken);
    void             logout(String accessToken, String refreshToken);
    UserResponse     getProfile(UUID userId);
    UserResponse     updateProfile(UUID userId, UpdateProfileRequest req);
    TokenResponse    upgradeToOrganizer(UUID userId);
}

@Service @Transactional
class UserServiceImpl implements UserService {
    private final UserRepository         userRepo;
    private final RefreshTokenRepository tokenRepo;
    private final JwtService             jwtService;
    private final PasswordEncoder        passwordEncoder;
    private final UserMapper             userMapper;
    // ... implementations
}

// ── OAuth2Service
interface OAuth2Service {
    TokenResponse              handleOAuthCallback(Provider provider, OAuth2UserInfo info);
    void                       linkProvider(UUID userId, Provider provider, OAuth2UserInfo info);
    void                       unlinkProvider(UUID userId, Provider provider);
    List<OAuthProviderResponse> getLinkedProviders(UUID userId);
}

@Service @Transactional
class OAuth2ServiceImpl implements OAuth2Service {
    private final UserRepository          userRepo;
    private final OAuthProviderRepository oauthRepo;
    private final RefreshTokenRepository  tokenRepo;
    private final JwtService              jwtService;
    private final UserMapper              userMapper;
}
```

#### Security Classes

```java
// ── JwtService
@Service
class JwtService {
    private final JwtProperties jwtProperties;         // binds app.jwt.* config
    private final StringRedisTemplate redisTemplate;   // @Autowired(required = false)

    String     generateAccessToken(User user);         // 15-min expiry via jwtProperties
    String     generateRefreshToken();                 // opaque UUID
    Claims     validateToken(String token);
    UUID       extractUserId(String token);
    String     extractRole(String token);
    boolean    isTokenBlacklisted(String token);       // checks Redis (no-op if Redis unavailable)
    void       blacklistToken(String token);           // auto-calculates TTL from token expiry
    long       getRefreshTokenExpiryMs();              // delegates to jwtProperties
}

// ── GatewayAuthFilter
// Reads X-User-Id, X-User-Email, X-User-Role headers injected by the API Gateway
// after JWT validation and creates a SecurityContext for downstream @PreAuthorize checks.
// All downstream services (Auth, Contest, Execution, AI) use this same pattern.
@Component
class GatewayAuthFilter extends OncePerRequestFilter {
    // Reads X-User-Id and X-User-Role headers from the request
    // Creates UsernamePasswordAuthenticationToken with SimpleGrantedAuthority
    // Sets SecurityContextHolder.getContext().setAuthentication(...)
    // If headers are missing (public routes), filter passes through without setting context
}

// ── SecurityConfig
@Configuration @EnableWebSecurity @EnableMethodSecurity
class SecurityConfig {
    private final GatewayAuthFilter                    gatewayAuthFilter;
    private final CustomOAuth2UserService              customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler    oAuth2SuccessHandler;
    private final OAuth2AuthenticationFailureHandler    oAuth2FailureHandler;

    SecurityFilterChain filterChain(HttpSecurity http);
    // Session policy: IF_REQUIRED (not STATELESS) — OAuth2 login flow
    //   requires a session for the authorization request repository.
    // Adds GatewayAuthFilter before UsernamePasswordAuthenticationFilter.
    // Permits: /auth/register, /auth/login, /auth/refresh, /auth/oauth2/**, /actuator/health
    // Configures oauth2Login with authorization/redirection/userInfo endpoints,
    //   success handler (issues JWT), failure handler (returns error).

    AuthorizationRequestRepository<OAuth2AuthorizationRequest> authorizationRequestRepository();
    PasswordEncoder     passwordEncoder();             // BCryptPasswordEncoder(10)
}
```

#### DTOs

```java
// Request DTOs (Java Records with Bean Validation)
record RegisterRequest(
    @NotBlank @Size(min=2, max=100) String fullName,
    @NotBlank @Email                String email,
    @NotBlank @Size(min=8)
    @Pattern(regexp=".*[A-Z].*")
    @Pattern(regexp=".*[0-9].*")
    @Pattern(regexp=".*[!@#$%^&*].*") String password
) {}

record LoginRequest(
    @NotBlank @Email String email,
    @NotBlank        String password
) {}

record UpdateProfileRequest(
    @Size(min=2, max=100) String fullName,     // optional
    String currentPassword,                    // required if changing password
    @Size(min=8) String newPassword            // optional
) {}

record RefreshTokenRequest(
    @NotBlank String refreshToken
) {}

// Response DTOs
record UserResponse(
    UUID   id,
    String fullName,
    String email,
    String role,
    String status,
    String avatarUrl,
    String authType,
    LocalDateTime createdAt
) {}

record TokenResponse(
    String accessToken,
    String refreshToken,
    UserResponse user
) {}

record OAuthProviderResponse(
    String provider,
    String providerEmail,
    LocalDateTime linkedAt
) {}
```

#### Controllers

```java
@RestController @RequestMapping("/auth") @RequiredArgsConstructor
class UserController {
    POST   /auth/register            → register(RegisterRequest)       → ApiResponse<TokenResponse>
    POST   /auth/login               → login(LoginRequest)             → ApiResponse<TokenResponse>
    POST   /auth/refresh             → refresh(RefreshTokenRequest)    → ApiResponse<TokenResponse>
    POST   /auth/logout              → logout(Authorization header, RefreshTokenRequest) → ApiResponse<Void>
    GET    /auth/profile             → getProfile(X-User-Id header)    → ApiResponse<UserResponse>
    PATCH  /auth/profile             → updateProfile(UpdateProfileRequest) → ApiResponse<UserResponse>
    PATCH  /auth/upgrade-to-organizer → upgrade(X-User-Id header)     → ApiResponse<TokenResponse>
}

@RestController @RequestMapping("/auth/oauth2") @RequiredArgsConstructor
class OAuth2Controller {
    // Authorize & Callback handled by Spring Security OAuth2 Login (SecurityConfig),
    // NOT by explicit controller methods:
    //   GET  /auth/oauth2/authorize/{provider} → redirects to provider (Spring Security)
    //   GET  /auth/oauth2/callback/{provider}  → exchanges code → OAuth2SuccessHandler (Spring Security)

    // Explicit endpoints:
    POST  /auth/oauth2/link/{provider}        → linkProvider(X-User-Id, provider, OAuth2UserInfo body) → ApiResponse<Void>
    DELETE /auth/oauth2/unlink/{provider}     → unlinkProvider(X-User-Id, provider) → ApiResponse<Void>
    GET   /auth/oauth2/providers              → getLinkedProviders(X-User-Id) → ApiResponse<List<OAuthProviderResponse>>
}
```

---

### 2.2 Contest Service

#### Entities

```java
// ── problems table
@Entity @Table(name = "problems")
class Problem {
    UUID            id;
    String          title;           // VARCHAR(200)
    String          description;     // TEXT (Markdown)
    Difficulty      difficulty;      // ENUM: EASY | MEDIUM | HARD
    ProblemCategory category;
    int             timeLimit;       // seconds
    int             memoryLimit;     // MB
    String          inputFormat;
    String          outputFormat;
    String          constraintsText;
    String          explanation;     // nullable
    String          tags;            // comma-separated
    Visibility      visibility;      // ENUM: PUBLIC | PRIVATE
    ProblemStatus   status;          // ENUM: DRAFT | PUBLISHED
    UUID            createdBy;       // user_id from auth_db (no FK)
    LocalDateTime   deletedAt;       // soft delete
    List<TestCase>  testCases;       // @OneToMany
    // audit: createdAt, updatedAt, createdBy (auditing field)
}

// ── test_cases table
@Entity @Table(name = "test_cases")
class TestCase {
    UUID         id;
    Problem      problem;        // @ManyToOne
    String       input;
    String       expectedOutput;
    TestCaseType type;           // ENUM: SAMPLE | HIDDEN
    int          scoreWeight;
    LocalDateTime createdAt;
}

// ── contests table
@Entity @Table(name = "contests")
class Contest {
    UUID          id;
    String        title;
    String        description;
    LocalDateTime startTime;
    LocalDateTime endTime;
    ContestStatus status;        // ENUM: DRAFT|SCHEDULED|ACTIVE|COMPLETED|CANCELLED
    Visibility    visibility;
    RegType       regType;       // ENUM: OPEN | INVITE_ONLY
    ScoringMode   scoringMode;   // ENUM: POINTS | PENALTY_TIME | PERCENTAGE
    Integer       maxParticipants;  // nullable
    String        inviteCode;    // 8-char unique string, nullable
    String        inviteLink;    // full URL, nullable
    UUID          hostId;        // user_id from auth_db (no FK)
    UUID          createdBy;     // user_id from auth_db (no FK)
    LocalDateTime deletedAt;     // soft delete
    // audit: createdAt, updatedAt, createdBy (auditing field)
}

// ── contest_problems table
@Entity @Table(name = "contest_problems")
class ContestProblem {
    UUID    id;
    Contest contest;     // @ManyToOne
    Problem problem;     // @ManyToOne
    int     points;
    int     sequenceNo;
    // UNIQUE(contest_id, problem_id)
}

// ── contest_participants table
@Entity @Table(name = "contest_participants")
class ContestParticipant {
    UUID          id;
    Contest       contest;       // @ManyToOne
    UUID          userId;        // user_id from auth_db (no FK)
    LocalDateTime registeredAt;
    // UNIQUE(contest_id, user_id)
}

// ── leaderboard table
@Entity @Table(name = "leaderboard")
class Leaderboard {
    UUID          id;
    Contest       contest;       // @ManyToOne
    UUID          userId;        // user_id from auth_db (no FK)
    int           rank;
    int           score;
    int           penaltyTime;   // minutes
    int           problemsSolved;
    LocalDateTime lastAcTime;    // nullable
    LocalDateTime updatedAt;
    // UNIQUE(contest_id, user_id)
}

// Enumerations
enum Difficulty      { EASY, MEDIUM, HARD }
enum ProblemCategory { ARRAYS, STRINGS, LINKED_LIST, TREES, GRAPHS,
                       DYNAMIC_PROGRAMMING, GREEDY, BACKTRACKING,
                       SORTING, SEARCHING, MATH, SQL,
                       SYSTEM_DESIGN, MISCELLANEOUS }
enum Visibility      { PUBLIC, PRIVATE }
enum ProblemStatus   { DRAFT, PUBLISHED }
enum TestCaseType    { SAMPLE, HIDDEN }
enum ContestStatus   { DRAFT, SCHEDULED, ACTIVE, COMPLETED, CANCELLED }
enum RegType         { OPEN, INVITE_ONLY }
enum ScoringMode     { POINTS, PENALTY_TIME, PERCENTAGE }
```

#### Repositories

```java
interface ProblemRepository extends JpaRepository<Problem, UUID> {
    Page<Problem>    findByStatusAndDeletedAtIsNull(ProblemStatus s, Pageable p);
    Page<Problem>    findByStatusAndVisibilityAndDeletedAtIsNull(
                         ProblemStatus s, Visibility v, Pageable p);
    Optional<Problem> findByIdAndDeletedAtIsNull(UUID id);
    boolean          existsByTitleAndCreatedBy(String title, UUID userId);
    // Search with filters
    @Query("SELECT p FROM Problem p WHERE p.status = 'PUBLISHED' " +
           "AND (:difficulty IS NULL OR p.difficulty = :difficulty) " +
           "AND (:category IS NULL OR p.category = :category) " +
           "AND (:q IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%',:q,'%'))) " +
           "AND p.deletedAt IS NULL")
    Page<Problem>    searchProblems(Difficulty difficulty,
                                   ProblemCategory category,
                                   String q, Pageable pageable);
}

interface TestCaseRepository extends JpaRepository<TestCase, UUID> {
    List<TestCase>  findByProblemId(UUID problemId);
    List<TestCase>  findByProblemIdAndType(UUID problemId, TestCaseType type);
    long            countByProblemIdAndType(UUID problemId, TestCaseType type);
}

interface ContestRepository extends JpaRepository<Contest, UUID> {
    Optional<Contest>   findByInviteCode(String inviteCode);
    Page<Contest>       findByStatusAndVisibilityAndDeletedAtIsNull(
                            ContestStatus s, Visibility v, Pageable p);
    List<Contest>       findByHostIdAndDeletedAtIsNull(UUID hostId);
    Optional<Contest>   findByIdAndDeletedAtIsNull(UUID id);
}

interface ContestParticipantRepository extends JpaRepository<ContestParticipant, UUID> {
    boolean             existsByContestIdAndUserId(UUID contestId, UUID userId);
    long                countByContestId(UUID contestId);
    Optional<ContestParticipant> findByContestIdAndUserId(UUID contestId, UUID userId);
}

interface ContestProblemRepository extends JpaRepository<ContestProblem, UUID> {
    List<ContestProblem> findByContestIdOrderBySequenceNo(UUID contestId);
    boolean              existsByContestIdAndProblemId(UUID contestId, UUID problemId);
}

interface LeaderboardRepository extends JpaRepository<Leaderboard, UUID> {
    Optional<Leaderboard>     findByContestIdAndUserId(UUID contestId, UUID userId);
    Page<Leaderboard>         findByContestIdOrderByRankAsc(UUID contestId, Pageable p);
    List<Leaderboard>         findTop100ByContestIdOrderByRankAsc(UUID contestId);
    void                      deleteByContestId(UUID contestId);
}
```

#### Service Interfaces

```java
interface ProblemService {
    ProblemResponse      create(CreateProblemRequest req, UUID createdBy);
    ProblemResponse      getById(UUID id);
    Page<ProblemResponse> list(ProblemFilterRequest filter, Pageable p);
    ProblemResponse      update(UUID id, UpdateProblemRequest req, UUID updatedBy);
    TestCaseResponse     addTestCase(UUID problemId, CreateTestCaseRequest req, UUID userId);
    ProblemResponse      publish(UUID problemId, UUID userId);
    void                 delete(UUID problemId);  // Admin only, soft delete
}

interface ContestService {
    ContestResponse      create(CreateContestRequest req, UUID hostId);
    ContestResponse      host(HostContestRequest req, UUID userId);   // self-service
    ContestResponse      getById(UUID id);
    ContestResponse      getByInviteCode(String inviteCode);          // Authenticated
    Page<ContestResponse> list(ContestFilterRequest filter, Pageable p);
    ContestResponse      schedule(UUID contestId, UUID userId);
    ContestResponse      cancel(UUID contestId, UUID userId);
    JoinContestResponse  join(String inviteCode, UUID userId);        // invite flow
    void                 register(UUID contestId, UUID userId);       // open registration
    void                 addProblem(UUID contestId, UUID problemId,
                                    int points, int seq, UUID userId);
    // Internal (called by scheduler)
    void                 activate(UUID contestId);
    void                 complete(UUID contestId);
}

interface LeaderboardService {
    Page<LeaderboardResponse>  getContestLeaderboard(UUID contestId, Pageable p);
    Page<LeaderboardResponse>  getGlobalLeaderboard(Pageable p);
    // Kafka consumer — called internally
    void                       updateOnSubmission(SubmissionCompletedEvent event);
}

interface AnalyticsService {
    ContestAnalyticsResponse  getContestAnalytics(UUID contestId, UUID requesterId);
    UserDashboardResponse     getUserDashboard(UUID userId);
    // Kafka consumer — called internally
    void                      updateProblemStats(SubmissionCompletedEvent event);
}
```

#### Kafka Consumer (Contest Service)

```java
@Service
class ContestKafkaConsumer {

    @KafkaListener(
        topics = "submission.completed",
        groupId = "leaderboard-group"
    )
    void handleSubmissionForLeaderboard(SubmissionCompletedEvent event) {
        leaderboardService.updateOnSubmission(event);
    }

    @KafkaListener(
        topics = "submission.completed",
        groupId = "analytics-group"
    )
    void handleSubmissionForAnalytics(SubmissionCompletedEvent event) {
        analyticsService.updateProblemStats(event);
    }
}
```

#### Scheduler (Contest Lifecycle)

```java
@Service
class ContestSchedulerService {
    // Uses Spring @Scheduled or Quartz; scans every minute
    @Scheduled(fixedRate = 30_000)
    void activateDueContests() {
        // Fetch contests with status=SCHEDULED and startTime <= now
        // Transition to ACTIVE; publish ContestActivatedEvent to Kafka
    }

    @Scheduled(fixedRate = 30_000)
    void completeExpiredContests() {
        // Fetch contests with status=ACTIVE and endTime <= now
        // Transition to COMPLETED; freeze leaderboard; publish ContestCompletedEvent
    }
}
```

#### DTOs (Contest Service, selection)

```java
// Problem DTOs
record CreateProblemRequest(
    @NotBlank @Size(min=5, max=200) String title,
    @NotBlank                       String description,
    @NotNull Difficulty             difficulty,
    @NotNull ProblemCategory        category,
    @Min(1) @Max(10) int            timeLimit,
    @Min(16) @Max(512) int          memoryLimit,
    @NotBlank String                inputFormat,
    @NotBlank String                outputFormat,
    @NotBlank String                constraintsText,
    String                          explanation,
    List<String>                    tags,           // max 10
    @NotNull Visibility             visibility
) {}

record ProblemResponse(
    UUID id, String title, String description,
    String difficulty, String category,
    int timeLimit, int memoryLimit,
    String inputFormat, String outputFormat,
    String constraintsText, String explanation,
    List<String> tags, String visibility, String status,
    double acceptanceRate, int totalSubmissions,
    List<TestCaseResponse> sampleTestCases   // SAMPLE only, never HIDDEN
) {}

record CreateTestCaseRequest(
    @NotBlank String input,
    @NotBlank String expectedOutput,
    @NotNull  TestCaseType type,
    int scoreWeight
) {}

// Contest DTOs
record CreateContestRequest(
    @NotBlank @Size(min=5, max=200) String title,
    @NotBlank String                description,
    @NotNull @Future LocalDateTime  startTime,
    @NotNull LocalDateTime          endTime,
    @NotNull Visibility             visibility,
    @NotNull RegType                regType,
    Integer                         maxParticipants,    // optional
    @NotNull ScoringMode            scoringMode
) {}

record HostContestRequest(
    @NotBlank @Size(min=5, max=200) String title,
    @NotBlank String                description,
    @NotNull @Future LocalDateTime  startTime,
    @NotNull LocalDateTime          endTime,
    @NotNull Visibility             visibility,
    @NotNull RegType                regType,
    Integer                         maxParticipants,
    @NotNull ScoringMode            scoringMode
) {}  // same as CreateContest; host endpoint auto-upgrades role

record ContestResponse(
    UUID id, String title, String description,
    LocalDateTime startTime, LocalDateTime endTime,
    String status, String visibility, String regType, String scoringMode,
    int maxParticipants, String inviteCode, String inviteLink,
    UUID hostId, int participantCount, int problemCount,
    LocalDateTime createdAt
) {}

record JoinContestResponse(
    String message, UUID contestId,
    LocalDateTime startTime, int problemCount
) {}

record LeaderboardResponse(
    int rank, UUID userId, String fullName,
    int score, int penaltyTime, int problemsSolved,
    LocalDateTime lastAcTime
) {}
```

---

### 2.3 Execution Service

#### Entities

```java
// ── submissions table
@Entity @Table(name = "submissions")
class Submission {
    UUID          id;
    UUID          userId;          // from auth_db, no FK
    UUID          problemId;       // from contest_db, no FK
    UUID          contestId;       // nullable, from contest_db, no FK
    Language      language;        // ENUM: JAVA | PYTHON | CPP | JAVASCRIPT
    String        sourceCode;
    Verdict       verdict;         // ENUM: PENDING|AC|WA|CE|RE|TLE|MLE
    Integer       executionTime;   // ms, nullable
    Integer       memoryUsed;      // MB, nullable
    String        errorMessage;    // nullable (CE message, RE message)
    LocalDateTime submittedAt;
    List<SubmissionTestResult> testResults;  // @OneToMany
    // audit: createdAt, updatedAt, createdBy
}

// ── submission_test_results table
@Entity @Table(name = "submission_test_results")
class SubmissionTestResult {
    UUID       id;
    Submission submission;   // @ManyToOne
    UUID       testCaseId;   // from contest_db, no FK
    boolean    passed;
    int        executionTime;  // ms
    int        memoryUsed;     // MB
    String     actualOutput;   // nullable
    LocalDateTime createdAt;
}

enum Language { JAVA, PYTHON, CPP, JAVASCRIPT }
enum Verdict  { PENDING, AC, WA, CE, RE, TLE, MLE }
```

#### Repositories

```java
interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    Page<Submission>  findByUserId(UUID userId, Pageable p);
    Page<Submission>  findByUserIdAndContestId(UUID userId, UUID contestId, Pageable p);
    Page<Submission>  findByContestIdAndProblemId(UUID contestId, UUID problemId, Pageable p);
    // Rate limiting support
    long              countByUserIdAndProblemIdAndSubmittedAtAfter(
                          UUID userId, UUID problemId, LocalDateTime since);
}

interface SubmissionTestResultRepository extends JpaRepository<SubmissionTestResult, UUID> {
    List<SubmissionTestResult> findBySubmissionId(UUID submissionId);
}
```

#### Strategy Pattern — Language Executors

```java
// ── LanguageExecutor (Strategy Interface)
interface LanguageExecutor {
    Language          getLanguage();
    CompilationResult compile(String sourceCode, String workDir);  // null if not needed
    ExecutionResult   execute(String workDir, String input,
                              int timeLimitMs, int memoryLimitMB);
}

// ── JavaExecutor
@Component
class JavaExecutor implements LanguageExecutor {
    Language getLanguage() { return Language.JAVA; }
    // Runs: javac Main.java inside Docker sandbox (no network, no file I/O)
    // Executes: java -Xmx{mem}m Main
}

// ── PythonExecutor
@Component
class PythonExecutor implements LanguageExecutor {
    Language getLanguage() { return Language.PYTHON; }
    // No compile step
    // Executes: python3 solution.py (restricted: no os, no subprocess)
}

// ── CppExecutor
@Component
class CppExecutor implements LanguageExecutor {
    Language getLanguage() { return Language.CPP; }
    // Compiles: g++ -O2 -o main main.cpp
    // Executes: ./main (no network)
}

// ── JavaScriptExecutor
@Component
class JavaScriptExecutor implements LanguageExecutor {
    Language getLanguage() { return Language.JAVASCRIPT; }
    // No compile step
    // Executes: node solution.js (restricted: no fs, no child_process)
}

// ── ExecutorFactory (Factory Pattern via Spring DI)
@Service
class ExecutorFactory {
    private final Map<Language, LanguageExecutor> executors;

    // Spring injects all LanguageExecutor beans into the list
    ExecutorFactory(List<LanguageExecutor> executorList) {
        executors = executorList.stream()
            .collect(Collectors.toMap(LanguageExecutor::getLanguage, e -> e));
    }

    LanguageExecutor getExecutor(Language language) {
        return Optional.ofNullable(executors.get(language))
            .orElseThrow(() -> new UnsupportedLanguageException(language));
    }
}
```

#### Chain of Responsibility — Execution Pipeline

```java
// ── Abstract handler
abstract class ExecutionHandler {
    ExecutionHandler next;

    ExecutionHandler setNext(ExecutionHandler next) {
        this.next = next;
        return next;
    }

    abstract PipelineContext handle(PipelineContext ctx);

    PipelineContext proceed(PipelineContext ctx) {
        return next != null ? next.handle(ctx) : ctx;
    }
}

// ── Chain Steps
class SyntaxValidator     extends ExecutionHandler { ... }  // Quick reject malformed code
class SecurityValidator   extends ExecutionHandler { ... }  // Block dangerous imports/syscalls
class CompilationHandler  extends ExecutionHandler { ... }  // Compile if needed → CE on fail
class ExecutionHandler_   extends ExecutionHandler { ... }  // Run each test case in Docker
class VerdictHandler      extends ExecutionHandler { ... }  // Compute final verdict

// ── Pipeline Context (data passed through chain)
class PipelineContext {
    UUID              submissionId;
    String            sourceCode;
    Language          language;
    List<TestCaseDto> testCases;
    int               timeLimitMs;
    int               memoryLimitMB;
    String            workDir;           // temp Docker volume mount
    CompilationResult compilationResult;
    List<TestResult>  testResults;       // per-test results
    Verdict           finalVerdict;
    String            errorMessage;
}

// ── Chain Assembly (Spring @Bean)
@Bean
ExecutionHandler executionPipeline(SyntaxValidator sv, SecurityValidator secv,
                                   CompilationHandler ch,
                                   ExecutionHandler_ eh, VerdictHandler vh) {
    sv.setNext(secv).setNext(ch).setNext(eh).setNext(vh);
    return sv;   // return head of chain
}
```

#### Submission Service & RabbitMQ

```java
// ── SubmissionService
interface SubmissionService {
    SubmissionResponse  submit(CreateSubmissionRequest req, UUID userId);    // returns 202
    SubmissionResponse  getById(UUID submissionId, UUID requesterId);
    Page<SubmissionResponse> list(UUID userId, UUID contestId, Pageable p);
}

@Service @Transactional
class SubmissionServiceImpl implements SubmissionService {
    // On submit:
    //   1. Validate language, code not empty
    //   2. Rate-limit check (Redis): max 5 submissions / 5 min per user/problem
    //   3. Call ContestService (Eureka) → validate ACTIVE contest + participant
    //   4. Call ContestService (Eureka) → fetch hidden test cases for problemId
    //   5. Create Submission { verdict: PENDING } in execution_db
    //   6. Return HTTP 202 { submissionId }
    //   7. Publish SubmissionMessage to RabbitMQ → submission.queue

    private final SubmissionRepository repo;
    private final RabbitTemplate        rabbitTemplate;
    private final RedisTemplate<String,String> redis;
    private final RestTemplate          restTemplate;  // Eureka-resolved
}

// ── RabbitMQ Message
record SubmissionMessage(
    UUID              submissionId,
    String            sourceCode,
    Language          language,
    List<TestCaseDto> testCases,
    int               timeLimitMs,
    int               memoryLimitMB,
    UUID              userId,
    UUID              contestId,
    UUID              problemId
) {}

// ── Execution Worker (RabbitMQ Consumer)
@Service
class ExecutionWorker {

    @RabbitListener(queues = "submission.queue")
    void processSubmission(SubmissionMessage msg) {
        // 1. Run through Chain of Responsibility pipeline
        // 2. Update submission verdict + test results in execution_db
        // 3. Publish SubmissionCompletedEvent to Kafka topic "submission.completed"
    }
}

// ── Kafka Event
record SubmissionCompletedEvent(
    UUID    submissionId,
    UUID    userId,
    UUID    contestId,
    UUID    problemId,
    String  verdict,
    int     score,
    int     executionTime,
    int     problemsSolved   // for leaderboard delta
) {}
```

#### DTOs (Execution Service)

```java
record CreateSubmissionRequest(
    @NotNull UUID   problemId,
    UUID            contestId,       // optional (practice submission)
    @NotNull Language language,
    @NotBlank String sourceCode
) {}

record SubmissionResponse(
    UUID          id,
    UUID          userId,
    UUID          problemId,
    UUID          contestId,
    String        language,
    String        verdict,
    Integer       executionTime,
    Integer       memoryUsed,
    String        errorMessage,
    LocalDateTime submittedAt
) {}

record TestCaseDto(
    UUID   id,
    String input,
    String expectedOutput,
    int    timeLimitMs,
    int    memoryLimitMB
) {}
```

---

### 2.4 AI Service

#### Entities

```java
@Entity @Table(name = "ai_reviews")
class AIReview {
    UUID          id;
    UUID          submissionId;     // from execution_db, no FK
    UUID          userId;           // from auth_db, no FK
    Integer       qualityScore;     // 0–100, nullable until COMPLETED
    String        timeComplexity;   // e.g., O(n log n)
    String        spaceComplexity;
    JsonNode      feedback;         // JSONB array of { section, issue, suggestion }
    JsonNode      optimizationTips; // JSONB array of strings
    AIReviewStatus status;          // ENUM: PENDING | COMPLETED | FAILED
    // audit: createdAt, updatedAt, createdBy
}

@Entity @Table(name = "hint_requests")
class HintRequest {
    UUID          id;
    UUID          userId;
    UUID          problemId;
    int           hintLevel;        // 1 | 2 | 3
    String        hintContent;
    LocalDateTime createdAt;
    // UNIQUE(userId, problemId, hintLevel)
}

@Entity @Table(name = "learning_roadmaps")
class LearningRoadmap {
    UUID          id;
    UUID          userId;           // UNIQUE
    JsonNode      weakTopics;
    JsonNode      recommended;
    JsonNode      practiceProblems;
    LocalDateTime generatedAt;
    LocalDateTime refreshedAt;
}

enum AIReviewStatus { PENDING, COMPLETED, FAILED }
```

#### Services

```java
interface AIReviewService {
    AIReviewResponse    requestReview(UUID submissionId, UUID userId);
    AIReviewResponse    getReview(UUID submissionId, UUID userId);
}

interface HintService {
    HintResponse        getHint(UUID problemId, int hintLevel, UUID userId);
}

interface RoadmapService {
    RoadmapResponse     getRoadmap(UUID userId);
    RoadmapResponse     refreshRoadmap(UUID userId);
}

interface InterviewService {
    List<InterviewQuestion> getQuestions(UUID userId, int count);
}

// ── AI Service Configuration (Spring AI)
@Configuration
class SpringAIConfig {
    // Reads AI_PROVIDER (openai | gemini) from env
    // Reads AI_PROVIDER_API_KEY from env
    @Bean ChatClient chatClient(ChatModel model) {
        return ChatClient.create(model);
    }
}
```

#### Prompt Templates

```
// code_review_prompt.st
System: You are an expert software engineer reviewing competitive programming code.
        Analyze and respond ONLY in valid JSON format.

User: Language: {language}
      Problem: {problemTitle}
      Verdict: {verdict}
      Code:
      {sourceCode}

      Respond in JSON:
      {
        "qualityScore": int (0-100),
        "timeComplexity": "O(...)",
        "spaceComplexity": "O(...)",
        "feedback": [
          { "section": "string", "issue": "string", "suggestion": "string" }
        ],
        "optimizationTips": ["string"]
      }

// hint_generation_prompt.st
System: You are a programming tutor giving hints at level {hintLevel}/3.
        Level 1 = conceptual nudge. Level 2 = algorithmic direction.
        Level 3 = near-solution pseudocode. Never give the full answer.

User: Problem: {problemTitle}
      Description: {description}
      Hint level requested: {hintLevel}
      Generate the hint.

// roadmap_generation_prompt.st
System: You are a learning path advisor for competitive programming.

User: Student's weak topics based on submissions: {weakTopics}
      Generate a JSON learning roadmap with:
      { "weakTopics": [], "recommended": [], "practiceProblems": [] }
```

---

### 2.5 API Gateway

```java
// ── Route Configuration (application.yml / Java config)
@Configuration
class GatewayRoutesConfig {
    @Bean
    RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("auth-service",      r -> r.path("/auth/**")
                .filters(f -> f.filter(corsFilter))
                .uri("lb://auth-service"))
            .route("contest-service",   r -> r.path("/contest/v1/**")
                .filters(f -> f.filter(jwtValidationFilter)
                               .filter(rateLimitFilter))
                .uri("lb://contest-service"))
            .route("execution-service", r -> r.path("/exec/v1/**")
                .filters(f -> f.filter(jwtValidationFilter)
                               .filter(rateLimitFilter))
                .uri("lb://execution-service"))
            .route("ai-service",        r -> r.path("/ai/**")
                .filters(f -> f.filter(jwtValidationFilter)
                               .filter(rateLimitFilter))
                .uri("lb://ai-service"))
            .build();
    }
}

// ── JWT Validation Filter (Gateway-level — validates, then forwards headers)
@Component
class JwtValidationFilter implements GatewayFilter {
    // Public paths: skip validation
    // Protected paths:
    //   1. Extract Bearer token from Authorization header
    //   2. Verify HMAC-SHA256 signature
    //   3. Check expiry
    //   4. Check Redis blacklist: key "jwt:blacklist:{token}"
    //   5. Extract claims: userId, email, role
    //   6. Add headers: X-User-Id, X-User-Email, X-User-Role
    //   7. Forward to downstream service
    //   → Returns HTTP 401 if missing or invalid
}

// ── Rate Limit Filter
@Component
class RateLimitFilter implements GatewayFilter {
    // Uses Redis Token Bucket per userId (authenticated) or IP (public)
    // Default: 100 requests/minute per user
    // Submission endpoint: 5 requests/5 minutes per user/problem
    // → Returns HTTP 429 with Retry-After header if exceeded
}
```

---

## 3. Sequence Diagrams

---

### 3.1 User Registration (Credentials)

```
Client          API Gateway        Auth Service       auth_db        Redis
  │                  │                  │               │               │
  │─POST /auth/register──────────────►│                │               │
  │                  │─────────────────►│               │               │
  │                  │                  │─validate DTO──►│              │
  │                  │                  │               │               │
  │                  │                  │─existsByEmail─►│              │
  │                  │                  │◄──false────────│              │
  │                  │                  │               │               │
  │                  │                  │─BCrypt.hash(password)         │
  │                  │                  │─INSERT users──►│              │
  │                  │                  │◄──User saved───│              │
  │                  │                  │               │               │
  │                  │                  │─generateAccessToken (15min)   │
  │                  │                  │─generateRefreshToken (7days)  │
  │                  │                  │─INSERT refresh_tokens─►│      │
  │                  │                  │               │               │
  │◄─── 201 { accessToken, refreshToken, user: { id, email, role } } ──│
  │─store tokens locally (auto-login)  │               │               │

Error Cases:
  │─POST /auth/register (duplicate email)─────────────►│              │
  │                  │                  │─existsByEmail─►│             │
  │                  │                  │◄──true─────────│             │
  │◄─────────────────────────── 409 Conflict ───────────│             │
```

---

### 3.2 User Login (Credentials)

```
Client          API Gateway        Auth Service       auth_db       Redis
  │                  │                  │               │              │
  │─POST /auth/login──────────────────►│                │              │
  │                  │─────────────────►│               │              │
  │                  │                  │─findByEmail───►│             │
  │                  │                  │◄──User─────────│             │
  │                  │                  │─BCrypt.verify(pass, hash)    │
  │                  │                  │─generateAccessToken (15min)  │
  │                  │                  │─generateRefreshToken (7days) │
  │                  │                  │─INSERT refresh_tokens─►│     │
  │                  │                  │               │              │
  │◄─────── 200 { accessToken, refreshToken, user } ───────────────── │

Error Cases:
  Wrong password  → 401 Unauthorized
  Suspended user  → 403 Forbidden
  OAuth user (no password set) → 400 Bad Request
```

---

### 3.3 OAuth2 Login (Google / GitHub)

```
Client    API Gateway    Auth Service    Google/GitHub    auth_db
  │            │               │                │            │
  │─GET /auth/oauth2/authorize/google──────────►│            │
  │            │               │─build auth URL (state+PKCE)│
  │◄─redirect─────────────────────────────────►│            │
  │                                             │            │
  │─(User authenticates on Google)──────────────│            │
  │                                             │            │
  │            Google redirects browser to      │            │
  │    /auth/oauth2/callback/google?code=...    │            │
  │─────────────────────────────────────────────│            │
  │            │               │                │            │
  │            │───────────────►│               │            │
  │            │               │─validate state (CSRF check) │
  │            │               │─exchange code for token────►│
  │            │               │◄──access_token─────────────│
  │            │               │─fetch user info────────────►│
  │            │               │◄──{email,name,avatar,id}───│
  │            │               │                             │
  │            │               │─findByEmail──────────────────────►│
  │            │               │                                    │
  │            │      [Case A: existing user]                       │
  │            │               │─upsert oauth_providers─────────────►│
  │            │               │─set auth_type=BOTH─────────────────►│
  │            │               │                                    │
  │            │      [Case B: new user]                            │
  │            │               │─INSERT users (pass=NULL, type=OAUTH)►│
  │            │               │─INSERT oauth_providers─────────────►│
  │            │               │                                    │
  │            │               │─generateAccessToken (15min)         │
  │            │               │─generateRefreshToken (7days)        │
  │            │               │─INSERT refresh_tokens──────────────►│
  │            │               │                                    │
  │◄─redirect to codeforge.io/auth/callback#accessToken=...&refreshToken=...
  │─store tokens locally                                            │
  │─navigate to dashboard                                           │
```

---

### 3.4 Code Submission & Execution

```
Client    API GW    Exec Svc     Contest Svc     RabbitMQ    Exec Worker    Kafka    Contest Svc (LB)
  │          │          │              │              │             │           │           │
  │─POST /exec/v1/submissions──►│     │              │             │           │           │
  │          │─JWT validate     │     │              │             │           │           │
  │          │─add X-User-* hdrs│     │              │             │           │           │
  │          │─────────────────►│     │              │             │           │           │
  │          │          │─rate limit (Redis: 5/5min)  │             │           │           │
  │          │          │─GET /contest/v1/contests/{id}/status     │           │           │
  │          │          │──────────────────────────►│              │           │           │
  │          │          │◄──────────── { status: ACTIVE }          │           │           │
  │          │          │─GET /contest/v1/contests/{id}/participants/{userId}   │           │
  │          │          │──────────────────────────►│              │           │           │
  │          │          │◄──────────── { registered: true }        │           │           │
  │          │          │─GET /contest/v1/problems/{id}/testcases  │           │           │
  │          │          │──────────────────────────►│              │           │           │
  │          │          │◄──────────── [testCases (HIDDEN)]        │           │           │
  │          │          │─INSERT submission {verdict:PENDING}       │           │           │
  │          │          │─publish SubmissionMessage─────────────────►│          │           │
  │◄──────── 202 { submissionId }                   │              │           │           │
  │          │          │                            │              │           │           │
  │          │          │                     [Async — worker picks up message] │           │
  │          │          │                            │             ├─SyntaxValidator        │
  │          │          │                            │             ├─SecurityValidator       │
  │          │          │                            │             ├─CompilationHandler      │
  │          │          │                            │             │  (Docker: compile)      │
  │          │          │                            │             ├─ExecutionHandler        │
  │          │          │                            │             │  (Docker: run tests)    │
  │          │          │                            │             ├─VerdictHandler          │
  │          │          │                            │             │─UPDATE submission {verdict, time, mem}
  │          │          │                            │             │─publish SubmissionCompleted──►│
  │          │          │                            │             │           │─leaderboard-group─►│
  │          │          │                            │             │           │           │  │─update rank
  │          │          │                            │             │           │─analytics-group────►│
  │          │          │                            │             │           │           │       │─update stats
  │          │          │                            │             │           │           │       │
  │─GET /exec/v1/submissions/{id} (polling)          │             │           │           │       │
  │◄──────── { verdict: AC/WA/... }                  │             │           │           │       │
```

---

### 3.5 Leaderboard Request (Cache Hit / Miss)

```
Client    API GW     Contest Svc     Redis           contest_db
  │          │             │              │                │
  │─GET /contest/v1/leaderboard/contest/{id}?page=0──────►│
  │          │─JWT validate│              │                │
  │          │────────────►│              │                │
  │          │             │─GET leaderboard:{id}:page:0──►│
  │          │             │                               │
  │          │    [CACHE HIT]                              │
  │          │             │◄── cached data ───────────────│
  │◄──────── 200 { leaderboard rows } (< 1ms) ────────────│
  │          │             │                               │
  │          │    [CACHE MISS]                             │
  │          │             │◄── nil ───────────────────────│
  │          │             │─SELECT leaderboard ORDER BY rank──────────────►│
  │          │             │◄──────────────────────────── rows ─────────────│
  │          │             │─SET leaderboard:{id}:page:0 EX 30────────────►│
  │◄──────── 200 { leaderboard rows } ────────────────────│
```

---

### 3.6 Host a Contest (Self-Service)

```
Client    API GW    Auth Svc    auth_db    Redis    Contest Svc    contest_db
  │          │          │           │         │           │              │
  │─PATCH /auth/upgrade-to-organizer (X-User-Id header)──►│             │
  │          │─JWT validate         │         │           │              │
  │          │────────────►│        │         │           │              │
  │          │             │─findById─────────►│          │              │
  │          │             │─check role=STUDENT│          │              │
  │          │             │─UPDATE role=ORGANIZER──────►│               │
  │          │             │─blacklist old token──────────────►│         │
  │          │             │─generateAccessToken (ORGANIZER)   │         │
  │          │             │─generateRefreshToken              │         │
  │          │             │─INSERT refresh_tokens────────────►│         │
  │◄──────── 200 { newAccessToken, refreshToken } ────────────│         │
  │─store new tokens                                           │         │
  │          │          │           │         │                │          │
  │─POST /contest/v1/contests/host (newAccessToken)────────────────────►│
  │          │─JWT validate (ORGANIZER confirmed)              │          │
  │          │─────────────────────────────────────────────────────────►│
  │          │                                                 │─validate fields
  │          │                                                 │─generate 8-char inviteCode
  │          │                                                 │─build inviteLink URL
  │          │                                                 │─INSERT contests──────────►│
  │◄──────── 201 { contestId, inviteCode, inviteLink, status:DRAFT } ───│
```

---

### 3.7 Join Contest via Invite Code

```
Client     API GW      Contest Svc     contest_db
  │            │              │               │
  │ [User is already authenticated]           │
  │            │              │               │
  │─GET /contest/v1/contests/join/{inviteCode}─────────────────────────►│
  │            │─JWT validate  │               │
  │            │──────────────►│               │
  │            │               │─findByInviteCode───────────────────────►│
  │            │               │◄──────────── contest ───────────────────│
  │◄────────── 200 { title, hostName, startTime, endTime, status, ... }  │
  │─UI shows Join Contest page                │               │
  │            │              │               │
  │─POST /contest/v1/contests/join { inviteCode }──────────────────────►│
  │            │─JWT validate  │               │
  │            │──────────────►│               │
  │            │               │─findByInviteCode───────────────────────►│
  │            │               │◄── contest ─────────────────────────────│
  │            │               │─validate: status = SCHEDULED or ACTIVE  │
  │            │               │─existsByContestIdAndUserId─────────────►│
  │            │               │◄── false ───────────────────────────────│
  │            │               │─countByContestId < maxParticipants──────►│
  │            │               │─INSERT contest_participants─────────────►│
  │◄────────── 200 { message, contestId, startTime, problemCount } ──────│

Error Cases:
  User already registered     → 409 Conflict
  Contest full                → 409 Conflict
  Contest COMPLETED/CANCELLED → 400 Bad Request
  No JWT                      → 401 Unauthorized
```

---

### 3.8 AI Code Review

```
Client    API GW    AI Svc    ai_db    Exec Svc (internal)    LLM (OpenAI/Gemini)
  │          │         │         │              │                       │
  │─POST /ai/review { submissionId }────────────►│                     │
  │          │─JWT validate     │         │      │                      │
  │          │────────────────►│          │      │                      │
  │          │                 │─findBySubmissionId─────────────────────►│
  │          │         [EXISTS] │◄── AIReview ────────────────────────── │
  │◄──────── 200 { review } ───│         │      │                       │
  │          │                 │          │      │                       │
  │          │         [NOT EXISTS]       │      │                       │
  │          │                 │─INSERT ai_reviews { status:PENDING }───►│
  │          │                 │─GET /exec/v1/submissions/{id}───────────────────────────►│
  │          │                 │◄───────────────────── { code, language, verdict } ───────│
  │          │                 │─GET /contest/v1/problems/{problemId}                     │
  │          │                 │  (internal call via Eureka)                              │
  │          │                 │─build prompt from code_review_prompt.st                 │
  │◄──────── 202 { reviewId, status:PENDING }                                            │
  │          │                 │─chatClient.call(prompt) [async]──────────────────────────►│
  │          │                 │◄─────────────────────────── JSON response ────────────── │
  │          │                 │─parse JSON → AIReviewResponse                            │
  │          │                 │─UPDATE ai_reviews { status:COMPLETED, feedback, ... }──►│
  │          │                 │          │      │                       │
  │─GET /ai/review/{submissionId} (polling) ────►│                      │
  │◄──────── 200 { qualityScore, timeComplexity, feedback, tips } ──────│
```

---

### 3.9 Contest Lifecycle (Scheduler)

```
ContestSchedulerService    contest_db    Kafka     Contest Svc (LB/Analytics)
         │                     │           │                  │
  [Every 30 seconds]           │           │                  │
         │                     │           │                  │
         │─SELECT contests WHERE status=SCHEDULED AND startTime<=now
         │◄── [ contest list ] ────────────────────────────── │
         │                     │           │                  │
  [For each due contest:]      │           │                  │
         │─UPDATE status=ACTIVE───────────►│                  │
         │─publish ContestActivatedEvent──────────────────────►│
         │                     │           │                  │
  [Every 30 seconds]           │           │                  │
         │                     │           │                  │
         │─SELECT contests WHERE status=ACTIVE AND endTime<=now
         │◄── [ contest list ] ────────────────────────────── │
         │                     │           │                  │
  [For each expired contest:]  │           │                  │
         │─UPDATE status=COMPLETED──────────►│                │
         │─lock submissions (application-level check)         │
         │─freeze leaderboard (mark final)──►│                │
         │─publish ContestCompletedEvent─────────────────────►│
         │                     │           │         │─update final analytics
```

---

## 4. API Contracts

> All responses are wrapped in `ApiResponse<T>`:
> ```json
> {
>   "success": true,
>   "message": "...",
>   "errorCode": null,
>   "data": { },
>   "timestamp": "2026-06-19T00:00:00"
> }
> ```
> All error responses follow:
> ```json
> {
>   "success": false,
>   "message": "Error description",
>   "errorCode": "ERROR_CODE",
>   "data": null,
>   "timestamp": "2026-06-19T00:00:00"
> }
> ```

---

### 4.1 Auth Service

#### POST /auth/register

**Request:**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass@1"
}
```
**Response 201:**
```json
{
  "success": true,
  "message": "Account created",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "uuid-refresh-token",
    "user": {
      "id": "uuid-...",
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "role": "STUDENT",
      "status": "ACTIVE",
      "avatarUrl": null,
      "authType": "LOCAL",
      "createdAt": "2026-06-19T00:00:00"
    }
  }
}
```
| Error | Status | errorCode |
|---|---|---|
| Email already taken | 409 | `EMAIL_ALREADY_EXISTS` |
| Invalid fields | 400 | `VALIDATION_ERROR` |

---

#### POST /auth/login

**Request:**
```json
{ "email": "jane@example.com", "password": "SecurePass@1" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "uuid-refresh-token",
    "user": { "id": "...", "role": "STUDENT", ... }
  }
}
```
| Error | Status | errorCode |
|---|---|---|
| Wrong credentials | 401 | `INVALID_CREDENTIALS` |
| Suspended account | 403 | `ACCOUNT_SUSPENDED` |
| OAuth user (no password) | 400 | `PASSWORD_NOT_SET` |

---

#### POST /auth/refresh

**Request:**
```json
{ "refreshToken": "uuid-refresh-token" }
```
**Response 200:**
```json
{
  "success": true,
  "data": { "accessToken": "eyJhbGci...", "refreshToken": "uuid-...", "user": {...} }
}
```
| Error | Status | errorCode |
|---|---|---|
| Invalid/expired refresh token | 401 | `INVALID_REFRESH_TOKEN` |

---

#### POST /auth/logout

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{ "refreshToken": "uuid-refresh-token" }
```
**Response 200:**
```json
{ "success": true, "message": "Logged out successfully", "data": null }
```

---

#### PATCH /auth/upgrade-to-organizer

**Headers:** `Authorization: Bearer <accessToken>` (must be ROLE_STUDENT)

**Request:** *(no body)*

**Response 200:**
```json
{
  "success": true,
  "message": "Role upgraded to ORGANIZER",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "uuid-...",
    "user": { "role": "ORGANIZER", ... }
  }
}
```
| Error | Status | errorCode |
|---|---|---|
| Already an ORGANIZER or ADMIN | 400 | `ALREADY_ORGANIZER` |
| Account not ACTIVE | 403 | `ACCOUNT_NOT_ACTIVE` |

---

#### GET /auth/profile

**Headers:** `Authorization: Bearer <accessToken>`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "avatarUrl": null,
    "authType": "LOCAL",
    "createdAt": "2026-06-19T00:00:00"
  }
}
```

---

### 4.2 Contest Service — Problems

#### POST /contest/v1/problems

**Headers:** `Authorization: Bearer <accessToken>` (ORGANIZER or ADMIN)

**Request:**
```json
{
  "title": "Two Sum",
  "description": "## Problem\nGiven an array of integers...",
  "difficulty": "EASY",
  "category": "ARRAYS",
  "timeLimit": 2,
  "memoryLimit": 256,
  "inputFormat": "First line: N, Second line: N integers",
  "outputFormat": "Two indices separated by space",
  "constraintsText": "1 ≤ N ≤ 10^4, -10^9 ≤ arr[i] ≤ 10^9",
  "explanation": "Optional walkthrough of sample",
  "tags": ["hash-map", "arrays"],
  "visibility": "PUBLIC"
}
```
**Response 201:**
```json
{
  "success": true,
  "message": "Problem created",
  "data": { "id": "uuid-...", "title": "Two Sum", "status": "DRAFT", ... }
}
```

---

#### POST /contest/v1/problems/{id}/testcases

**Request:**
```json
{
  "input": "4\n2 7 11 15\n9",
  "expectedOutput": "0 1",
  "type": "HIDDEN",
  "scoreWeight": 1
}
```
**Response 201:**
```json
{ "success": true, "data": { "id": "uuid-tc-...", "type": "HIDDEN", "scoreWeight": 1 } }
```

---

#### PATCH /contest/v1/problems/{id}/publish

**Response 200:**
```json
{ "success": true, "data": { "id": "uuid-...", "status": "PUBLISHED" } }
```
| Error | Status | errorCode |
|---|---|---|
| No hidden test case | 400 | `MISSING_HIDDEN_TEST_CASE` |
| Not owner (non-admin) | 403 | `FORBIDDEN` |

---

#### GET /contest/v1/problems

**Query params:** `difficulty`, `category`, `q` (search), `page=0`, `size=20`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid-...",
        "title": "Two Sum",
        "difficulty": "EASY",
        "category": "ARRAYS",
        "acceptanceRate": 72.5,
        "totalSubmissions": 1024
      }
    ],
    "page": 0, "size": 20, "totalElements": 150, "totalPages": 8
  }
}
```

---

### 4.3 Contest Service — Contests

#### POST /contest/v1/contests/host

**Headers:** `Authorization: Bearer <accessToken>` (any authenticated user)

> If the caller has ROLE_STUDENT, the gateway/service auto-initiates the upgrade flow first.

**Request:**
```json
{
  "title": "My Weekly Contest",
  "description": "A fun contest for my friends",
  "startTime": "2026-06-25T14:00:00",
  "endTime": "2026-06-25T16:00:00",
  "visibility": "PRIVATE",
  "regType": "INVITE_ONLY",
  "maxParticipants": 50,
  "scoringMode": "POINTS"
}
```
**Response 201:**
```json
{
  "success": true,
  "message": "Contest created",
  "data": {
    "id": "uuid-contest-...",
    "inviteCode": "XF8K2P9A",
    "inviteLink": "https://codeforge.io/join/XF8K2P9A",
    "status": "DRAFT",
    "hostId": "uuid-user-..."
  }
}
```

---

#### GET /contest/v1/contests/join/{inviteCode}

**Headers:** `Authorization: Bearer <accessToken>` (required)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-contest-...",
    "title": "My Weekly Contest",
    "hostName": "Jane Doe",
    "startTime": "2026-06-25T14:00:00",
    "endTime": "2026-06-25T16:00:00",
    "status": "SCHEDULED",
    "participantCount": 12,
    "problemCount": 5
  }
}
```
| Error | Status | errorCode |
|---|---|---|
| Invalid invite code | 404 | `CONTEST_NOT_FOUND` |
| No JWT | 401 | `UNAUTHORIZED` |

---

#### POST /contest/v1/contests/join

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{ "inviteCode": "XF8K2P9A" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully joined!",
    "contestId": "uuid-contest-...",
    "startTime": "2026-06-25T14:00:00",
    "problemCount": 5
  }
}
```
| Error | Status | errorCode |
|---|---|---|
| Already registered | 409 | `ALREADY_REGISTERED` |
| Contest full | 409 | `CONTEST_FULL` |
| Contest completed/cancelled | 400 | `CONTEST_NOT_JOINABLE` |

---

#### PATCH /contest/v1/contests/{id}/schedule

**Response 200:**
```json
{ "success": true, "data": { "id": "uuid-...", "status": "SCHEDULED" } }
```
| Error | Status | errorCode |
|---|---|---|
| No problems added | 400 | `NO_PROBLEMS_ADDED` |
| Not owner | 403 | `FORBIDDEN` |

---

### 4.4 Contest Service — Leaderboard & Analytics

#### GET /contest/v1/leaderboard/contest/{contestId}

**Query params:** `page=0`, `size=50`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "rank": 1,
        "userId": "uuid-...",
        "fullName": "Alice",
        "score": 300,
        "penaltyTime": 12,
        "problemsSolved": 3,
        "lastAcTime": "2026-06-25T15:20:00"
      }
    ],
    "page": 0, "size": 50, "totalElements": 120
  }
}
```

---

#### GET /contest/v1/analytics/contest/{contestId}

**Headers:** `Authorization: Bearer <accessToken>` (ORGANIZER/ADMIN only)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "contestId": "uuid-...",
    "totalParticipants": 120,
    "totalSubmissions": 450,
    "totalAcSubmissions": 180,
    "problemStats": [
      {
        "problemId": "uuid-...",
        "title": "Two Sum",
        "submissions": 110,
        "accepted": 80,
        "acceptanceRate": 72.7,
        "avgSolveTimeMinutes": 14.3
      }
    ]
  }
}
```

---

### 4.5 Execution Service

#### POST /exec/v1/submissions

**Headers:** `Authorization: Bearer <accessToken>` (STUDENT or ORGANIZER)

**Request:**
```json
{
  "problemId": "uuid-problem-...",
  "contestId": "uuid-contest-...",
  "language": "JAVA",
  "sourceCode": "class Main {\n  public static void main(String[] args) {...}\n}"
}
```
**Response 202:**
```json
{
  "success": true,
  "message": "Submission accepted",
  "data": {
    "submissionId": "uuid-sub-...",
    "status": "PENDING"
  }
}
```
| Error | Status | errorCode |
|---|---|---|
| Rate limit exceeded | 429 | `RATE_LIMIT_EXCEEDED` |
| Contest not active | 400 | `CONTEST_NOT_ACTIVE` |
| Not a participant | 403 | `NOT_A_PARTICIPANT` |
| Unsupported language | 400 | `UNSUPPORTED_LANGUAGE` |

---

#### GET /exec/v1/submissions/{id}

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-sub-...",
    "userId": "uuid-...",
    "problemId": "uuid-...",
    "contestId": "uuid-...",
    "language": "JAVA",
    "verdict": "AC",
    "executionTime": 142,
    "memoryUsed": 38,
    "errorMessage": null,
    "submittedAt": "2026-06-25T15:12:00",
    "testResults": [
      { "testCaseId": "uuid-tc-...", "passed": true, "executionTime": 45, "memoryUsed": 20 }
    ]
  }
}
```

---

### 4.6 AI Service

#### POST /ai/review

**Request:**
```json
{ "submissionId": "uuid-sub-..." }
```
**Response 202 (first request — async generation):**
```json
{
  "success": true,
  "data": { "reviewId": "uuid-review-...", "status": "PENDING" }
}
```
**Response 200 (already exists):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-review-...",
    "submissionId": "uuid-sub-...",
    "qualityScore": 82,
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(n)",
    "feedback": [
      { "section": "Algorithm", "issue": "Uses HashMap correctly", "suggestion": "Could use two-pointer for O(1) space" }
    ],
    "optimizationTips": ["Consider sorted input variation"],
    "status": "COMPLETED"
  }
}
```

---

#### POST /ai/hint

**Request:**
```json
{ "problemId": "uuid-...", "hintLevel": 1 }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "hintLevel": 1,
    "content": "Think about what data structure allows O(1) average lookup..."
  }
}
```

---

#### GET /ai/roadmap

**Headers:** `Authorization: Bearer <accessToken>`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "weakTopics": ["Dynamic Programming", "Graph Algorithms"],
    "recommended": [
      { "topic": "Dynamic Programming", "resource": "LeetCode DP Track", "url": "..." }
    ],
    "practiceProblems": ["uuid-p1", "uuid-p2"],
    "generatedAt": "2026-06-19T00:00:00"
  }
}
```

---

## 5. Design Patterns

---

### 5.1 Strategy + Factory — Execution Engine

**Problem:** Code must execute in Java, Python, C++, and JavaScript — each with a different compile/run pipeline.

**Pattern:** Strategy defines the interface; Factory selects the right implementation at runtime.

```java
// Strategy Interface
interface LanguageExecutor {
    Language          getLanguage();
    CompilationResult compile(String sourceCode, String workDir);
    ExecutionResult   execute(String workDir, String input, int timeLimitMs, int memLimitMB);
}

// Concrete Strategies
@Component class JavaExecutor       implements LanguageExecutor { ... }
@Component class PythonExecutor     implements LanguageExecutor { ... }
@Component class CppExecutor        implements LanguageExecutor { ... }
@Component class JavaScriptExecutor implements LanguageExecutor { ... }

// Factory — uses Spring's DI to auto-collect all LanguageExecutor beans
@Service
class ExecutorFactory {
    private final Map<Language, LanguageExecutor> registry;

    public ExecutorFactory(List<LanguageExecutor> executors) {
        registry = executors.stream()
            .collect(toMap(LanguageExecutor::getLanguage, identity()));
    }

    public LanguageExecutor getExecutor(Language lang) {
        return Optional.ofNullable(registry.get(lang))
            .orElseThrow(() -> new UnsupportedLanguageException(lang));
    }
}

// Usage in ExecutionWorker
LanguageExecutor executor = executorFactory.getExecutor(submission.getLanguage());
CompilationResult cr = executor.compile(code, workDir);
ExecutionResult   er = executor.execute(workDir, testCase.getInput(), timeLimit, memLimit);
```

**Adding a new language** = add one new `@Component` implementing `LanguageExecutor`. No other code changes.

---

### 5.2 Chain of Responsibility — Execution Pipeline

**Problem:** A submission must go through multiple sequential validation and execution steps, each with early-exit on failure.

```java
// Abstract Handler
abstract class ExecutionStep {
    private ExecutionStep next;

    public ExecutionStep then(ExecutionStep next) {
        this.next = next;
        return next;
    }

    public final PipelineContext process(PipelineContext ctx) {
        ctx = handle(ctx);
        if (!ctx.isAborted() && next != null) {
            return next.process(ctx);
        }
        return ctx;
    }

    protected abstract PipelineContext handle(PipelineContext ctx);
}

// Step 1: Syntax check — reject obviously broken code fast
@Component
class SyntaxValidator extends ExecutionStep {
    protected PipelineContext handle(PipelineContext ctx) {
        // Basic structural checks (balanced braces, etc.)
        // ctx.abort(Verdict.CE, "Syntax error: ...") on failure
        return ctx;
    }
}

// Step 2: Security check — block dangerous imports/syscalls
@Component
class SecurityValidator extends ExecutionStep {
    private static final Set<String> BANNED_JAVA   = Set.of("Runtime", "ProcessBuilder", "System.exit");
    private static final Set<String> BANNED_PYTHON = Set.of("os.system", "subprocess", "__import__");

    protected PipelineContext handle(PipelineContext ctx) {
        // Scan source for banned patterns per language
        // ctx.abort(Verdict.CE, "Dangerous operation detected") on match
        return ctx;
    }
}

// Step 3: Compilation (Java, C++ only)
@Component
class CompilationStep extends ExecutionStep {
    protected PipelineContext handle(PipelineContext ctx) {
        LanguageExecutor ex = factory.getExecutor(ctx.getLanguage());
        CompilationResult cr = ex.compile(ctx.getSourceCode(), ctx.getWorkDir());
        if (!cr.isSuccess()) {
            ctx.abort(Verdict.CE, cr.getErrorOutput());
        }
        return ctx;
    }
}

// Step 4: Execution against all test cases in Docker sandbox
@Component
class TestCaseExecutionStep extends ExecutionStep {
    protected PipelineContext handle(PipelineContext ctx) {
        LanguageExecutor ex = factory.getExecutor(ctx.getLanguage());
        for (TestCaseDto tc : ctx.getTestCases()) {
            ExecutionResult er = ex.execute(ctx.getWorkDir(), tc.getInput(),
                                            tc.getTimeLimitMs(), tc.getMemoryLimitMB());
            ctx.addTestResult(tc.getId(), er);
        }
        return ctx;
    }
}

// Step 5: Verdict determination
@Component
class VerdictStep extends ExecutionStep {
    protected PipelineContext handle(PipelineContext ctx) {
        // AC if all passed; otherwise first non-AC verdict wins
        ctx.setFinalVerdict(verdictService.compute(ctx.getTestResults()));
        return ctx;
    }
}

// Assembly in @Configuration
@Bean
ExecutionStep pipeline(SyntaxValidator sv, SecurityValidator secv,
                       CompilationStep cs, TestCaseExecutionStep ts, VerdictStep vs) {
    sv.then(secv).then(cs).then(ts).then(vs);
    return sv;   // head of chain
}
```

---

### 5.3 Observer (Kafka) — Event-Driven Cross-Service Updates

**Problem:** When a submission verdict is determined, both the Leaderboard and Analytics need to be updated independently — neither should block the other, and neither should be coupled to the Execution Service.

```java
// Publisher (Execution Service) — after verdict is set
@Service
class KafkaEventPublisher {
    private final KafkaTemplate<String, Object> kafka;

    public void publishSubmissionCompleted(SubmissionCompletedEvent event) {
        kafka.send("submission.completed", event.getSubmissionId().toString(), event);
    }

    public void publishContestActivated(UUID contestId) {
        kafka.send("contest.events", contestId.toString(),
                   new ContestLifecycleEvent("ACTIVATED", contestId));
    }

    public void publishContestCompleted(UUID contestId) {
        kafka.send("contest.events", contestId.toString(),
                   new ContestLifecycleEvent("COMPLETED", contestId));
    }
}

// Subscriber 1 — Leaderboard update (Contest Service, consumer group: leaderboard-group)
@Service
class LeaderboardKafkaConsumer {
    @KafkaListener(topics = "submission.completed", groupId = "leaderboard-group")
    public void onSubmission(SubmissionCompletedEvent event) {
        if (!"AC".equals(event.getVerdict())) return;
        leaderboardService.updateOnSubmission(event);
        // Invalidate Redis cache: DEL leaderboard:contest:{id}:page:*
    }
}

// Subscriber 2 — Analytics update (Contest Service, consumer group: analytics-group)
@Service
class AnalyticsKafkaConsumer {
    @KafkaListener(topics = "submission.completed", groupId = "analytics-group")
    public void onSubmission(SubmissionCompletedEvent event) {
        analyticsService.updateProblemStats(event);
    }
}
```

**Key benefit:** Adding a new subscriber (e.g., Notification Service) requires zero changes to the Execution Service. Just add a new consumer group.

---

### 5.4 Cache-Aside — Redis Leaderboard

**Problem:** Leaderboard reads are extremely frequent during active contests. Every AC submission invalidates the cache.

```java
@Service
class LeaderboardServiceImpl implements LeaderboardService {

    private static final String CACHE_KEY = "leaderboard:contest:%s:page:%d";
    private static final long   TTL_SECONDS = 30;

    @Transactional(readOnly = true)
    public Page<LeaderboardResponse> getContestLeaderboard(UUID contestId, Pageable pageable) {
        String cacheKey = String.format(CACHE_KEY, contestId, pageable.getPageNumber());

        // 1. Check Redis
        String cached = redis.opsForValue().get(cacheKey);
        if (cached != null) {
            return objectMapper.readValue(cached, new TypeReference<>() {});
        }

        // 2. Cache miss — query DB
        Page<Leaderboard> rows = leaderboardRepo.findByContestIdOrderByRankAsc(contestId, pageable);
        Page<LeaderboardResponse> result = rows.map(mapper::toResponse);

        // 3. Store in Redis with TTL
        redis.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result),
                                Duration.ofSeconds(TTL_SECONDS));
        return result;
    }

    // Called by Kafka consumer after each AC submission
    public void invalidateLeaderboardCache(UUID contestId) {
        Set<String> keys = redis.keys("leaderboard:contest:" + contestId + ":page:*");
        if (keys != null && !keys.isEmpty()) redis.delete(keys);
    }
}
```

**Cache Key Registry:**

| Key Pattern | TTL | Invalidated By |
|---|---|---|
| `leaderboard:contest:{id}:page:{n}` | 30 sec | New AC submission |
| `leaderboard:global:page:{n}` | 5 min | Contest completion |
| `contest:{id}:status` | 10 sec | Status transition |
| `problem:{id}` | 10 min | Problem update |
| `ratelimit:sub:{userId}:{problemId}` | 5 min | Auto-expire |
| `jwt:blacklist:{token}` | Remaining JWT TTL | Logout |
| `user:dashboard:{userId}` | 2 min | New verdict |

---

### 5.5 Facade — Contest Workflow

**Problem:** The `host` endpoint coordinates role upgrade (Auth), contest creation, and invite code generation — the controller should not know about this complexity.

```java
// Facade hides multi-step orchestration from the controller
@Service
class ContestHostingFacade {
    private final UserServiceClient    authClient;    // Feign / RestTemplate to Auth Service
    private final ContestService       contestService;

    /**
     * Handles:
     * 1. Role upgrade if caller is STUDENT
     * 2. Contest creation
     * 3. Invite code + link generation
     * Returns the new JWT + contestResponse in one call
     */
    public HostContestFacadeResponse hostContest(HostContestRequest req,
                                                  UUID userId, String currentRole) {
        TokenResponse newToken = null;
        if ("ROLE_STUDENT".equals(currentRole)) {
            newToken = authClient.upgradeToOrganizer(userId);
        }
        ContestResponse contest = contestService.host(req, userId);
        return new HostContestFacadeResponse(newToken, contest);
    }
}

@RestController
class ContestController {
    // Controller is thin — delegates entirely to facade
    @PostMapping("/host")
    public ResponseEntity<ApiResponse<HostContestFacadeResponse>> host(
            @Valid @RequestBody HostContestRequest req,
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader("X-User-Role") String role) {
        return ResponseEntity.status(201).body(
            ApiResponse.success("Contest hosted", facade.hostContest(req, userId, role)));
    }
}
```

---

### 5.6 Template Method — AI Prompt Processing

**Problem:** All AI features (review, hint, roadmap) share the same structure: build prompt → call LLM → parse response → store result. Only the specifics differ.

```java
// Template Method — abstract base class
abstract class AIProcessor<REQUEST, RESPONSE> {

    // Template method — fixed skeleton
    public final RESPONSE process(REQUEST request) {
        String prompt    = buildPrompt(request);         // Step 1 — varies
        String rawResult = callLLM(prompt);              // Step 2 — shared
        RESPONSE parsed  = parseResponse(rawResult);    // Step 3 — varies
        storeResult(request, parsed);                   // Step 4 — varies
        return parsed;
    }

    protected abstract String   buildPrompt(REQUEST request);
    protected abstract RESPONSE parseResponse(String rawLLMOutput);
    protected abstract void     storeResult(REQUEST request, RESPONSE result);

    // Shared LLM call via Spring AI
    private String callLLM(String prompt) {
        return chatClient.prompt(prompt).call().content();
    }
}

// Concrete AI processor — Code Review
@Service
class CodeReviewProcessor extends AIProcessor<CodeReviewRequest, AIReviewResponse> {
    protected String         buildPrompt(CodeReviewRequest req) { /* use code_review_prompt.st */ }
    protected AIReviewResponse parseResponse(String raw)        { /* parse JSON → DTO */ }
    protected void           storeResult(CodeReviewRequest r, AIReviewResponse result) { /* INSERT ai_reviews */ }
}

// Concrete AI processor — Hint Generation
@Service
class HintProcessor extends AIProcessor<HintRequest, HintResponse> {
    protected String       buildPrompt(HintRequest req)   { /* use hint_generation_prompt.st */ }
    protected HintResponse parseResponse(String raw)      { /* extract hint text */ }
    protected void         storeResult(HintRequest r, HintResponse result) { /* INSERT hint_requests */ }
}
```

---

### 5.7 Proxy / AOP — Cross-Cutting Concerns

**Problem:** Logging business milestones and rate-limit enforcement should not pollute service methods.

```java
// Custom annotation for rate limiting
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@interface RateLimited {
    int    requests() default 5;
    int    windowSeconds() default 300;
    String keyPrefix() default "ratelimit";
}

// AOP Aspect — intercepts @RateLimited methods
@Aspect @Component
class RateLimitAspect {
    @Around("@annotation(rateLimited)")
    public Object enforce(ProceedingJoinPoint pjp, RateLimited rateLimited) throws Throwable {
        String userId = extractUserIdFromContext();
        String key    = rateLimited.keyPrefix() + ":" + userId;

        Long count = redis.opsForValue().increment(key);
        if (count == 1) redis.expire(key, Duration.ofSeconds(rateLimited.windowSeconds()));

        if (count > rateLimited.requests()) {
            throw new RateLimitExceededException("Too many requests. Try again later.");
        }
        return pjp.proceed();
    }
}

// Usage in SubmissionService
@Service
class SubmissionServiceImpl implements SubmissionService {
    @RateLimited(requests = 5, windowSeconds = 300, keyPrefix = "ratelimit:sub")
    public SubmissionResponse submit(CreateSubmissionRequest req, UUID userId) {
        // business logic only — rate check is transparent
    }
}

// AOP Aspect — audit logging
@Aspect @Component @Slf4j
class AuditLoggingAspect {
    @AfterReturning("execution(* com.codeforge..Service*.*(..)) && !execution(* *.get*(..))")
    public void logBusinessEvent(JoinPoint jp) {
        log.info("Business event: {}.{}()", jp.getTarget().getClass().getSimpleName(),
                 jp.getSignature().getName());
    }
}
```

---

### 5.8 Builder — DTO & Response Construction

**Problem:** Complex response objects (e.g., `ContestResponse`, `SubmissionResponse`) with many optional fields need clean, readable construction.

```java
// Using Lombok @Builder on response records (or manual for domain objects)
@Builder
public record ContestResponse(
    UUID          id,
    String        title,
    String        description,
    LocalDateTime startTime,
    LocalDateTime endTime,
    String        status,
    String        visibility,
    String        inviteCode,
    String        inviteLink,
    int           participantCount,
    int           problemCount
) {}

// Usage in mapper
class ContestMapper {
    public ContestResponse toResponse(Contest c, int participantCount, int problemCount) {
        return ContestResponse.builder()
            .id(c.getId())
            .title(c.getTitle())
            .status(c.getStatus().name())
            .visibility(c.getVisibility().name())
            .inviteCode(c.getInviteCode())
            .inviteLink(c.getInviteLink())
            .participantCount(participantCount)
            .problemCount(problemCount)
            .build();
    }
}
```

---

## Design Pattern Summary

| Pattern | Applied In | Problem Solved |
|---|---|---|
| **Strategy** | `LanguageExecutor` hierarchy | Plug in new languages without changing orchestration code |
| **Factory** | `ExecutorFactory` | Select correct `LanguageExecutor` at runtime by language enum |
| **Chain of Responsibility** | Execution pipeline (5 steps) | Sequential validation with early exit on failure |
| **Observer / Event-Driven** | Kafka producer + consumer groups | Decouple Execution Service from Leaderboard/Analytics updates |
| **Cache-Aside** | Redis leaderboard, problem, status | Low-latency reads; invalidate on write |
| **Facade** | `ContestHostingFacade` | Hide role-upgrade + contest-create + invite-code complexity |
| **Template Method** | `AIProcessor<R,S>` | Shared LLM call skeleton; subclasses vary prompt + parse logic |
| **Proxy / AOP** | `@RateLimited`, `@AuditLogging` | Rate limiting and audit logging without polluting business methods |
| **Builder** | All response DTOs, `PipelineContext` | Readable construction of objects with many optional fields |

---

*Document Version: 1.0 | CodeForge Platform*
*Next: Implementation — Sprint 1 (Auth Service + API Gateway + Eureka)*
