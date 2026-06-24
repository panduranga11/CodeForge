# Functional Requirements Document (FRD)

**Project:** CodeForge — AI-Powered Coding Assessment, Contest Management & Learning Platform
**Version:** 1.3
**Status:** Draft
**Date:** 2026-06-24
**Changes:**
- v1.1: Added self-service Host a Contest flow (FR-AUTH-008, FR-CONT-009, FR-CONT-010, FR-CONT-011)
- v1.2: Added OAuth2 authentication via Google and GitHub (FR-AUTH-009, FR-AUTH-010)
- v1.3: Aligned all service references with v1.5 HLD architecture — replaced "Assessment Service" with "Contest Service" / "Execution Service" throughout traceability matrix; removed stale "organisation" references; updated FR-CONT-010 to allow join during ACTIVE state

---

## Table of Contents

1. [Document Purpose](#1-document-purpose)
2. [Scope](#2-scope)
3. [Actors & Roles](#3-actors--roles)
4. [FR-AUTH — Authentication & Authorization](#4-fr-auth--authentication--authorization)
5. [FR-PROB — Problem Management](#6-fr-prob--problem-management)
6. [FR-CONT — Contest Management](#7-fr-cont--contest-management)
7. [FR-SUB — Submission & Execution Engine](#8-fr-sub--submission--execution-engine)
8. [FR-LEAD — Leaderboard System](#9-fr-lead--leaderboard-system)
9. [FR-AI — AI-Powered Features](#10-fr-ai--ai-powered-features)
10. [FR-ANAL — Analytics & Reporting](#11-fr-anal--analytics--reporting)
11. [Requirement Traceability Matrix](#12-requirement-traceability-matrix)

---

## 1. Document Purpose

This document formally defines the **Functional Requirements** for CodeForge. It specifies what the system must do from the perspective of all actors. Each requirement is uniquely identified, includes a description, actor(s), preconditions, and acceptance criteria.

---

## 2. Scope

CodeForge is a **microservice-based platform** that allows users to:
- Create and manage coding contests and assessments
- Automatically evaluate code submissions
- Generate real-time leaderboards and rankings
- Provide AI-powered learning feedback to participants

**In Scope:** Auth, Problem, Contest, Submission, Execution, Leaderboard, AI Features, Analytics.

**Out of Scope (v1.0):** Payment/billing, plagiarism detection, video proctoring, mobile application.

---

## 3. Actors & Roles

| Actor | System Role | Description |
|---|---|---|
| **Guest** | Unauthenticated | Can view public contest listings and problem previews |
| **Student** | `ROLE_STUDENT` | Participates in contests, submits solutions, views AI feedback |
| **Host** | `ROLE_ORGANIZER` (self-upgraded) | Any registered user who chooses to host a contest — automatically receives organizer-level permissions scoped to their own contests |
| **Organizer** | `ROLE_ORGANIZER` | Creates/manages contests and problems; self-upgraded via "Host a Contest" |
| **Admin** | `ROLE_ADMIN` | Full platform access — manages all users and system config |
| **System** | Internal | Automated background processing (execution engine, leaderboard updater) |

> **Self-Service Path:** A `ROLE_STUDENT` user can become a `ROLE_ORGANIZER` (Host) without admin approval by clicking **"Host a Contest"** — see FR-AUTH-008 and FR-CONT-009.

---

## 4. FR-AUTH — Authentication & Authorization

### FR-AUTH-001: User Registration

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-001 |
| **Title** | User Registration |
| **Actor** | Guest |
| **Priority** | HIGH |

**Description:**
Guest users can register via two paths: **(A) Credential-based** (email + password form) or **(B) OAuth2** (Google / GitHub one-click). Both paths result in the same authenticated user account.

**Path A — Credential Registration:**

**Preconditions:**
- User is not authenticated
- Email address is not already registered in the system

**Inputs:**
- Full name (required, 2–100 characters)
- Email address (required, valid email format)
- Password (required, minimum 8 characters, at least 1 uppercase, 1 digit, 1 special character)
- Role selection: `STUDENT` (default)

**Functional Steps:**
1. System validates all input fields using Bean Validation
2. System checks if email is already registered
3. System hashes the password using BCrypt
4. System creates a new `User` record with status `ACTIVE`, `auth_type: LOCAL`
5. System assigns `ROLE_STUDENT` as default role
6. System returns a success response with the created user profile (excluding password)

**Path B — OAuth2 Registration (see FR-AUTH-009):**
- User clicks "Continue with Google" or "Continue with GitHub"
- System redirects to the OAuth2 provider
- On success, system creates account automatically using provider profile data
- No password is required; `auth_type` is set to `OAUTH`

**Acceptance Criteria:**
- [ ] Registration fails if email is already taken (HTTP 409 Conflict) for credential path
- [ ] Registration fails if any required field is missing or invalid (HTTP 400)
- [ ] Password is never stored or returned in plain text
- [ ] Newly registered user can immediately log in
- [ ] Default role is `ROLE_STUDENT`
- [ ] OAuth-registered users have `password = NULL` and `auth_type = OAUTH` in DB

---

### FR-AUTH-002: User Login

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-002 |
| **Title** | User Login |
| **Actor** | Guest |
| **Priority** | HIGH |

**Description:**
Registered users must be able to log in via **(A) email + password** or **(B) OAuth2 provider** (Google / GitHub) and receive a JWT access token for use on all protected endpoints.

**Path A — Credential Login:**

**Preconditions:**
- User is registered with `auth_type: LOCAL` or `BOTH`
- Account status is `ACTIVE`

**Inputs:**
- Email address
- Password

**Functional Steps:**
1. System validates input fields
2. System looks up user by email
3. System verifies password against stored BCrypt hash
4. On success, system generates JWT access token (15-minute expiry) and refresh token (7-day expiry)
5. System logs the login event
6. System returns both tokens

**Path B — OAuth2 Login:**
- See FR-AUTH-009 for full OAuth2 login flow

**Acceptance Criteria:**
- [ ] Returns HTTP 200 with access token and refresh token on valid credentials
- [ ] Returns HTTP 401 on invalid email or wrong password
- [ ] Returns HTTP 403 if account is suspended/inactive
- [ ] Returns HTTP 400 if user registered via OAuth and has no password set
- [ ] JWT contains: `userId`, `email`, `roles`, `iat`, `exp`
- [ ] Failed login attempts are logged (not including the attempted password)

---

### FR-AUTH-003: JWT Token Refresh

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-003 |
| **Title** | Token Refresh |
| **Actor** | Authenticated User |
| **Priority** | HIGH |

**Description:**
Users must be able to obtain a new access token using a valid refresh token without re-entering credentials.

**Preconditions:**
- User holds a valid, non-expired refresh token

**Functional Steps:**
1. Client sends refresh token to `/auth/refresh`
2. System validates the refresh token signature and expiry
3. System issues a new access token (15-minute expiry)
4. Old refresh token remains valid until its own expiry

**Acceptance Criteria:**
- [ ] Returns new access token on valid refresh token (HTTP 200)
- [ ] Returns HTTP 401 if refresh token is expired or invalid
- [ ] New access token contains updated `iat` and `exp`

---

### FR-AUTH-004: User Logout

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-004 |
| **Title** | User Logout |
| **Actor** | Authenticated User |
| **Priority** | MEDIUM |

**Description:**
Authenticated users must be able to log out, invalidating their current session tokens.

**Functional Steps:**
1. Client sends logout request with the current refresh token
2. System blacklists the refresh token in Redis with TTL equal to remaining token validity
3. System returns HTTP 200

**Acceptance Criteria:**
- [ ] Blacklisted refresh token cannot be used to obtain a new access token
- [ ] Logout succeeds even if access token is already expired
- [ ] HTTP 200 returned on successful logout

---

### FR-AUTH-005: View Own Profile

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-005 |
| **Title** | View Profile |
| **Actor** | Authenticated User |
| **Priority** | MEDIUM |

**Description:**
Authenticated users must be able to view their own profile information.

**Acceptance Criteria:**
- [ ] Returns user's name, email, role, join date
- [ ] Password is never returned
- [ ] Returns HTTP 401 if request is unauthenticated

---

### FR-AUTH-006: Update Profile

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-006 |
| **Title** | Update Profile |
| **Actor** | Authenticated User |
| **Priority** | MEDIUM |

**Description:**
Users must be able to update their name and password.

**Inputs:**
- Full name (optional)
- Current password (required to change password)
- New password (optional, min 8 chars)

**Acceptance Criteria:**
- [ ] Name update does not require password confirmation
- [ ] Password change requires current password verification
- [ ] Returns HTTP 400 if new password does not meet complexity rules
- [ ] Successful update returns updated profile

---

### FR-AUTH-007: Role-Based Access Control (RBAC)

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-007 |
| **Title** | RBAC Enforcement |
| **Actor** | System |
| **Priority** | HIGH |

**Description:**
The API Gateway and individual services must enforce access control based on user roles.

**Access Matrix:**

| Resource | STUDENT | ORGANIZER (incl. Host) | ADMIN |
|---|---|---|---|
| Register / Login | ✅ | ✅ | ✅ |
| View Problems | ✅ | ✅ | ✅ |
| Create Problem | ❌ | ✅ | ✅ |
| Submit Code | ✅ | ✅ | ✅ |
| **Host / Create Contest** | ❌ | ✅ | ✅ |
| **Self-Upgrade to Organizer** | ✅ (via Host flow) | ✅ | ✅ |
| **Generate Invite Link** | ❌ | ✅ (own contests) | ✅ |
| **Join via Invite Link** | ✅ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| View Any Submission | ❌ | ✅ (own contests) | ✅ |

**Acceptance Criteria:**
- [ ] Unauthorized role access returns HTTP 403
- [ ] Unauthenticated access to protected routes returns HTTP 401
- [ ] Admin can perform all actions
- [ ] Organizer is restricted to contests they own or are assigned to
- [ ] A self-upgraded Host (ROLE_ORGANIZER) can only manage their own hosted contests

---

### FR-AUTH-008: Self-Service Upgrade to Organizer (Host a Contest)

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-008 |
| **Title** | Self-Service Organizer Upgrade |
| **Actor** | Student |
| **Priority** | HIGH |

**Description:**
Any registered student must be able to self-upgrade their role to `ROLE_ORGANIZER` by initiating the "Host a Contest" flow — no admin approval required. This enables any user to become a contest host.

**Preconditions:**
- User is authenticated with `ROLE_STUDENT`
- User's account status is `ACTIVE`

**Functional Steps:**
1. User clicks **"Host a Contest"** in the UI
2. System presents a confirmation dialog explaining the organizer responsibilities
3. User confirms the upgrade
4. System updates user's role from `ROLE_STUDENT` → `ROLE_ORGANIZER`
5. System issues a new JWT token with the updated role claims
6. System immediately redirects user to the **Create Contest** form
7. System logs the role upgrade event

**Acceptance Criteria:**
- [ ] User with `ROLE_ORGANIZER` or `ROLE_ADMIN` is NOT shown the upgrade prompt (already upgraded)
- [ ] Role upgrade is immediate — no approval queue
- [ ] New JWT issued with `ROLE_ORGANIZER` claims after upgrade
- [ ] Old access token is invalidated in Redis after role change
- [ ] Role upgrade event is logged with timestamp and userId
- [ ] Returns HTTP 200 with new token pair on success
- [ ] Organizer-upgraded users can still participate in other contests as participants

---

### FR-AUTH-009: OAuth2 Login (Google / GitHub)

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-009 |
| **Title** | OAuth2 Authentication |
| **Actor** | Guest |
| **Priority** | HIGH |

**Description:**
Users must be able to register and log in to CodeForge using their existing Google or GitHub accounts without creating a password. This provides a frictionless onboarding experience.

**Supported Providers:**
- `GOOGLE` — uses Google OAuth2 (`email`, `profile` scopes)
- `GITHUB` — uses GitHub OAuth2 (`user:email`, `read:user` scopes)

**Preconditions:**
- User has a valid Google or GitHub account
- User's email is accessible via the provider's API

**Functional Steps:**
1. User clicks **"Continue with Google"** or **"Continue with GitHub"**
2. Client redirects to `GET /auth/oauth2/authorize/{provider}`
3. Auth Service builds the authorization URL (with `state` param + PKCE) and redirects to provider
4. User authenticates on the provider's page
5. Provider redirects back to `GET /auth/oauth2/callback/{provider}?code=...&state=...`
6. Auth Service validates `state` (CSRF protection) and exchanges `code` for provider access token
7. Auth Service fetches user profile from provider: `{ email, name, avatar_url, provider_id }`
8. Auth Service performs **Account Resolution**:
   - **Case A** — Email already exists in DB: upsert `oauth_providers` record, link provider to existing account, set `auth_type = BOTH`
   - **Case B** — New email: create `User` record (`password = NULL`, `auth_type = OAUTH`), create `oauth_providers` record
9. Auth Service generates JWT AccessToken (15 min) + RefreshToken (7 days)
10. Auth Service redirects to `https://codeforge.io/auth/callback#accessToken=...&refreshToken=...`
11. Frontend extracts tokens from URL fragment, stores them, and navigates to dashboard

**Acceptance Criteria:**
- [ ] OAuth login works for both Google and GitHub providers
- [ ] New users are auto-registered with `ROLE_STUDENT` on first OAuth login
- [ ] Existing users with same email are auto-linked (not duplicated)
- [ ] Tokens are passed via URL fragment (`#`) not query params (prevents server logging)
- [ ] `state` parameter validated to prevent CSRF attacks
- [ ] Invalid or expired `code` returns HTTP 400 with user-friendly error
- [ ] User profile (name, avatar) is populated from provider on first login
- [ ] OAuth users without a password cannot use credential login (HTTP 400 with message)
- [ ] Provider secrets (Client ID, Client Secret) are stored in environment variables only
- [ ] Returns HTTP 502 if provider is unreachable, with retry guidance

---

### FR-AUTH-010: Link / Unlink OAuth Provider

| Field | Detail |
|---|---|
| **ID** | FR-AUTH-010 |
| **Title** | Link / Unlink OAuth Provider |
| **Actor** | Authenticated User |
| **Priority** | MEDIUM |

**Description:**
Users who registered via email/password must be able to **link** a Google or GitHub account to their profile for future OAuth login. Users who registered via OAuth must be able to **unlink** a provider (only if they have a password or another provider linked).

**Link Provider Functional Steps:**
1. Authenticated user clicks **"Link Google"** or **"Link GitHub"** in profile settings
2. Client calls `POST /auth/oauth2/link/{provider}` (authenticated)
3. Auth Service initiates OAuth flow with provider
4. On callback, Auth Service verifies the OAuth email
5. If OAuth email matches current user's email → link provider (create `oauth_providers` record)
6. If OAuth email is different → still link (provider account linked to current user), log the email difference
7. Update user `auth_type = BOTH`
8. Return success

**Unlink Provider Functional Steps:**
1. User clicks **"Unlink Google"** or **"Unlink GitHub"** in settings
2. Client calls `DELETE /auth/oauth2/unlink/{provider}` (authenticated)
3. Auth Service validates that the user has at least one remaining login method:
   - Has a password (LOCAL auth), OR
   - Has another OAuth provider linked
4. Deletes the `oauth_providers` record for that provider
5. Updates `auth_type` accordingly

**Acceptance Criteria:**
- [ ] Linking succeeds when no conflict exists for the (provider, provider_id) pair
- [ ] Returns HTTP 409 if the OAuth account is already linked to a different user
- [ ] Unlinking fails (HTTP 400) if it would leave the user with no login method
- [ ] User can have both Google and GitHub linked simultaneously
- [ ] Linked providers are shown in profile settings
- [ ] Returns HTTP 200 on successful link/unlink

---

## 6. FR-PROB — Problem Management

> **Design Decision:** Problems are scoped to contests. There is no standalone problem library. A contest host creates problems within their contest, and problems are only visible to registered participants during an ACTIVE contest.

### FR-PROB-001: Create Problem

| Field | Detail |
|---|---|
| **ID** | FR-PROB-001 |
| **Title** | Create Problem |
| **Actor** | Contest Host |
| **Priority** | HIGH |

**Description:**
Contest hosts must be able to create coding problems within their contest. Problems are always scoped to a contest and cannot be accessed independently.

**Inputs:**

| Field | Required | Constraints |
|---|---|---|
| Title | Yes | 5–200 chars, unique per contest |
| Description | Yes | Markdown supported, max 10,000 chars |
| Difficulty | Yes | `EASY` \| `MEDIUM` \| `HARD` |
| Category | Yes | See category list below |
| Time Limit | Yes | 1–10 seconds |
| Memory Limit | Yes | 16–512 MB |
| Input Format | Yes | Max 2,000 chars |
| Output Format | Yes | Max 2,000 chars |
| Constraints | Yes | Max 2,000 chars |
| Sample Input | Yes | At least 1 example |
| Sample Output | Yes | Corresponding to sample input |
| Explanation | No | Optional explanation of sample |
| Tags | No | Max 10 tags |
| Points | Yes | Score value for solving this problem |
| Sequence No | Yes | Display order within the contest |

**Problem Categories:**
`ARRAYS` · `STRINGS` · `LINKED_LIST` · `TREES` · `GRAPHS` · `DYNAMIC_PROGRAMMING` · `GREEDY` · `BACKTRACKING` · `SORTING` · `SEARCHING` · `MATH` · `SQL` · `SYSTEM_DESIGN` · `MISCELLANEOUS`

**Acceptance Criteria:**
- [ ] Problem saved with `DRAFT` status by default
- [ ] Problem is always scoped to a contest (contest_id FK required)
- [ ] Only the contest host can create problems in their contest
- [ ] Cannot create problems in ACTIVE or COMPLETED contests
- [ ] Markdown in description is sanitized before storage
- [ ] Returns HTTP 201 with created problem ID

---

### FR-PROB-002: Add Test Cases to Problem

| Field | Detail |
|---|---|
| **ID** | FR-PROB-002 |
| **Title** | Add Test Cases |
| **Actor** | Organizer, Admin |
| **Priority** | HIGH |

**Description:**
Organizers must be able to add hidden and visible test cases to a problem.

**Inputs per Test Case:**
- Input data (required)
- Expected output (required)
- Type: `SAMPLE` (visible to participants) | `HIDDEN` (used for evaluation only)
- Score weight (optional, for partial scoring)

**Acceptance Criteria:**
- [ ] Minimum 1 hidden test case required to publish problem
- [ ] Test case input/output stored securely (not exposed in API for HIDDEN type)
- [ ] Organizer can add, edit, or delete test cases on problems they own
- [ ] Returns HTTP 201 with test case ID

---

### FR-PROB-003: Publish Problem

| Field | Detail |
|---|---|
| **ID** | FR-PROB-003 |
| **Title** | Publish Problem |
| **Actor** | Organizer, Admin |
| **Priority** | HIGH |

**Description:**
A problem must be explicitly published before it appears in contests or public listings.

**Preconditions:**
- Problem has at least 1 hidden test case
- Problem has title, description, difficulty, and constraints filled

**Acceptance Criteria:**
- [ ] Status changes from `DRAFT` → `PUBLISHED`
- [ ] `PUBLISHED` problems are visible based on their `Visibility` setting
- [ ] Published problems can still be edited (triggers re-review if test cases change)

---

### FR-PROB-004: List Contest Problems

| Field | Detail |
|---|---|
| **ID** | FR-PROB-004 |
| **Title** | List Contest Problems |
| **Actor** | Contest Host, Registered Participants (during ACTIVE contest) |
| **Priority** | HIGH |

**Description:**
Users must be able to view problems within a specific contest. There is no standalone problem library — problems are only accessible within their contest context.

**Response:**
- Ordered list by sequence number
- Each item: ID, title, difficulty, category, points, sequence number

**Acceptance Criteria:**
- [ ] Contest host can view all problems (any contest state)
- [ ] Registered participants can only view PUBLISHED problems during ACTIVE contest
- [ ] `HIDDEN` test case data never returned
- [ ] Returns HTTP 403 if user is not host or registered participant

---

### FR-PROB-005: View Problem Detail

| Field | Detail |
|---|---|
| **ID** | FR-PROB-005 |
| **Title** | View Problem Detail |
| **Actor** | Student, Organizer, Admin |
| **Priority** | HIGH |

**Description:**
Users must be able to view the full details of a published problem.

**Response includes:**
- Title, description (rendered markdown), difficulty, category
- Time limit, memory limit, constraints
- Sample input/output with explanation
- Tags
- Acceptance rate and total submission count

**Acceptance Criteria:**
- [ ] Hidden test cases are never included in the response
- [ ] Returns HTTP 404 if problem is `DRAFT` or does not exist
- [ ] Organizer can preview `DRAFT` problems they own

---

### FR-PROB-006: Update Problem

| Field | Detail |
|---|---|
| **ID** | FR-PROB-006 |
| **Title** | Update Problem |
| **Actor** | Organizer (owner), Admin |
| **Priority** | MEDIUM |

**Description:**
Organizers can update problems they created. Admins can update any problem.

**Acceptance Criteria:**
- [ ] Organizer cannot update problems belonging to other organizers (HTTP 403)
- [ ] Changes to test cases of a `PUBLISHED` problem are logged with version info
- [ ] Returns HTTP 200 with updated problem

---

### FR-PROB-007: Delete Problem

| Field | Detail |
|---|---|
| **ID** | FR-PROB-007 |
| **Title** | Delete Problem |
| **Actor** | Admin |
| **Priority** | LOW |

**Description:**
Admins can soft-delete problems. Problems used in active contests cannot be deleted.

**Acceptance Criteria:**
- [ ] Problems with active contest associations cannot be deleted (HTTP 409)
- [ ] Soft delete sets `deletedAt` timestamp
- [ ] Deleted problems disappear from listings but submission history is preserved

---

## 7. FR-CONT — Contest Management

### FR-CONT-001: Create Contest

| Field | Detail |
|---|---|
| **ID** | FR-CONT-001 |
| **Title** | Create Contest |
| **Actor** | Organizer, Admin |
| **Priority** | HIGH |

**Description:**
Organizers must be able to create a new coding contest.

**Inputs:**

| Field | Required | Constraints |
|---|---|---|
| Title | Yes | 5–200 chars |
| Description | Yes | Markdown, max 5,000 chars |
| Start Time | Yes | Must be a future datetime |
| End Time | Yes | Must be after start time |
| Visibility | Yes | `PUBLIC` \| `PRIVATE` |
| Registration Type | Yes | `OPEN` \| `INVITE_ONLY` |
| Max Participants | No | Default: unlimited |
| Scoring Mode | Yes | `POINTS` \| `PENALTY_TIME` \| `PERCENTAGE` |
| Problems | No | Can be added after creation |

**Contest Status Lifecycle:**
```
DRAFT → SCHEDULED → ACTIVE → COMPLETED
                  ↘ CANCELLED
```

**Acceptance Criteria:**
- [ ] Contest created with `DRAFT` status
- [ ] Start time must be at least 10 minutes in the future
- [ ] End time must be after start time (minimum 15-minute duration)
- [ ] Returns HTTP 201 with contest ID

---

### FR-CONT-002: Add Problems to Contest

| Field | Detail |
|---|---|
| **ID** | FR-CONT-002 |
| **Title** | Add Problems to Contest |
| **Actor** | Organizer, Admin |
| **Priority** | HIGH |

**Description:**
Organizers must be able to attach problems to a contest and assign point values.

**Inputs:**
- Problem ID (must be `PUBLISHED`)
- Points assigned to this problem within the contest
- Problem order/sequence number

**Acceptance Criteria:**
- [ ] Only `PUBLISHED` problems can be added to a contest
- [ ] Minimum 1 problem required to schedule a contest
- [ ] Maximum 20 problems per contest
- [ ] Problems cannot be added to a `COMPLETED` or `ACTIVE` contest
- [ ] Same problem cannot be added twice to the same contest

---

### FR-CONT-003: Schedule Contest

| Field | Detail |
|---|---|
| **ID** | FR-CONT-003 |
| **Title** | Schedule Contest |
| **Actor** | Organizer, Admin |
| **Priority** | HIGH |

**Description:**
Organizers must explicitly schedule a contest, transitioning it from `DRAFT` → `SCHEDULED`.

**Preconditions:**
- Contest has at least 1 problem
- Start and end times are set and valid

**Functional Steps:**
1. System validates all required fields
2. System transitions status to `SCHEDULED`
3. System schedules a background job to auto-activate the contest at start time
4. System schedules a background job to auto-complete the contest at end time

**Acceptance Criteria:**
- [ ] `SCHEDULED` contest is visible to participants for registration (if `PUBLIC`)
- [ ] Auto-activation triggers at exact start time (±30 seconds tolerance)
- [ ] Auto-completion locks submissions at exact end time
- [ ] Returns HTTP 200 with updated contest

---

### FR-CONT-004: Cancel Contest

| Field | Detail |
|---|---|
| **ID** | FR-CONT-004 |
| **Title** | Cancel Contest |
| **Actor** | Organizer, Admin |
| **Priority** | MEDIUM |

**Description:**
Organizers can cancel a contest that is in `DRAFT` or `SCHEDULED` state.

**Acceptance Criteria:**
- [ ] `ACTIVE` contests cannot be cancelled (HTTP 409)
- [ ] `COMPLETED` contests cannot be cancelled (HTTP 409)
- [ ] Status transitions to `CANCELLED`
- [ ] Registered participants are notified (event published)

---

### FR-CONT-005: Participant Registration

| Field | Detail |
|---|---|
| **ID** | FR-CONT-005 |
| **Title** | Register for Contest |
| **Actor** | Student |
| **Priority** | HIGH |

**Description:**
Students must be able to register for open or invite-only contests.

**Preconditions:**
- Contest is in `SCHEDULED` status
- Contest is `PUBLIC` or user has been invited

**Functional Steps:**
1. User submits registration request
2. System checks contest status and registration type
3. System checks max participants limit (if set)
4. System creates a `ContestParticipant` record
5. System returns registration confirmation

**Acceptance Criteria:**
- [ ] Users cannot register twice for the same contest (HTTP 409)
- [ ] Registration for `INVITE_ONLY` contests requires valid invite token
- [ ] Registration closes when contest becomes `ACTIVE`
- [ ] Max participants limit enforced (HTTP 409 if full)

---

### FR-CONT-006: View Contest Details

| Field | Detail |
|---|---|
| **ID** | FR-CONT-006 |
| **Title** | View Contest Details |
| **Actor** | Student, Organizer, Admin |
| **Priority** | HIGH |

**Description:**
Users must be able to view full details of a contest.

**Response includes:**
- Title, description, start/end times, status
- Duration remaining (if active)
- Problem list (titles and point values only — full problem visible during active contest to registered participants)
- Participant count
- Host name (contest owner)

**Acceptance Criteria:**
- [ ] Problem details only visible to registered participants during `ACTIVE` state
- [ ] `PRIVATE` contests only visible to registered participants and the host
- [ ] Returns HTTP 404 for non-existent contests

---

### FR-CONT-007: View Contest Problems (During Contest)

| Field | Detail |
|---|---|
| **ID** | FR-CONT-007 |
| **Title** | View Contest Problems |
| **Actor** | Student (registered participant) |
| **Priority** | HIGH |

**Description:**
Registered participants must be able to view full problem details during an active contest.

**Preconditions:**
- Contest status is `ACTIVE`
- User is registered as a participant

**Acceptance Criteria:**
- [ ] Returns HTTP 403 if contest is not `ACTIVE`
- [ ] Returns HTTP 403 if user is not a registered participant
- [ ] Full problem content (description, examples, constraints) returned
- [ ] Hidden test cases never exposed

---

### FR-CONT-008: List Contests

| Field | Detail |
|---|---|
| **ID** | FR-CONT-008 |
| **Title** | List Contests |
| **Actor** | All Users |
| **Priority** | HIGH |

**Description:**
Users must be able to browse upcoming, active, and past contests.

**Filters:**
- Status (`SCHEDULED`, `ACTIVE`, `COMPLETED`)
- Host (search by host username)
- Date range

**Acceptance Criteria:**
- [ ] Returns paginated list (default 10 per page)
- [ ] `PRIVATE` contests hidden from non-members
- [ ] Results ordered by start time descending

---

### FR-CONT-009: Host a Contest (Self-Service)

| Field | Detail |
|---|---|
| **ID** | FR-CONT-009 |
| **Title** | Host a Contest (Self-Service) |
| **Actor** | Any Authenticated User (triggers role upgrade if needed) |
| **Priority** | HIGH |

**Description:**
Any authenticated user must be able to host (create and manage) a contest through a simplified self-service flow. If the user holds `ROLE_STUDENT`, the system automatically upgrades their role to `ROLE_ORGANIZER` as part of this flow before contest creation proceeds.

**Preconditions:**
- User is authenticated

**Inputs:**

| Field | Required | Constraints |
|---|---|---|
| Contest Title | Yes | 5–200 chars |
| Description | Yes | Markdown, max 5,000 chars |
| Start Date & Time | Yes | Must be in the future |
| End Date & Time | Yes | Must be after start time |
| Visibility | Yes | `PUBLIC` \| `PRIVATE` |
| Join Mode | Yes | `OPEN` \| `INVITE_ONLY` |
| Max Participants | No | Default: unlimited |
| Scoring Mode | Yes | `POINTS` \| `PENALTY_TIME` \| `PERCENTAGE` |

**Functional Steps:**
1. User clicks **"Host a Contest"**
2. If user is `ROLE_STUDENT` → System auto-upgrades to `ROLE_ORGANIZER` (FR-AUTH-008)
3. System presents the **Create Contest** form
4. User fills contest details and submits
5. System validates all inputs
6. System creates the contest with status `DRAFT`
7. System generates a unique **Invite Code** (8-character alphanumeric) and **Invite Link**
8. System sets the authenticated user as the **Contest Host/Owner**
9. System returns: `{ contestId, inviteCode, inviteLink, status: DRAFT }`
10. User can then add problems, schedule the contest, and share the invite link

**Acceptance Criteria:**
- [ ] Contest creation succeeds for any authenticated user (student or organizer)
- [ ] Role upgrade happens transparently before contest form is shown
- [ ] Invite code is unique, 8 alphanumeric characters, case-insensitive
- [ ] Invite link format: `https://codeforge.io/join/{inviteCode}`
- [ ] Host is automatically set as the owner of the contest
- [ ] Returns HTTP 201 with contest details + invite info
- [ ] `PRIVATE` contests require invite code to join
- [ ] `PUBLIC` contests are discoverable and joinable without a code

---

### FR-CONT-010: Join Contest via Invite Link / Code

| Field | Detail |
|---|---|
| **ID** | FR-CONT-010 |
| **Title** | Join via Invite Link or Code |
| **Actor** | Student, Organizer |
| **Priority** | HIGH |

**Description:**
Users must be able to join a contest by entering an invite code or clicking an invite link shared by the host.

**Preconditions:**
- User is authenticated
- Contest is in `SCHEDULED` or `ACTIVE` status

**Inputs:**
- Invite code (8-character alphanumeric) OR invite link URL

**Functional Steps:**
1. User visits the invite link OR enters the invite code on the Join Contest page
2. System resolves invite code → looks up the corresponding contest
3. System validates:
   a. Contest exists
   b. Contest is `SCHEDULED` or `ACTIVE` (registration open)
   c. User is not already registered
   d. Max participants limit not reached (if set)
4. System creates a `ContestParticipant` record
5. System returns contest details and registration confirmation

**Acceptance Criteria:**
- [ ] Returns HTTP 404 if invite code does not match any contest
- [ ] Returns HTTP 409 if user is already registered
- [ ] Returns HTTP 409 if contest is full (max participants reached)
- [ ] Returns HTTP 400 if contest status is `COMPLETED` or `CANCELLED` (registration closed)
- [ ] Invite link works identically to entering the invite code manually
- [ ] Users can share invite link via copy-to-clipboard in the UI
- [ ] `PUBLIC` contests can also be joined directly without a code via the contest listing

---

### FR-CONT-011: Public Contest Discovery

| Field | Detail |
|---|---|
| **ID** | FR-CONT-011 |
| **Title** | Discover & Join Public Contests |
| **Actor** | Student, Guest |
| **Priority** | HIGH |

**Description:**
Users must be able to discover and browse all public contests on a dedicated **Explore Contests** page and join them with a single click.

**Filters Available:**
- Status: `UPCOMING` (SCHEDULED) | `LIVE` (ACTIVE) | `ENDED` (COMPLETED)
- Category: `DSA` | `SQL` | `COMPETITIVE` | `ASSESSMENT` | `PRACTICE`
- Duration: `< 1 Hour` | `1–3 Hours` | `3+ Hours`
- Host: search by host username

**Response per Contest Card:**
- Contest title, host name (username)
- Status badge (UPCOMING / LIVE / ENDED)
- Start time + duration
- Participant count
- Problem count
- Join Mode: `OPEN` or `INVITE ONLY`
- **"Join"** button (for OPEN, SCHEDULED) | **"View"** button (for ENDED)

**Acceptance Criteria:**
- [ ] Only `PUBLIC` contests appear in the discovery feed
- [ ] `INVITE_ONLY` contests show with a lock icon — users need a code to join
- [ ] `LIVE` contests show a real-time participant count
- [ ] One-click join for `OPEN` + `SCHEDULED` contests (authenticated users)
- [ ] Guest users can view the list but must log in to join
- [ ] Paginated results (default 12 per page)
- [ ] Sorted by: upcoming first, then live, then recently ended

---

## 8. FR-SUB — Submission & Execution Engine

### FR-SUB-001: Submit Code

| Field | Detail |
|---|---|
| **ID** | FR-SUB-001 |
| **Title** | Submit Code |
| **Actor** | Student |
| **Priority** | HIGH |

**Description:**
Registered participants must be able to submit a code solution for a problem.

**Inputs:**
- Problem ID (required)
- Contest ID (optional — null for practice submission)
- Source code (required)
- Language (required): `JAVA` | `PYTHON` | `CPP` | `JAVASCRIPT`

**Preconditions (Contest Submission):**
- Contest status is `ACTIVE`
- User is a registered participant

**Functional Steps:**
1. System validates input (language supported, code not empty, contest active)
2. System creates `Submission` record with status `PENDING`
3. System places submission in execution queue
4. System returns submission ID immediately (async processing)
5. Execution engine picks up submission from queue
6. Execution engine compiles code (if compiled language)
7. Execution engine runs all hidden test cases
8. Execution engine records per-test-case result
9. System updates submission status with final verdict
10. System publishes `SubmissionCompleted` event

**Acceptance Criteria:**
- [ ] Submission accepted with HTTP 202 (Accepted) and submission ID
- [ ] Submissions blocked after contest end time (HTTP 409)
- [ ] Unauthenticated users cannot submit (HTTP 401)
- [ ] Non-participants cannot submit to a contest (HTTP 403)
- [ ] Code size limit: 100 KB per submission

---

### FR-SUB-002: Submission Verdict Generation

| Field | Detail |
|---|---|
| **ID** | FR-SUB-002 |
| **Title** | Verdict Generation |
| **Actor** | System (Execution Engine) |
| **Priority** | HIGH |

**Description:**
The execution engine must automatically evaluate submitted code against all test cases and assign a verdict.

**Supported Verdicts:**

| Verdict | Code | Condition |
|---|---|---|
| Accepted | `AC` | All test cases pass within time & memory limits |
| Wrong Answer | `WA` | Output does not match expected for any test case |
| Compilation Error | `CE` | Code fails to compile |
| Runtime Error | `RE` | Code crashes during execution |
| Time Limit Exceeded | `TLE` | Execution exceeds problem time limit |
| Memory Limit Exceeded | `MLE` | Memory usage exceeds problem memory limit |

**Acceptance Criteria:**
- [ ] Compilation errors return the compiler error message (sanitized, no system paths)
- [ ] Each test case result (pass/fail) stored individually
- [ ] Final verdict is the first non-AC result, or `AC` if all pass
- [ ] Execution runs in isolated sandbox (no network, no filesystem access)
- [ ] Memory and CPU limits strictly enforced per test case
- [ ] Maximum execution timeout: problem time limit + 2 seconds (grace)

---

### FR-SUB-003: Supported Languages

| Field | Detail |
|---|---|
| **ID** | FR-SUB-003 |
| **Title** | Language Support |
| **Actor** | System |
| **Priority** | HIGH |

**Description:**
The execution engine must support the following languages in v1.0.

| Language | Version | Executor Class |
|---|---|---|
| Java | 17 | `JavaExecutor` |
| Python | 3.11 | `PythonExecutor` |
| C++ | 17 | `CppExecutor` |
| JavaScript | Node 18 | `JavaScriptExecutor` |

**Acceptance Criteria:**
- [ ] Unsupported language returns HTTP 400
- [ ] Language-specific compilation and execution commands are configurable
- [ ] Each executor implements the `LanguageExecutor` strategy interface

---

### FR-SUB-004: View Submission Result

| Field | Detail |
|---|---|
| **ID** | FR-SUB-004 |
| **Title** | View Submission Result |
| **Actor** | Student, Organizer, Admin |
| **Priority** | HIGH |

**Description:**
Users must be able to view the result of their own submission.

**Response includes:**
- Submission ID, problem title, language, verdict
- Submission time, execution time, memory used
- Per-test-case result (pass/fail, time, memory) — hidden test case inputs not shown
- Compilation error message (if `CE`)

**Acceptance Criteria:**
- [ ] Students can only view their own submissions (HTTP 403 for others')
- [ ] Organizers can view all submissions within their own hosted contests
- [ ] Admins can view all submissions
- [ ] Hidden test case input/output values never returned

---

### FR-SUB-005: View Submission History

| Field | Detail |
|---|---|
| **ID** | FR-SUB-005 |
| **Title** | Submission History |
| **Actor** | Student |
| **Priority** | MEDIUM |

**Description:**
Users must be able to view their full submission history.

**Filters:**
- Problem ID
- Contest ID
- Verdict
- Date range

**Response:**
- Paginated list ordered by submission time descending
- Each item: problem title, language, verdict, execution time, submitted at

**Acceptance Criteria:**
- [ ] Returns only the authenticated user's submissions
- [ ] Paginated (default 20 per page)
- [ ] Returns HTTP 200 with empty list if no submissions match filter

---

### FR-SUB-006: Submission Rate Limiting

| Field | Detail |
|---|---|
| **ID** | FR-SUB-006 |
| **Title** | Submission Rate Limiting |
| **Actor** | System |
| **Priority** | MEDIUM |

**Description:**
The system must prevent excessive submissions to avoid abuse.

**Limits:**
- Maximum 5 submissions per user per problem within any 5-minute window (during contest)
- Maximum 20 submissions per user per problem per contest

**Acceptance Criteria:**
- [ ] Returns HTTP 429 when rate limit is exceeded
- [ ] Rate limit state stored in Redis
- [ ] Rate limit resets after window expires

---

## 9. FR-LEAD — Leaderboard System

### FR-LEAD-001: Contest Leaderboard

| Field | Detail |
|---|---|
| **ID** | FR-LEAD-001 |
| **Title** | Contest Leaderboard |
| **Actor** | Student, Organizer, Admin |
| **Priority** | HIGH |

**Description:**
The system must provide a real-time leaderboard for active and completed contests.

**Ranking Criteria (PENALTY_TIME mode):**
1. Number of problems solved (descending)
2. Total penalty time (ascending)
   - Penalty = submission time from contest start (in minutes)
   - Wrong answer penalty = +20 minutes per wrong submission before AC

**Ranking Criteria (POINTS mode):**
1. Total points earned (descending)
2. Time of last accepted submission (ascending — earlier is better)

**Response per participant:**
- Rank, username
- Problems solved count, total score/penalty
- Per-problem status: `AC` | `WA` | `PENDING` | `-` (not attempted)
- Time of last accepted submission

**Acceptance Criteria:**
- [ ] Leaderboard updates within 5 seconds of a submission verdict
- [ ] Leaderboard cached in Redis; cache invalidated on new `AC` submission
- [ ] Returns paginated results (default 50 per page)
- [ ] Supports sorting by rank
- [ ] Accessible during `ACTIVE` and `COMPLETED` contest states

---

### FR-LEAD-002: Global Leaderboard

| Field | Detail |
|---|---|
| **ID** | FR-LEAD-002 |
| **Title** | Global Leaderboard |
| **Actor** | All Users |
| **Priority** | MEDIUM |

**Description:**
The platform must maintain an all-time global ranking of users based on aggregate performance.

**Score Calculation:**
- Points awarded per contest based on rank achieved
- Weighted by contest difficulty and participant count

**Response:**
- Rank, username, total points, contests participated, problems solved, win count

---

## 10. FR-AI — AI-Powered Features

### FR-AI-001: AI Code Review

| Field | Detail |
|---|---|
| **ID** | FR-AI-001 |
| **Title** | AI Code Review |
| **Actor** | Student |
| **Priority** | HIGH |

**Description:**
After receiving a verdict on a submission, users must be able to request an AI-powered code review.

**Preconditions:**
- Submission has a final verdict (not `PENDING`)

**Inputs:**
- Submission ID

**AI Analysis Includes:**
- Code quality assessment (naming, structure, readability)
- Best practice violations
- Algorithm efficiency suggestions
- Code smell detection
- Refactoring recommendations

**Response:**
- Overall code quality score (0–100)
- Section-by-section feedback
- Specific improvement suggestions with code examples
- Reference to better approaches

**Acceptance Criteria:**
- [ ] AI review only available on user's own submissions (HTTP 403 otherwise)
- [ ] Review generation asynchronous; status polling endpoint available
- [ ] Review is stored and retrievable later (not re-generated each request)
- [ ] Returns HTTP 202 on request, HTTP 200 with review when ready
- [ ] Response time target: under 30 seconds

---

### FR-AI-002: Time & Space Complexity Analysis

| Field | Detail |
|---|---|
| **ID** | FR-AI-002 |
| **Title** | Complexity Analysis |
| **Actor** | Student |
| **Priority** | HIGH |

**Description:**
AI must analyze submitted code and provide time and space complexity estimates.

**Response includes:**
- Estimated time complexity (Big-O notation, e.g., O(n log n))
- Estimated space complexity
- Explanation of how complexity was determined
- Suggestions to optimize if complexity is suboptimal for the problem constraints

**Acceptance Criteria:**
- [ ] Complexity analysis included as part of the AI Code Review (FR-AI-001)
- [ ] Returned as structured data (not just free-form text)

---

### FR-AI-003: AI Hint Generation

| Field | Detail |
|---|---|
| **ID** | FR-AI-003 |
| **Title** | AI Hint Generation |
| **Actor** | Student |
| **Priority** | HIGH |

**Description:**
Students must be able to request progressive hints for a problem without receiving the full solution.

**Preconditions:**
- Problem is `PUBLISHED`
- User is authenticated

**Hint Levels:**
- **Hint 1:** High-level approach (e.g., "Consider a two-pointer technique")
- **Hint 2:** More specific direction (e.g., "Sort the array first, then...")
- **Hint 3:** Near-solution guidance (e.g., "For each element at index i, look for...")

**Inputs:**
- Problem ID
- Current hint level requested (1, 2, or 3)

**Acceptance Criteria:**
- [ ] Hints are progressive — Hint 2 is only available after Hint 1 is viewed
- [ ] Hints never contain complete working code
- [ ] Hints stored per (user, problem) pair — not regenerated each request
- [ ] Returns HTTP 403 if hint level requested out of order
- [ ] Contest participants can only request hints during `ACTIVE` contest

---

### FR-AI-004: Personalized Learning Roadmap

| Field | Detail |
|---|---|
| **ID** | FR-AI-004 |
| **Title** | Learning Roadmap |
| **Actor** | Student |
| **Priority** | MEDIUM |

**Description:**
The AI service must analyze user performance history and generate a personalized learning roadmap.

**Analysis Inputs:**
- Problems solved and their categories
- Difficulty distribution of solved problems
- Verdicts history (AC vs WA patterns)
- Contest performance history

**Roadmap Output:**
- Identified weak topic areas
- Recommended problem categories (ordered by priority)
- Curated practice problem list (problems from CodeForge library)
- Estimated improvement timeline
- Interview preparation track (if opted in)

**Acceptance Criteria:**
- [ ] Roadmap generated on first request; refreshed on subsequent requests if performance changed
- [ ] Minimum 5 submissions required before a meaningful roadmap is generated
- [ ] Returns helpful default guidance if insufficient data
- [ ] Returns HTTP 200 with roadmap JSON

---

### FR-AI-005: AI Interview Preparation Questions

| Field | Detail |
|---|---|
| **ID** | FR-AI-005 |
| **Title** | Interview Preparation |
| **Actor** | Student |
| **Priority** | LOW |

**Description:**
The AI must generate interview-style questions based on the user's solved problems and patterns.

**Output includes:**
- Conceptual questions derived from patterns used in solved problems
- Follow-up complexity questions
- System design questions (if user has solved system design problems)

**Acceptance Criteria:**
- [ ] Questions generated are relevant to user's actual solution history
- [ ] Questions stored per user and refreshed periodically
- [ ] Minimum 10 solved problems required to generate interview questions

---

## 11. FR-ANAL — Analytics & Reporting

### FR-ANAL-001: Contest Analytics (Organizer)

| Field | Detail |
|---|---|
| **ID** | FR-ANAL-001 |
| **Title** | Contest Analytics |
| **Actor** | Organizer, Admin |
| **Priority** | MEDIUM |

**Description:**
Organizers must be able to view detailed analytics for their contests after completion.

**Metrics Provided:**
- Total registrations vs active participants
- Submission count per problem
- Acceptance rate per problem
- Average solve time per problem
- Score distribution histogram
- Language distribution (Java vs Python vs C++ usage)

**Acceptance Criteria:**
- [ ] Available after contest status is `COMPLETED`
- [ ] Exportable as CSV (basic export)
- [ ] Returns HTTP 403 if organizer does not own the contest

---

### FR-ANAL-002: User Performance Dashboard

| Field | Detail |
|---|---|
| **ID** | FR-ANAL-002 |
| **Title** | User Performance Dashboard |
| **Actor** | Student |
| **Priority** | MEDIUM |

**Description:**
Students must have a personal dashboard showing their performance history.

**Metrics:**
- Total problems solved (by difficulty breakdown)
- Submission count and success rate
- Category-wise solved count (heatmap)
- Contest participation history with rank achieved
- Streak tracking (consecutive daily submissions)

**Acceptance Criteria:**
- [ ] Dashboard only shows authenticated user's own data
- [ ] Returns HTTP 200 with structured stats object
- [ ] Cached and refreshed on new submission completion

---

## 12. Requirement Traceability Matrix

| Req ID | Feature | Service | Priority | Status |
|---|---|---|---|---|
| FR-AUTH-001 | User Registration (Credential + OAuth path) | Auth Service | HIGH | Planned |
| FR-AUTH-002 | User Login (Credential + OAuth path) | Auth Service | HIGH | Planned |
| FR-AUTH-003 | Token Refresh | Auth Service | HIGH | Planned |
| FR-AUTH-004 | User Logout | Auth Service | MEDIUM | Planned |
| FR-AUTH-005 | View Profile | Auth Service | MEDIUM | Planned |
| FR-AUTH-006 | Update Profile | Auth Service | MEDIUM | Planned |
| FR-AUTH-007 | RBAC Enforcement | Gateway + All | HIGH | Planned |
| FR-AUTH-008 | Self-Service Organizer Upgrade | Auth Service | HIGH | Planned |
| **FR-AUTH-009** | **OAuth2 Login (Google / GitHub)** | **Auth Service** | **HIGH** | **Planned** |
| **FR-AUTH-010** | **Link / Unlink OAuth Provider** | **Auth Service** | **MEDIUM** | **Planned** |
| FR-PROB-001 | Create Problem | Contest Service | HIGH | Planned |
| FR-PROB-002 | Add Test Cases | Contest Service | HIGH | Planned |
| FR-PROB-003 | Publish Problem | Contest Service | HIGH | Planned |
| FR-PROB-004 | List & Search Problems | Contest Service | HIGH | Planned |
| FR-PROB-005 | View Problem Detail | Contest Service | HIGH | Planned |
| FR-PROB-006 | Update Problem | Contest Service | MEDIUM | Planned |
| FR-PROB-007 | Delete Problem | Contest Service | LOW | Planned |
| FR-CONT-001 | Create Contest | Contest Service | HIGH | Planned |
| FR-CONT-002 | Add Problems to Contest | Contest Service | HIGH | Planned |
| FR-CONT-003 | Schedule Contest | Contest Service | HIGH | Planned |
| FR-CONT-004 | Cancel Contest | Contest Service | MEDIUM | Planned |
| FR-CONT-005 | Participant Registration | Contest Service | HIGH | Planned |
| FR-CONT-006 | View Contest Details | Contest Service | HIGH | Planned |
| FR-CONT-007 | View Contest Problems | Contest Service | HIGH | Planned |
| FR-CONT-008 | List Contests | Contest Service | HIGH | Planned |
| FR-CONT-009 | Host a Contest (Self-Service) | Auth Service + Contest Service | HIGH | Planned |
| FR-CONT-010 | Join via Invite Link / Code | Contest Service | HIGH | Planned |
| FR-CONT-011 | Public Contest Discovery | Contest Service | HIGH | Planned |
| FR-SUB-001 | Submit Code | Execution Service | HIGH | Planned |
| FR-SUB-002 | Verdict Generation | Execution Engine | HIGH | Planned |
| FR-SUB-003 | Language Support | Execution Engine | HIGH | Planned |
| FR-SUB-004 | View Submission Result | Execution Service | HIGH | Planned |
| FR-SUB-005 | Submission History | Execution Service | MEDIUM | Planned |
| FR-SUB-006 | Rate Limiting | Execution Service + Redis | MEDIUM | Planned |
| FR-LEAD-001 | Contest Leaderboard | Contest Service | HIGH | Planned |
| FR-LEAD-002 | Global Leaderboard | Contest Service | MEDIUM | Planned |
| FR-AI-001 | AI Code Review | AI Service | HIGH | Planned |
| FR-AI-002 | Complexity Analysis | AI Service | HIGH | Planned |
| FR-AI-003 | AI Hint Generation | AI Service | HIGH | Planned |
| FR-AI-004 | Learning Roadmap | AI Service | MEDIUM | Planned |
| FR-AI-005 | Interview Prep Questions | AI Service | LOW | Planned |
| FR-ANAL-001 | Contest Analytics | Contest Service | MEDIUM | Planned |
| FR-ANAL-002 | User Performance Dashboard | Contest Service | MEDIUM | Planned |

---

**Total Requirements:** 48
**HIGH Priority:** 31 _(+1 from OAuth2 feature)_
**MEDIUM Priority:** 14 _(+1 from OAuth2 feature)_
**LOW Priority:** 3

### Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-18 | Initial FRD |
| 1.1 | 2026-06-18 | Added self-service Host a Contest flow: FR-AUTH-008, FR-CONT-009, FR-CONT-010, FR-CONT-011; updated Actors table and RBAC matrix |
| 1.2 | 2026-06-18 | Added OAuth2 authentication: FR-AUTH-009 (OAuth Login), FR-AUTH-010 (Link/Unlink Provider); updated FR-AUTH-001 and FR-AUTH-002 to include OAuth paths |
| 1.3 | 2026-06-24 | Aligned with HLD v1.5: replaced all "Assessment Service" → "Contest Service"/"Execution Service"; removed stale org references; updated FR-CONT-010 join conditions |

---

*Document Version: 1.3 | CodeForge Platform*
