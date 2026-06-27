# High Level Design (HLD)

**Project:** CodeForge — AI-Powered Coding Assessment, Contest Management & Learning Platform
**Version:** 1.7
**Status:** Draft
**Date:** 2026-06-27
**Changes:**
- v1.1: Added self-service "Host a Contest" flow with invite link/code system
- v1.2: Added OAuth2 authentication (Google, GitHub)
- v1.3: Split Assessment Service → Contest Service (8082) + Execution Service (8083)
- v1.4: Added Eureka Service Discovery, RabbitMQ execution queue, Kafka event streaming
- v1.5: Removed Organisation concept; aligned all flows, DB sections, and deployment config with current 4-service architecture
- v1.6: Scoped problems to contests — problems table gains `contest_id` FK, `points`, `sequence_no`; removed `visibility` and the `contest_problems` junction table; nested problem routes under `/contest/v1/contests/{contestId}/problems`; updated public routes, data flows, and internal service-to-service test-case fetch path
- v1.7: All Contest Service timestamps changed from `LocalDateTime` to `Instant` (UTC); implemented `ContestLifecycleScheduler` (30s polling, auto-transitions SCHEDULED→ACTIVE→COMPLETED); added `@EnableScheduling`; enhanced `GlobalExceptionHandler` with handlers for `IllegalArgumentException`, `DataIntegrityViolationException`, `HttpMessageNotReadableException`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Style](#2-architecture-style)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Microservices Breakdown](#4-microservices-breakdown)
5. [API Gateway Design](#5-api-gateway-design)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Database Design (High Level)](#7-database-design-high-level)
8. [Caching Strategy](#8-caching-strategy)
9. [Event-Driven Architecture](#9-event-driven-architecture)
10. [Security Architecture](#10-security-architecture)
11. [Execution Engine Design](#11-execution-engine-design)
12. [AI Service Design](#12-ai-service-design)
13. [Technology Stack](#13-technology-stack)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Scalability & Future Planning](#15-scalability--future-planning)
16. [Non-Functional Requirement Mapping](#16-non-functional-requirement-mapping)

---

## 1. System Overview

CodeForge is a **cloud-ready, microservice-based platform** that supports:

- Conducting time-bound coding contests and assessments
- Automated code evaluation via a sandboxed execution engine
- Real-time leaderboard generation
- AI-powered code reviews, hints, and learning roadmaps
- **Self-service contest hosting** — any authenticated user can become a Host and run their own contest

The platform serves three actor types (Students, Organizers/Hosts, Admins) and supports a **Self-Service Host** path — any user, no approval and no organisation required.

### Core Design Goals

| Goal | Approach |
|---|---|
| **Loose Coupling** | Independent microservices communicating via REST and events |
| **High Availability** | Stateless services, Redis caching, database replication |
| **Secure Execution** | Sandboxed Docker containers for code execution |
| **Scalability** | Services scale independently based on load |
| **AI Integration** | Dedicated AI service using Spring AI with LLM providers |
| **Self-Service Hosting** | Any user can host a contest — role upgrade is automatic, no admin gate |

### Contest Creation Flow

```
┌──────────────────────────────────────────────────────────┐
│                  Self-Service Contest Hosting            │
│                                                          │
│  Any user clicks "Host a Contest" → auto role-upgrade   │
│  to ROLE_ORGANIZER → creates contest in Contest Service  │
│  → generates invite link/code → participants join via   │
│  link or open registration → contest runs               │
└──────────────────────────────────────────────────────────┘
```

> **No Organisation Concept:** CodeForge does not have organisations or teams. Contests are owned by individual users (the host). The `ROLE_ORGANIZER` is a personal role upgrade, not a group membership.

---

## 2. Architecture Style

**Pattern: Microservices + Event-Driven Architecture**

```
┌──────────────────────────────────────────────────────────────┐
│                      Architecture Style                      │
│                                                              │
│   REST APIs          → Synchronous client requests           │
│   RabbitMQ Queue     → Submission spike buffering            │
│   Kafka Topics       → Async event streaming (cross-service) │
│   Eureka Discovery   → Service registry & name-based routing │
│   Redis Cache        → Low-latency data reads                │
│   JWT + OAuth2       → Stateless authentication              │
└──────────────────────────────────────────────────────────────┘
```

**Key Architectural Decisions:**

| Decision | Choice | Reason |
|---|---|---|
| Sync Communication | REST via Eureka-resolved names | Services discover each other by name — no hardcoded host/port |
| Submission Queue | **RabbitMQ** | Buffers submission spikes; Execution workers pull at their own pace — API never blocks |
| Event Streaming | **Apache Kafka** | Decouples producers (Execution, Contest) from consumers (Leaderboard, Analytics); multiple independent subscribers per topic |
| Service Discovery | **Spring Cloud Eureka** | Enables independent scaling; Gateway load-balances across registered instances |
| Auth | JWT Stateless + OAuth2 | No session storage needed; Google/GitHub one-click login |
| Code Execution | Docker containers | Isolation, security, multi-language support |
| AI Provider | Spring AI + OpenAI/Gemini | Abstracted, swappable LLM backend |
| Cache | Redis | Fast leaderboard, rate limiting, token blacklist |
| Database | PostgreSQL per service | Independent data ownership |

---

## 3. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │             React Frontend (Tailwind CSS)                │       │
│   │   Student UI | Host/Organizer Dashboard | Admin Panel    │       │
│   └──────────────────────────┬───────────────────────────────┘       │
└──────────────────────────────│───────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────────────┐
│                         API GATEWAY LAYER                            │
│   Spring Cloud Gateway (Port 8080) + Eureka-based load balancing     │
│                                                                      │
│   • JWT Validation Filter   • Rate Limiting (Redis)                  │
│   • CORS Configuration      • Route by service name (Eureka)        │
│                                                                      │
│   /auth/**        /contest/v1/**      /exec/v1/**      /ai/**        │
└──────┬─────────────────┬──────────────────┬────────────┬────────────┘
       │                 │                  │            │
       ▼                 ▼                  ▼            ▼
┌──────────────┐ ┌───────────────┐ ┌───────────────┐ ┌────────────┐
│ AUTH SERVICE │ │CONTEST SERVICE│ │  EXEC SERVICE │ │ AI SERVICE │
│  Port: 8081  │ │  Port: 8082   │ │  Port: 8083   │ │ Port: 8084 │
│              │ │               │ │               │ │            │
│ • User Mgmt  │ │ • Problems    │ │ • Submissions │ │ • Review   │
│ • JWT/OAuth2 │ │ • Contests    │ │ • RabbitMQ    │ │ • Hints    │
│ • RBAC       │ │ • Leaderboard │ │   consumer    │ │ • Roadmaps │
│              │ │ • Analytics   │ │ • Docker exec │ │            │
│              │ │ • Participants │ │ • Verdict     │ │            │
└──────┬───────┘ └───────┬───────┘ └───────┬───────┘ └─────┬──────┘
       │                 │                  │               │
       │     ┌───────────┘                  │               │
       │     │     Kafka: submission.completed ──────────────┘
       │     │     (leaderboard-group, analytics-group)
       │     │
┌──────▼─────▼──────────────────────────────────────────────────────┐
│                       INFRASTRUCTURE LAYER                        │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────┐  │
│  │ PostgreSQL  │  │    Redis     │  │  RabbitMQ  │  │  Kafka  │  │
│  │             │  │              │  │            │  │         │  │
│  │ auth_db     │  │ • JWT BList  │  │ submission │  │ topics: │  │
│  │ contest_db  │  │ • LB Cache   │  │   .queue   │  │ sub.    │  │
│  │ execution_db│  │ • Rate Limit │  │            │  │ done    │  │
│  │ ai_db       │  │ • State Cache│  │            │  │ contest │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │ .events │  │
│                                                      └─────────┘  │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │           Eureka Service Registry  (Port 8761)             │   │
│  │   All services register on startup → Gateway discovers     │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 4. Microservices Breakdown

### 4.1 Auth Service

**Port:** 8081
**Database:** `auth_db` (PostgreSQL)
**Responsibility:** All identity and access concerns

```
Auth Service
├── user/
│   ├── controller/
│   │   └── UserController       → /auth/**
│   ├── service/
│   │   ├── UserService          → Interface
│   │   └── UserServiceImpl      → Business logic
│   ├── repository/
│   │   ├── UserRepository       → JPA queries
│   │   └── RefreshTokenRepository
│   ├── entity/
│   │   ├── User                 → users table
│   │   ├── RefreshToken         → refresh_tokens table
│   │   ├── Role                 → STUDENT | ORGANIZER | ADMIN
│   │   ├── UserStatus           → ACTIVE | SUSPENDED | INACTIVE
│   │   └── AuthType             → LOCAL | OAUTH | BOTH
│   ├── mapper/
│   │   └── UserMapper           → Entity ↔ DTO mapping
│   └── dto/
│       ├── RegisterRequest
│       ├── LoginRequest
│       ├── RefreshTokenRequest
│       ├── UpdateProfileRequest
│       ├── TokenResponse
│       └── UserResponse
├── oauth2/
│   ├── controller/
│   │   └── OAuth2Controller     → /auth/oauth2/** (link/unlink)
│   ├── service/
│   │   ├── OAuth2Service        → Interface
│   │   ├── OAuth2ServiceImpl    → Link/unlink logic
│   │   └── CustomOAuth2UserService → OAuth user lookup/creation
│   ├── handler/
│   │   ├── OAuth2AuthenticationSuccessHandler → Issues JWT after OAuth success
│   │   └── OAuth2AuthenticationFailureHandler → Handles OAuth errors
│   ├── entity/
│   │   ├── OAuthProvider        → oauth_providers table
│   │   └── Provider             → GOOGLE | GITHUB
│   ├── repository/
│   │   └── OAuthProviderRepository
│   └── dto/
│       ├── OAuth2UserInfo
│       └── OAuthProviderResponse
├── shared/
│   ├── config/
│   │   ├── JpaAuditingConfig    → Enables @CreatedDate, @CreatedBy auditing
│   │   └── JwtProperties        → Binds app.jwt.* config properties
│   ├── exception/
│   │   ├── GlobalExceptionHandler → @ControllerAdvice for all errors
│   │   ├── AppException          → Base exception class
│   │   ├── EmailAlreadyExistsException
│   │   ├── InvalidCredentialsException
│   │   ├── InvalidRefreshTokenException
│   │   ├── PasswordNotSetException
│   │   ├── AccountSuspendedException
│   │   ├── AccountNotActiveException
│   │   ├── AlreadyOrganizerException
│   │   ├── UserNotFoundException
│   │   ├── ProviderAlreadyLinkedException
│   │   └── CannotUnlinkLastProviderException
│   └── response/
│       └── ApiResponse           → Standard API response wrapper
└── security/
    ├── JwtService               → Token generation & validation
    ├── GatewayAuthFilter        → Reads X-User-* headers from Gateway
    └── SecurityConfig           → Spring Security + OAuth2 config
```

**Endpoints Owned:**

| Method | Path | Access |
|---|---|---|
| `POST` | `/auth/register` | Public |
| `POST` | `/auth/login` | Public |
| `POST` | `/auth/refresh` | Public |
| `POST` | `/auth/logout` | Authenticated |
| `GET` | `/auth/profile` | Authenticated |
| `PATCH` | `/auth/profile` | Authenticated |
| **`PATCH`** | **`/auth/upgrade-to-organizer`** | **Student (self-service)** |
| **`GET`** | **`/auth/oauth2/authorize/{provider}`** | **Public (OAuth2 initiation)** |
| **`GET`** | **`/auth/oauth2/callback/{provider}`** | **Public (OAuth2 callback)** |
| **`POST`** | **`/auth/oauth2/link/{provider}`** | **Authenticated (link provider)** |
| **`DELETE`** | **`/auth/oauth2/unlink/{provider}`** | **Authenticated (unlink provider)** |
| **`GET`** | **`/auth/oauth2/providers`** | **Authenticated (list linked providers)** |

**OAuth2 Supported Providers (v1.0):**

| Provider | Scope Requested | User Data Obtained |
|---|---|---|
| **Google** | `email`, `profile` | email, name, avatar_url, google_id |
| **GitHub** | `user:email`, `read:user` | email, name, avatar_url, github_id |

---

### 4.2 Contest Service

**Port:** 8082
**Database:** `contest_db` (PostgreSQL)
**Responsibility:** Problems, Contests, Participants, Leaderboard, Analytics

```
Contest Service  (@EnableScheduling)
├── problem/
│   ├── ProblemController    → /contest/v1/contests/{contestId}/problems
│   ├── ProblemService
│   ├── ProblemRepository
│   └── TestCaseRepository
├── contest/
│   ├── ContestController    → /contest/v1/contests
│   ├── ContestService
│   ├── ContestRepository
│   ├── ParticipantRepository
│   └── scheduler/
│       └── ContestLifecycleScheduler → @Scheduled(fixedRate=30s)
├── leaderboard/
│   ├── LeaderboardController → /contest/v1/leaderboard
│   ├── LeaderboardService
│   └── LeaderboardRepository
├── analytics/
│   ├── AnalyticsController  → /contest/v1/analytics
│   └── AnalyticsService
└── shared/
    ├── config/
    │   └── JpaAuditingConfig    → Enables @CreatedDate, @LastModifiedDate auditing
    ├── exception/
    │   ├── GlobalExceptionHandler → AppException, validation, illegal arg, data integrity, unreadable body
    │   ├── AppException, ContestNotFoundException, ProblemNotFoundException
    │   ├── InvalidContestStateException, DuplicateProblemTitleException
    │   ├── AlreadyRegisteredException, ContestFullException
    │   ├── InvalidInviteCodeException, UnauthorizedAccessException
    └── response/
        └── ApiResponse          → Standard wrapper (timestamp is Instant/UTC)
```

> **Design Decision:** Problems are scoped to contests — there is no standalone problem library. A host creates problems within their contest. Problems are only visible to registered participants during an ACTIVE contest.

**Endpoints Owned:**

| Method | Path | Access |
|---|---|---|
| `POST` | `/contest/v1/contests/{cId}/problems` | Contest Host |
| `GET` | `/contest/v1/contests/{cId}/problems` | Contest Host / Participants (ACTIVE) |
| `GET` | `/contest/v1/contests/{cId}/problems/{pId}` | Contest Host / Participants (ACTIVE) |
| `PATCH` | `/contest/v1/contests/{cId}/problems/{pId}` | Contest Host |
| `POST` | `/contest/v1/contests/{cId}/problems/{pId}/testcases` | Contest Host |
| `PATCH` | `/contest/v1/contests/{cId}/problems/{pId}/publish` | Contest Host |
| `DELETE` | `/contest/v1/contests/{cId}/problems/{pId}` | Contest Host |
| `POST` | `/contest/v1/contests` | Organizer, Admin |
| **`POST`** | **`/contest/v1/contests/host`** | **Any Authenticated User** |
| `GET` | `/contest/v1/contests` | All |
| `GET` | `/contest/v1/contests/explore` | All |
| `GET` | `/contest/v1/contests/{id}` | All |
| `PATCH` | `/contest/v1/contests/{id}/schedule` | Contest Host |
| `POST` | `/contest/v1/contests/{id}/cancel` | Contest Host |
| `POST` | `/contest/v1/contests/{id}/register` | Student |
| **`POST`** | **`/contest/v1/contests/join`** | **Authenticated (invite code)** |
| **`GET`** | **`/contest/v1/contests/join/{inviteCode}`** | **Authenticated** |
| `GET` | `/contest/v1/leaderboard/contest/{contestId}` | All |
| `GET` | `/contest/v1/leaderboard/global` | All |
| `GET` | `/contest/v1/analytics/contest/{contestId}` | Contest Host |
| `GET` | `/contest/v1/analytics/user/dashboard` | Student |

---

### 4.3 Execution Service

**Port:** 8083
**Database:** `execution_db` (PostgreSQL)
**Responsibility:** Submission intake, code execution sandbox, verdict generation

```
Execution Service
├── submission/
│   ├── SubmissionController → /exec/v1/submissions
│   ├── SubmissionService
│   └── SubmissionRepository
├── execution/
│   ├── ExecutionService     → Orchestrates execution pipeline
│   ├── ExecutorFactory      → Factory Pattern
│   ├── LanguageExecutor     → Strategy Interface
│   ├── JavaExecutor         → Strategy Impl
│   ├── PythonExecutor       → Strategy Impl
│   ├── CppExecutor          → Strategy Impl
│   └── JavaScriptExecutor   → Strategy Impl
└── verdict/
    └── VerdictService       → Determines final verdict
```

**Endpoints Owned:**

| Method | Path | Access |
|---|---|---|
| `POST` | `/exec/v1/submissions` | Student, Organizer |
| `GET` | `/exec/v1/submissions/{id}` | Authenticated |
| `GET` | `/exec/v1/submissions` | Authenticated |

---

### 4.4 AI Service

**Port:** 8084
**Database:** `ai_db` (PostgreSQL)
**Responsibility:** All AI-powered features via Spring AI

```
AI Service
├── review/
│   ├── AIReviewController   → /ai/review
│   ├── AIReviewService
│   └── AIReviewRepository
├── hint/
│   ├── HintController       → /ai/hint
│   ├── HintService
│   └── HintRepository
├── roadmap/
│   ├── RoadmapController    → /ai/roadmap
│   ├── RoadmapService
│   └── RoadmapRepository
├── interview/
│   ├── InterviewController  → /ai/interview
│   └── InterviewService
└── config/
    └── SpringAIConfig       → LLM provider config
```

**Endpoints Owned:**

| Method | Path | Access |
|---|---|---|
| `POST` | `/ai/review` | Student |
| `GET` | `/ai/review/{submissionId}` | Student (owner) |
| `POST` | `/ai/hint` | Student |
| `GET` | `/ai/hint/{problemId}` | Student |
| `GET` | `/ai/roadmap` | Student |
| `POST` | `/ai/roadmap/refresh` | Student |
| `GET` | `/ai/interview/questions` | Student |

---

### 4.5 API Gateway

**Port:** 8080
**Responsibility:** Single entry point, routing, auth validation, rate limiting

```
API Gateway
├── Route: /auth/**            → Auth Service (8081)
├── Route: /contest/v1/**      → Contest Service (8082)
├── Route: /exec/v1/**         → Execution Service (8083)
├── Route: /ai/**              → AI Service (8084)
├── Filter: JwtValidationFilter   → Validates JWT on protected routes
├── Filter: RateLimitFilter       → Redis-backed rate limiting
└── Filter: CorsFilter            → Cross-origin config
```

**Public Routes (No JWT Required):**
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/oauth2/authorize/{provider}`
- `GET /auth/oauth2/callback/{provider}`
- `GET /contest/v1/contests` (public contests)
- `GET /contest/v1/contests/explore` (discovery feed)

> **Note:** The invite link preview (`GET /contest/v1/contests/join/{inviteCode}`) is **NOT** a public route. Users must be authenticated to view the contest preview or join. Unauthenticated visitors clicking an invite link are redirected to login first, then returned to the invite URL after authentication.

---

## 5. API Gateway Design

```
Incoming Request
      │
      ▼
┌─────────────────────────────┐
│       CORS Filter           │  → Apply CORS headers
└────────────┬────────────────┘
             │
      ▼
┌─────────────────────────────┐
│    Rate Limit Filter        │  → Check Redis for IP/user rate
│    (Redis Token Bucket)     │  → 429 if exceeded
└────────────┬────────────────┘
             │
      ▼
┌─────────────────────────────┐
│   JWT Validation Filter     │  → Skip for public routes
│                             │  → Validate signature + expiry
│                             │  → Check blacklist in Redis
│                             │  → Extract claims → forward as header
└────────────┬────────────────┘
             │
      ▼
┌─────────────────────────────┐
│      Route Matching         │  → Match route by path prefix
└────────────┬────────────────┘
             │
      ▼
┌─────────────────────────────┐
│    Forward to Service       │  → Pass X-User-Id, X-User-Role headers
│                             │  → Downstream service trusts headers
└─────────────────────────────┘
```

**Headers forwarded to downstream services after JWT validation:**

| Header | Value | Example |
|---|---|---|
| `X-User-Id` | JWT claim: userId | `uuid-1234` |
| `X-User-Email` | JWT claim: email | `john@uni.edu` |
| `X-User-Role` | JWT claim: role | `ROLE_STUDENT` |

> Downstream services trust these headers — they do NOT re-validate JWT themselves.

---

## 6. Data Flow Diagrams

### 6.1 User Login Flow (Credentials)

```
Client
  │
  │ POST /auth/login { email, password }
  ▼
API Gateway
  │ (Public route — skip JWT filter)
  ▼
Auth Service
  │
  ├── Validate input
  ├── Lookup User by email
  ├── BCrypt.verify(password, hash)
  ├── Generate JWT AccessToken (15 min)
  ├── Generate RefreshToken (7 days) → store in DB
  └── Return { accessToken, refreshToken, profile }
  │
  ▼
Client stores tokens
```

---

### 6.2 OAuth2 Login Flow (Google / GitHub)

```
User clicks "Login with Google" / "Login with GitHub"
  │
  ▼
Client → GET /auth/oauth2/authorize/google
  │         (or /auth/oauth2/authorize/github)
  ▼
Auth Service (Spring Security OAuth2 Client)
  ├── Build OAuth2 authorization URL with state + PKCE
  └── Redirect → https://accounts.google.com/o/oauth2/auth?...
  │
  ▼
User authenticates on Google/GitHub
  │
  ▼
Google/GitHub → GET /auth/oauth2/callback/google?code=AUTH_CODE&state=...
  │
  ▼
Auth Service — OAuth2SuccessHandler
  ├── Exchange AUTH_CODE for access_token via Google/GitHub API
  ├── Fetch user info: { email, name, avatar_url, provider_id }
  │
  ├── [CASE A] User with this email already exists in DB:
  │         ├── Upsert oauth_providers record (link provider)
  │         └── Use existing user account
  │
  ├── [CASE B] New user (email not in DB):
  │         ├── Create new User { role: STUDENT, status: ACTIVE }
  │         │   password = NULL (OAuth user has no password)
  │         ├── Create oauth_providers record
  │         └── Log registration event
  │
  ├── Generate JWT AccessToken (15 min)
  ├── Generate RefreshToken (7 days)
  └── Redirect → https://codeforge.io/auth/callback
                  ?accessToken=...&refreshToken=...
  │
  ▼
Frontend stores tokens and redirects to dashboard
```

> **Security Note:** Tokens are passed via redirect URL fragment (`#`) not query params in production, or via a short-lived one-time code exchanged by the frontend.

---

### 6.3 Code Submission Flow

```
Client
  │
  │ POST /exec/v1/submissions { problemId, contestId, code, language }
  │ Authorization: Bearer <accessToken>
  ▼
API Gateway (resolves 'execution-service' via Eureka)
  ├── JwtValidationFilter → validates token
  ├── Injects X-User-Id, X-User-Role headers
  ▼
Execution Service — SubmissionController
  │
  ├── Validate: language supported, code not empty
  ├── Validate: rate limit (Redis) → max 5 submissions / 5 min
  ├── Call Contest Service (via Eureka): GET /contest/v1/contests/{contestId}/status
  │         └── Validate: contest is ACTIVE
  ├── Call Contest Service (via Eureka): GET /contest/v1/contests/{contestId}/participants/{userId}
  │         └── Validate: user is registered participant
  ├── Call Contest Service (via Eureka): GET /contest/v1/contests/{contestId}/problems/{problemId}/testcases
  │         └── Fetch hidden test cases for evaluation
  ├── Create Submission record { status: PENDING } in execution_db
  ├── Return HTTP 202 { submissionId }   ← API responds immediately, never blocks
  │
  └── Publish to RabbitMQ: queue → "submission.queue"
            { submissionId, code, language, testCases, limits }
            │
            ▼
     RabbitMQ — submission.queue
            │  (buffers spike; workers consume at own pace)
            ▼
     Execution Worker (ExecutionService consumer)
            │
            ├── ExecutorFactory.getExecutor(language)
            │         → JavaExecutor / PythonExecutor / CppExecutor
            │
            ├── [Docker Sandbox] Compile code
            │         → On failure → verdict: CE, store error message
            │
            ├── [Docker Sandbox] Execute against each hidden test case
            │         → Record: passed/failed, time(ms), memory(MB)
            │
            ├── Determine final verdict (first non-AC or all AC)
            ├── Update Submission record { verdict, time, memory } in execution_db
            │
            └── Publish to Kafka: topic → "submission.completed"
                      { submissionId, userId, contestId, problemId, verdict, score }
                      │
            ┌─────────┴──────────────────────────────────────┐
            ▼                                                ▼
   Contest Service                               Contest Service
   (LeaderboardService)                         (AnalyticsService)
   [Kafka Consumer Group: leaderboard]          [Kafka Consumer Group: analytics]
            │                                                │
            ├── Recalculate rank                            └── Update problem stats
            ├── Update leaderboard in contest_db                (acceptance rate,
            └── Invalidate Redis leaderboard cache              avg solve time)
```

---

### 6.4 Leaderboard Request Flow

```
Client
  │
  │ GET /contest/v1/leaderboard/contest/{contestId}?page=0&size=50
  ▼
API Gateway → Contest Service
  │
  ├── Check Redis Cache → key: "leaderboard:contest:{id}:page:0"
  │         ├── CACHE HIT  → Return cached response (< 1ms)
  │         └── CACHE MISS
  │                  │
  │                  ├── Query contest_db leaderboard table
  │                  ├── Calculate ranks
  │                  ├── Store in Redis (TTL: 30 seconds)
  │                  └── Return response
```

---

### 6.4 AI Code Review Flow

```
Client
  │
  │ POST /ai/review { submissionId }
  │ Authorization: Bearer <accessToken>
  ▼
API Gateway → AI Service
  │
  ├── Check if review already exists in ai_db
  │         ├── EXISTS → Return stored review
  │         └── NOT EXISTS
  │                  │
  │                  ├── Fetch submission code from Execution Service
  │                  │   GET /exec/v1/submissions/{id}  (internal call via Eureka)
  │                  │
  │                  ├── Build prompt:
  │                  │   "Review this {language} code for problem: {title}
  │                  │    Verdict: {verdict}. Analyze quality, complexity,
  │                  │    best practices, and suggest improvements."
  │                  │
  │                  ├── Call LLM via Spring AI (async)
  │                  ├── Parse structured response
  │                  ├── Store AIReview in ai_db
  │                  └── Return { status: PROCESSING, reviewId }
  │
  └── [Polling] GET /ai/review/{submissionId}
              └── Returns review when ready
```

---

### 6.5 Contest Lifecycle Flow

```
Organizer creates Contest (DRAFT)
  │
  ├── Adds Problems to Contest
  ├── Sets Start Time & End Time (Instant/UTC)
  │
  ▼
Organizer schedules Contest (DRAFT → SCHEDULED)
  │
  └── ContestLifecycleScheduler polls every 30 seconds

  [ContestLifecycleScheduler — @Scheduled(fixedRate = 30000)]
  │
  ├── Checks: status=SCHEDULED AND startTime <= Instant.now()
  │     └── Transitions to ACTIVE, logs activation
  │
  ├── Checks: status=ACTIVE AND endTime <= Instant.now()
  │     └── Transitions to COMPLETED, logs completion
  │
  [During ACTIVE]
  Students submit code → Execution → Leaderboard updates

  [On COMPLETED]
  ├── Submissions LOCKED (application-level check)
  └── Final leaderboard generated & frozen
```

> **Implementation Note:** The lifecycle scheduler uses a single `@Scheduled` method with a 30-second fixed rate. It queries `ContestRepository.findByStatusAndStartTimeBefore()` and `findByStatusAndEndTimeBefore()` to find contests due for transition. All timestamps use `Instant` (UTC) to avoid timezone ambiguity.

---

### 6.6 Host a Contest Flow (Self-Service)

```
Authenticated User (ROLE_STUDENT or ROLE_ORGANIZER)
  │
  │ Click "Host a Contest" in UI
  ▼
Client → PATCH /auth/upgrade-to-organizer
  │  (only called if user is currently ROLE_STUDENT)
  ▼
Auth Service
  ├── Check: user is ACTIVE
  ├── Update user.role = ROLE_ORGANIZER in auth_db
  ├── Invalidate current access token in Redis
  ├── Issue new JWT { role: ROLE_ORGANIZER }
  ├── Log role upgrade event
  └── Return { accessToken, refreshToken }
  │
  ▼
Client stores new tokens
  │
  ▼
Client → POST /contest/v1/contests/host
  │  { title, description, startTime, endTime,
  │    visibility, joinMode, maxParticipants, scoringMode }
  │  Authorization: Bearer <newAccessToken with ROLE_ORGANIZER>
  ▼
API Gateway (resolves 'contest-service' via Eureka)
  ├── JWT validated: ROLE_ORGANIZER confirmed
  ▼
Contest Service — ContestController
  ├── Validate all contest fields
  ├── Create Contest { status: DRAFT, hostId: userId }
  ├── Generate unique 8-char INVITE CODE
  ├── Build INVITE LINK = "https://codeforge.io/join/{inviteCode}"
  ├── Store invite_code, invite_link in contests table (contest_db)
  └── Return HTTP 201:
        {
          contestId,
          inviteCode: "XF8K2P9A",
          inviteLink: "https://codeforge.io/join/XF8K2P9A",
          status: "DRAFT"
        }
  │
  ▼
Host shares invite link via:
  - WhatsApp / Telegram
  - Email
  - Social Media
  - Embedded in website

> Note: There is no organisation layer. The contest is owned directly by the
> host user (host_id = userId). The host can add problems, manage participants,
> and view analytics for their own contests only.
```

---

### 6.7 Join Contest via Invite Link / Code

> **Authentication is mandatory.** No public participation is allowed. Users must be logged in before they can view a contest preview or register. Invite links redirect unauthenticated visitors to login, then back to the invite URL.

```
Participant receives invite link: https://codeforge.io/join/XF8K2P9A
  │
  ▼
Browser navigates to invite URL
  │
  [If user is NOT logged in]
  │   Frontend detects missing/expired JWT
  │   → Redirect to /login?redirect=/join/XF8K2P9A
  │   → User logs in (credentials or OAuth2)
  │   → Redirected back to /join/XF8K2P9A with valid JWT
  │
  [User is now authenticated]
  │
  ▼
Client → GET /contest/v1/contests/join/{inviteCode}
  │  Authorization: Bearer <accessToken>   ← JWT required
  ▼
API Gateway → JwtValidationFilter validates token → Contest Service
  ├── Resolve invite code → find contest in contest_db
  ├── Return contest preview:
  │     { title, hostName, startTime, endTime,
  │       status, participantCount, problemCount }
  │
  ▼
UI shows: "Join Contest" page with contest preview (user already logged in)
  │
  ▼
Authenticated User → POST /contest/v1/contests/join
  │  { inviteCode: "XF8K2P9A" }
  │  Authorization: Bearer <accessToken>
  ▼
API Gateway (resolves 'contest-service' via Eureka) → Contest Service
  ├── Validate JWT: user identity confirmed
  ├── Resolve invite code → contest
  ├── Validate: contest is SCHEDULED or ACTIVE
  ├── Validate: user not already registered
  ├── Validate: maxParticipants not reached
  ├── Create ContestParticipant record in contest_db
  └── Return HTTP 200:
        {
          message: "Successfully joined!",
          contestId,
          startTime,
          problemCount
        }
  │
  ▼
Participant sees contest lobby / countdown timer
```

**API Gateway enforcement:**
- `GET /contest/v1/contests/join/{inviteCode}` → **JWT required** (returns HTTP 401 if missing)
- `POST /contest/v1/contests/join` → **JWT required** (returns HTTP 401 if missing)
- No contest data is returned to unauthenticated callers under any path

---

## 7. Database Design (High Level)

### 7.1 Auth Database (`auth_db`)

```
┌─────────────────────────────────────────────────────┐
│                     users                           │
├──────────────┬────────────────────────────────────  │
│ id           │ UUID (PK)                             │
│ full_name    │ VARCHAR(100)                          │
│ email        │ VARCHAR(255) UNIQUE NOT NULL          │
│ password     │ VARCHAR(255) NULL [BCrypt / NULL for OAuth] │
│ role         │ ENUM(STUDENT, ORGANIZER, ADMIN)       │
│ status       │ ENUM(ACTIVE, SUSPENDED, INACTIVE)     │
│ avatar_url   │ VARCHAR(500) NULL [from OAuth]        │  ← NEW
│ auth_type    │ ENUM(LOCAL, OAUTH, BOTH) DEFAULT LOCAL│  ← NEW
│ created_at   │ TIMESTAMP                             │
│ updated_at   │ TIMESTAMP                             │
│ created_by   │ VARCHAR                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  oauth_providers                    │  ← NEW TABLE
├──────────────┬──────────────────────────────────────┤
│ id           │ UUID (PK)                             │
│ user_id      │ UUID FK → users                       │
│ provider     │ ENUM(GOOGLE, GITHUB)                  │
│ provider_id  │ VARCHAR(255) [Google/GitHub user ID]  │
│ provider_email│ VARCHAR(255)                         │
│ avatar_url   │ VARCHAR(500)                          │
│ linked_at    │ TIMESTAMP                             │
│              │ UNIQUE(user_id, provider)             │
│              │ UNIQUE(provider, provider_id)         │
└─────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│           refresh_tokens             │
├──────────┬───────────────────────────┤
│ id       │ UUID (PK)                  │
│ user_id  │ UUID FK → users            │
│ token    │ TEXT                       │
│ expires_at│ TIMESTAMP                 │
│ revoked  │ BOOLEAN DEFAULT FALSE      │
│ created_at│ TIMESTAMP                 │
└──────────────────────────────────────┘
```

---

### 7.2 Contest Database (`contest_db`)

> **Owned by:** Contest Service (Port 8082)
> **Timestamp convention:** All timestamps in contest_db use `Instant` (UTC) — stored as `TIMESTAMP WITH TIME ZONE` in PostgreSQL. No `LocalDateTime` is used.

```
┌──────────────────────────────────────────────────────┐
│                      problems                        │
│   (scoped to a contest — no standalone library)      │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ contest_id    │ UUID FK → contests (NOT NULL)         │
│ title         │ VARCHAR(200) (unique per contest)     │
│ description   │ TEXT (Markdown)                       │
│ difficulty    │ ENUM(EASY, MEDIUM, HARD)              │
│ category      │ ENUM(ARRAYS, STRINGS, GRAPHS, ...)    │
│ time_limit    │ INTEGER (seconds)                     │
│ memory_limit  │ INTEGER (MB)                          │
│ input_format  │ VARCHAR(2000)                         │
│ output_format │ VARCHAR(2000)                         │
│ constraints_text│ VARCHAR(2000)                       │
│ explanation   │ TEXT (nullable)                       │
│ tags          │ VARCHAR(500) (nullable)               │
│ points        │ INTEGER (score within the contest)    │
│ sequence_no   │ INTEGER (display order in contest)    │
│ status        │ ENUM(DRAFT, PUBLISHED)                │
│ created_by    │ UUID (user_id from auth_db, no FK)    │
│ created_at    │ TIMESTAMP WITH TIME ZONE (Instant)    │
│ updated_at    │ TIMESTAMP WITH TIME ZONE (Instant)    │
│ deleted_at    │ TIMESTAMP WITH TIME ZONE (soft delete)│
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                     test_cases                       │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ problem_id    │ UUID FK → problems                    │
│ input         │ TEXT                                  │
│ expected_output│ TEXT                                 │
│ type          │ ENUM(SAMPLE, HIDDEN)                  │
│ score_weight  │ INTEGER DEFAULT 1                     │
│ created_at    │ TIMESTAMP WITH TIME ZONE (Instant)    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                      contests                        │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ title         │ VARCHAR(200)                          │
│ description   │ TEXT                                  │
│ start_time    │ TIMESTAMP WITH TIME ZONE (Instant)    │
│ end_time      │ TIMESTAMP WITH TIME ZONE (Instant)    │
│ status        │ ENUM(DRAFT, SCHEDULED, ACTIVE,        │
│               │      COMPLETED, CANCELLED)            │
│ visibility    │ ENUM(PUBLIC, PRIVATE)                 │
│ reg_type      │ ENUM(OPEN, INVITE_ONLY)               │
│ scoring_mode  │ ENUM(POINTS, PENALTY_TIME, PERCENTAGE)│
│ max_participants│ INTEGER NULL                        │
│ invite_code   │ VARCHAR(8) UNIQUE                     │
│ invite_link   │ VARCHAR(500)                          │
│ host_id       │ UUID (user_id from auth_db, no FK)    │
│ created_by    │ UUID (user_id from auth_db, no FK)    │
│ created_at    │ TIMESTAMP WITH TIME ZONE (Instant)    │
│ updated_at    │ TIMESTAMP WITH TIME ZONE (Instant)    │
│ deleted_at    │ TIMESTAMP WITH TIME ZONE (soft delete)│
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                contest_participants                   │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ contest_id    │ UUID FK → contests                    │
│ user_id       │ UUID (user_id from auth_db, no FK)    │
│ registered_at │ TIMESTAMP WITH TIME ZONE (Instant)    │
│               │ UNIQUE(contest_id, user_id)           │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                    leaderboard                       │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ contest_id    │ UUID FK → contests                    │
│ user_id       │ UUID (user_id from auth_db, no FK)    │
│ rank          │ INTEGER                               │
│ score         │ INTEGER                               │
│ penalty_time  │ INTEGER (minutes)                     │
│ problems_solved│ INTEGER                              │
│ last_ac_time  │ TIMESTAMP WITH TIME ZONE (Instant)    │
│ updated_at    │ TIMESTAMP WITH TIME ZONE (Instant)    │
│               │ UNIQUE(contest_id, user_id)           │
└──────────────────────────────────────────────────────┘
```

---

### 7.3 Execution Database (`execution_db`)

> **Owned by:** Execution Service (Port 8083)

```
┌──────────────────────────────────────────────────────┐
│                    submissions                       │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ user_id       │ UUID (from auth_db, no FK)            │
│ problem_id    │ UUID (from contest_db, no FK)         │
│ contest_id    │ UUID (from contest_db, nullable, no FK│
│ language      │ ENUM(JAVA, PYTHON, CPP, JAVASCRIPT)   │
│ source_code   │ TEXT                                  │
│ verdict       │ ENUM(PENDING, AC, WA, CE, RE,         │
│               │      TLE, MLE)                        │
│ execution_time│ INTEGER (ms)                          │
│ memory_used   │ INTEGER (MB)                          │
│ error_message │ TEXT (nullable)                       │
│ submitted_at  │ TIMESTAMP                             │
│ created_at    │ TIMESTAMP                             │
│ updated_at    │ TIMESTAMP                             │
│ created_by    │ VARCHAR(255)                          │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│               submission_test_results                │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ submission_id │ UUID FK → submissions                 │
│ test_case_id  │ UUID (from contest_db, no FK)         │
│ passed        │ BOOLEAN                               │
│ execution_time│ INTEGER (ms)                          │
│ memory_used   │ INTEGER (MB)                          │
│ actual_output │ TEXT (nullable)                       │
│ created_at    │ TIMESTAMP                             │
└──────────────────────────────────────────────────────┘
```

---

### 7.3 AI Database (`ai_db`)

```
┌──────────────────────────────────────────────────────┐
│                    ai_reviews                        │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ submission_id │ UUID (from Execution Service)         │
│ user_id       │ UUID                                  │
│ quality_score │ INTEGER (0-100)                       │
│ feedback      │ JSONB (structured sections)           │
│ time_complexity│ VARCHAR(50)                          │
│ space_complexity│ VARCHAR(50)                         │
│ status        │ ENUM(PENDING, COMPLETED, FAILED)      │
│ created_at    │ TIMESTAMP                             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                   hint_requests                      │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ user_id       │ UUID                                  │
│ problem_id    │ UUID                                  │
│ hint_level    │ INTEGER (1, 2, 3)                     │
│ hint_content  │ TEXT                                  │
│ created_at    │ TIMESTAMP                             │
│               │ UNIQUE(user_id, problem_id, hint_level)│
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                  learning_roadmaps                   │
├───────────────┬──────────────────────────────────────┤
│ id            │ UUID (PK)                             │
│ user_id       │ UUID UNIQUE                           │
│ weak_topics   │ JSONB                                 │
│ recommended   │ JSONB                                 │
│ practice_problems│ JSONB                              │
│ generated_at  │ TIMESTAMP                             │
│ refreshed_at  │ TIMESTAMP                             │
└──────────────────────────────────────────────────────┘
```

---

## 8. Caching Strategy

**Technology:** Redis

| Cache Key Pattern | Data Cached | TTL | Invalidation Trigger |
|---|---|---|---|
| `leaderboard:contest:{id}:page:{n}` | Paginated leaderboard | 30 seconds | New AC submission for contest |
| `leaderboard:global:page:{n}` | Global rankings | 5 minutes | Contest completion |
| `contest:{id}:status` | Contest status | 10 seconds | Contest state transition |
| `problem:{id}` | Problem detail | 10 minutes | Problem update |
| `ratelimit:sub:{userId}:{problemId}` | Submission count | 5 minutes | Auto-expire |
| `jwt:blacklist:{token}` | Logged out tokens | Remaining TTL | Logout event |
| `user:dashboard:{userId}` | User stats | 2 minutes | New submission verdict |

---

## 9. Event-Driven Architecture

**Technology:** Apache Kafka (cross-service) + RabbitMQ (execution work queue)

### 9.1 RabbitMQ — Submission Work Queue

RabbitMQ buffers submission spikes between the Execution Service API and its own internal workers. It is **intra-service** (Execution Service only).

| Queue | Producer | Consumer | Purpose |
|---|---|---|---|
| `submission.queue` | SubmissionController | ExecutionService (worker) | Decouple API intake from Docker sandbox execution |

### 9.2 Kafka — Cross-Service Event Streaming

Kafka carries events **across services**. Each topic can have multiple independent consumer groups.

| Topic | Publisher | Consumer Groups | Trigger |
|---|---|---|---|
| `submission.completed` | Execution Service | `leaderboard-group` (Contest Service), `analytics-group` (Contest Service) | Verdict assigned after Docker execution |
| `contest.events` | Contest Service (Scheduler) | Future: Notification Service | Contest activated / completed |

### 9.3 Event Flow: Submission Completed

```
Execution Service (Worker)
    │
    ├── Verdict determined
    ├── Update submission record in execution_db
    │
    └── Publish to Kafka: topic → "submission.completed"
              { submissionId, userId, contestId, problemId, verdict, score }
              │
    ┌─────────┴──────────────────────────────────┐
    ▼                                            ▼
Contest Service                        Contest Service
(leaderboard-group)                    (analytics-group)
    │                                            │
    ├── Recalculate rank                         └── Update problem stats
    ├── Update leaderboard in contest_db              (acceptance rate,
    └── Invalidate Redis leaderboard cache             avg solve time)
```

### 9.4 Event Flow: Contest Lifecycle

```
ContestLifecycleScheduler — @Scheduled(fixedRate = 30000)
    │
    │─ findByStatusAndStartTimeBefore(SCHEDULED, Instant.now())
    ├── [For each due contest] → Status: SCHEDULED → ACTIVE
    │       └── (Future: Publish to Kafka: "contest.events" { type: ACTIVATED, contestId })
    │
    │─ findByStatusAndEndTimeBefore(ACTIVE, Instant.now())
    └── [For each expired contest] → Status: ACTIVE → COMPLETED
            ├── Lock submissions (application-level check)
            ├── Freeze leaderboard
            └── (Future: Publish to Kafka: "contest.events" { type: COMPLETED, contestId })
```

> **Current State:** The scheduler transitions contest status and logs the event. Kafka publishing for contest lifecycle events is planned for when the Execution Service is integrated.

---

## 10. Security Architecture

### 10.1 Authentication Flow

**Flow A — Credential Login (email + password):**
```
[Client] ──POST /auth/login──► [Auth Service]
                                    │
                            BCrypt verify password
                                    │
                            Generate JWT (15 min)
                            Generate RefreshToken (7 days)
                                    │
[Client] ◄── { accessToken, refreshToken } ──
```

**Flow B — OAuth2 Login (Google / GitHub):**
```
[Client] ──GET /auth/oauth2/authorize/google──► [Auth Service]
                                                      │
                                          Redirect to Google OAuth
                                                      │
                                          User authenticates
                                                      │
                                    Google callback → /auth/oauth2/callback/google
                                                      │
                                          Fetch user info from Google
                                          Lookup / create User in DB
                                          Link oauth_providers record
                                          Generate JWT (15 min)
                                          Generate RefreshToken (7 days)
                                                      │
[Client] ◄── redirect with { accessToken, refreshToken } ──
```

**Flow C — Protected API call (same for both flows):**
```
[Client] ──GET /contest/v1/contests/{cId}/problems──► [API Gateway]
                                        │
                                  JwtValidationFilter:
                                  1. Extract Bearer token
                                  2. Verify signature (HMAC-SHA256)
                                  3. Check expiry
                                  4. Check Redis blacklist
                                  5. Extract claims
                                        │
                                  Forward with headers:
                                   X-User-Id, X-User-Email, X-User-Role
                                         │
                               ──► [Contest Service / Execution Service / AI Service]
                                   @PreAuthorize("hasRole('STUDENT')")
```

### 10.2 Security Layers

| Layer | Mechanism |
|---|---|
| **Transport** | HTTPS (TLS 1.2+) |
| **Credential Auth** | JWT (HMAC-SHA256, 15-min access token) + BCrypt passwords |
| **OAuth2 Auth** | Spring Security OAuth2 Client (Google, GitHub) |
| **OAuth2 Token Safety** | State parameter + PKCE to prevent CSRF/interception |
| **Authorization** | RBAC via `@PreAuthorize` in each service |
| **Password Storage** | BCrypt (strength 10) — `NULL` for OAuth-only users |
| **Token Revocation** | Redis blacklist on logout |
| **Rate Limiting** | Redis token bucket (API Gateway + Submission) |
| **Code Execution** | Docker sandbox (no network, no filesystem) |
| **Input Validation** | Bean Validation on all request DTOs |
| **SQL Injection** | JPA/Hibernate parameterized queries only |
| **Secrets Management** | Environment variables (never hardcoded) |
| **OAuth Secrets** | Client ID/Secret stored in env vars, never in code |

### 10.3 JWT Structure

```json
Header: { "alg": "HS256", "typ": "JWT" }

Payload: {
  "sub": "uuid-user-id",
  "email": "user@example.com",
  "role": "ROLE_STUDENT",
  "iat": 1718700000,
  "exp": 1718700900
}

Signature: HMAC-SHA256(base64(header) + "." + base64(payload), SECRET)
```

---

## 11. Execution Engine Design

The execution engine lives inside the **Execution Service (Port 8083)**, implementing the **Strategy + Factory + Chain of Responsibility** patterns for multi-language, sandboxed code execution.

### 11.1 Class Design

```
«interface»
LanguageExecutor
├── CompilationResult compile(String sourceCode, String workDir)
├── ExecutionResult execute(String workDir, String input, int timeLimitMs, int memoryLimitMB)
└── Language getLanguage()

JavaExecutor       implements LanguageExecutor
PythonExecutor     implements LanguageExecutor
CppExecutor        implements LanguageExecutor
JavaScriptExecutor implements LanguageExecutor

ExecutorFactory
└── getExecutor(Language language) → LanguageExecutor
    [Uses Map<Language, LanguageExecutor> injected by Spring]
```

### 11.2 Execution Pipeline (Chain of Responsibility)

```
Submission Received
       │
       ▼
┌──────────────────────┐
│  SyntaxValidator     │  → Reject obviously malformed code
└──────────┬───────────┘
           │
       ▼
┌──────────────────────┐
│  SecurityValidator   │  → Check for dangerous imports/syscalls
│                      │    (e.g., Runtime.exec, os.system)
└──────────┬───────────┘
           │
       ▼
┌──────────────────────┐
│  CompilationHandler  │  → Compile (if needed)
│                      │  → On failure → verdict: CE
└──────────┬───────────┘
           │
       ▼
┌──────────────────────┐
│  ExecutionHandler    │  → Run against each test case in sandbox
│                      │  → Enforce time + memory limits
│                      │  → Record per-test result
└──────────┬───────────┘
           │
       ▼
┌──────────────────────┐
│  VerdictHandler      │  → Determine final verdict from results
│                      │  → Build SubmissionResult
└──────────────────────┘
```

### 11.3 Execution Constraints

| Language | Compile Command | Execute Command | Extra Sandbox Rules |
|---|---|---|---|
| Java 17 | `javac Main.java` | `java -Xmx{mem}m Main` | No network, no file I/O |
| Python 3.11 | N/A | `python3 solution.py` | No `os`, no `subprocess` |
| C++ 17 | `g++ -O2 -o main main.cpp` | `./main` | No network |
| JavaScript | N/A | `node solution.js` | No `fs`, no `child_process` |

---

## 12. AI Service Design

### 12.1 Spring AI Integration

```
AI Service
    │
    ├── ChatClient (Spring AI)
    │       └── Configured LLM Provider:
    │               Option A: OpenAI GPT-4o
    │               Option B: Google Gemini Pro
    │               (Swappable via config)
    │
    └── Prompt Templates
            ├── code_review_prompt.st
            ├── hint_generation_prompt.st
            └── roadmap_generation_prompt.st
```

### 12.2 Code Review Prompt Strategy

```
System: "You are an expert software engineer reviewing code submissions
         for a competitive programming platform. Analyze the code for:
         1. Algorithm correctness and efficiency
         2. Code quality and readability
         3. Best practices and design patterns
         4. Time and space complexity
         Respond ONLY in valid JSON format."

User: "Language: {language}
       Problem: {problemTitle}
       Verdict: {verdict}
       Code:
       {sourceCode}

       Provide analysis in JSON:
       {
         qualityScore: int,
         timeComplexity: string,
         spaceComplexity: string,
         feedback: [{ section: string, issue: string, suggestion: string }],
         optimizationTips: [string]
       }"
```

### 12.3 AI Response Handling

```
Spring AI returns structured response
    │
    ├── Parse JSON → AIReviewResponse DTO
    ├── Validate structure (non-null required fields)
    ├── Store in ai_db
    └── Return to client

On parse failure:
    └── Retry once with simplified prompt
        → On second failure: store error status, notify client
```

---

## 13. Technology Stack

### 13.1 Backend

| Technology | Version | Purpose |
|---|---|---|
| Java | 17 LTS | Primary language |
| Spring Boot | 3.2.x | Application framework |
| Spring Security | 6.x | Authentication & authorization |
| Spring Security OAuth2 Client | 6.x | OAuth2 login (Google, GitHub) |
| Spring Cloud Gateway | 4.x | API Gateway |
| **Spring Cloud Netflix Eureka** | **4.x** | **Service discovery & registration** |
| **Spring AMQP (RabbitMQ)** | **3.x** | **Execution work queue producer/consumer** |
| **Spring Kafka** | **3.x** | **Kafka producer/consumer integration** |
| Spring Data JPA | 3.x | ORM layer |
| Spring AI | 1.0.x | LLM integration |
| Hibernate | 6.x | JPA implementation |
| MapStruct | 1.5.x | DTO ↔ Entity mapping |
| Lombok | 1.18.x | Boilerplate reduction |
| Flyway | 9.x | Database migrations |
| JUnit 5 | 5.x | Unit testing |
| Mockito | 5.x | Mocking framework |

### 13.2 Infrastructure

| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 15 | Primary relational database (one schema per service) |
| Redis | 7.x | Cache, rate limiting, token blacklist |
| **RabbitMQ** | **3.x** | **Execution work queue — buffers submission spikes** |
| **Apache Kafka** | **3.x** | **Event streaming — decoupled cross-service events** |
| **Spring Cloud Eureka** | **4.x** | **Service registry — name-based discovery & load balancing** |
| Docker | 24.x | Containerization & code sandbox |
| Docker Compose | 2.x | Local development orchestration |

### 13.3 Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| Tailwind CSS | 3.x | Utility-first CSS |
| React Router | 6.x | Client-side routing |
| Axios | 1.x | HTTP client |

### 13.4 Build & Dev Tools

| Tool | Purpose |
|---|---|
| Maven | Build and dependency management |
| IntelliJ IDEA | Primary IDE |
| Postman | API testing |
| DBeaver | Database administration |
| Git + GitHub | Version control |

---

## 14. Deployment Architecture

### 14.1 Docker Compose (Local Development)

```yaml
Services:
  postgres-auth:      PostgreSQL for auth_db       (port 5432)
  postgres-contest:   PostgreSQL for contest_db    (port 5433)
  postgres-execution: PostgreSQL for execution_db  (port 5434)
  postgres-ai:        PostgreSQL for ai_db          (port 5435)
  redis:              Redis cache                   (port 6379)
  rabbitmq:           RabbitMQ message broker       (port 5672, mgmt 15672)
  kafka:              Apache Kafka                  (port 9092)
  zookeeper:          Zookeeper (Kafka dependency)  (port 2181)
  eureka-server:      Eureka Service Registry       (port 8761)
  auth-service:       Auth Service                  (port 8081)
  contest-service:    Contest Service               (port 8082)
  execution-service:  Execution Service             (port 8083)
  ai-service:         AI Service                    (port 8084)
  api-gateway:        Spring Cloud Gateway          (port 8080)
  frontend:           React (Nginx)                 (port 3000)
```

### 14.2 Service Startup Order

```
zookeeper
kafka (depends on zookeeper)
rabbitmq
eureka-server
postgres-auth
postgres-contest         → auth-service (registers with Eureka)
postgres-execution            │
postgres-ai              → contest-service (registers with Eureka)
redis                         │
                         → execution-service (registers with Eureka, connects RabbitMQ + Kafka)
                              │
                         → ai-service (registers with Eureka)
                              │
                         → api-gateway (connects to Eureka for service discovery)
                              │
                         → frontend (React)
```

### 14.3 Environment Configuration

```
Each service reads from environment variables:
  DB_URL, DB_USERNAME, DB_PASSWORD
  REDIS_HOST, REDIS_PORT
  RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USERNAME, RABBITMQ_PASSWORD
  KAFKA_BOOTSTRAP_SERVERS
  EUREKA_SERVER_URL
  JWT_SECRET, JWT_EXPIRY
  AI_PROVIDER_API_KEY
  CORS_ALLOWED_ORIGINS
```

---

## 15. Scalability & Future Planning

### 15.1 v1.0 Scaling Approach

| Concern | v1.0 Solution |
|---|---|
| Submission spikes | **RabbitMQ** buffers queue; Execution workers scale horizontally |
| Service discovery | **Eureka** — Gateway load-balances across all registered instances |
| Event fan-out | **Kafka** — multiple consumer groups receive same event independently |
| Leaderboard read load | Redis cache (30s TTL) in **Contest Service** |
| AI request latency | Async review generation + polling |
| Database read load | Read-replica per service (PostgreSQL) |

### 15.2 Horizontal Scaling with Eureka

```
Eureka Registry
  ├── auth-service         × 1 instance
  ├── contest-service      × 2 instances  (load balanced by Gateway)
  ├── execution-service    × 3 instances  (scale up for more workers)
  └── ai-service           × 1 instance

API Gateway resolves 'contest-service' → Eureka returns 2 instances
→ Round-robin load balancing applied automatically
→ No config change needed when adding/removing instances
```

### 15.3 Future Scaling (v2.0+)

```
Future v2.0 — Contest Service splits further (if needed):
  Contest Service
        │
        ├── Problem Service     (independent scaling)
        ├── Contest Core        (moderate scaling)
        └── Leaderboard Service (read-heavy — Redis cluster)

Future v2.0 — Execution scales to Kubernetes:
  RabbitMQ queue → Kubernetes Jobs (one pod per submission)
  → Horizontal Pod Autoscaler based on queue depth
  → No code change required in API layer
```

### 15.3 Scalability Targets

| Metric | v1.0 Target | v2.0 Target |
|---|---|---|
| Concurrent Users | 1,000 | 50,000 |
| Submissions/min | 100 | 5,000 |
| API Response Time (p95) | < 2 seconds | < 500ms |
| Execution Turnaround | < 30 seconds | < 10 seconds |
| Leaderboard Latency | < 500ms (cached) | < 100ms |

---

## 16. Non-Functional Requirement Mapping

| NFR | Mechanism | Where Implemented |
|---|---|---|
| **API < 2s** | Redis caching, async execution via RabbitMQ | Gateway + Contest Service |
| **Concurrent submissions** | RabbitMQ queue + async Execution workers | **Execution Service** |
| **No submission loss** | DB write (PENDING) before RabbitMQ publish | **Execution Service** (SubmissionController) |
| **Consistent rankings** | Kafka `submission.completed` → LeaderboardService | **Contest Service** (LeaderboardService) |
| **JWT Security** | HMAC-SHA256, 15-min expiry, Redis blacklist | Auth Service + Gateway |
| **RBAC** | `@PreAuthorize`, header-forwarded roles | All Services |
| **Secure execution** | Docker sandbox, no network, syscall filtering | **Execution Service** |
| **Input validation** | Bean Validation on all request DTOs | All Controllers |
| **Password security** | BCrypt(10); NULL for OAuth-only users | Auth Service |
| **Secrets management** | Environment variables only | All Services |
| **Soft deletes** | `deleted_at` column | Problems and Contests in **Contest Service** |
| **Audit trail** | `created_at`, `updated_at`, `created_by` | All entities |
| **Service discovery** | Eureka registry; Gateway load-balances by name | All 4 Services + Gateway |
| **Independent scaling** | Each service is a standalone Spring Boot app | Auth, Contest, Execution, AI |

---

*Document Version: 1.7 | CodeForge Platform*
*Next: Low Level Design (LLD) — Class Diagrams & Sequence Diagrams*
