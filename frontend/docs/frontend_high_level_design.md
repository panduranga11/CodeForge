# Frontend High Level Design (HLD)

**Project:** CodeForge — Frontend SPA
**Version:** 2.0
**Status:** Approved for Rebuild
**Date:** 2026-06-28
**Supersedes:** v1.0 (`frontend_high_level_design.md`, root)

**Changes (v2.0):**
- Rewritten as the authoritative design for a **premium, hand-crafted rebuild** (v1 had incomplete flows and inconsistent page composition)
- Added **end-to-end user flow diagrams** for every actor journey (the primary gap in v1)
- Added **real-time architecture** section (STOMP/SockJS live leaderboard + async submission polling)
- Confirmed and documented the exact **API Gateway contract** (Bearer in → `X-User-Id` injected; WS bypasses gateway)
- Locked the **design system** as a reusable primitive layer, not ad-hoc Tailwind per page
- Added Monaco code editor as a first-class subsystem

---

## Table of Contents

1. [Purpose & Product Goals](#1-purpose--product-goals)
2. [Actors & Access Matrix](#2-actors--access-matrix)
3. [Architecture Style](#3-architecture-style)
4. [Architecture Diagram](#4-architecture-diagram)
5. [Technology Stack](#5-technology-stack)
6. [Feature Module Breakdown](#6-feature-module-breakdown)
7. [End-to-End User Flows](#7-end-to-end-user-flows)
8. [Routing Architecture](#8-routing-architecture)
9. [State Management Strategy](#9-state-management-strategy)
10. [API Integration & Gateway Contract](#10-api-integration--gateway-contract)
11. [Real-Time Architecture](#11-real-time-architecture)
12. [Design System & Theming](#12-design-system--theming)
13. [Security Considerations](#13-security-considerations)
14. [Performance Strategy](#14-performance-strategy)
15. [Non-Functional Requirements](#15-non-functional-requirements)

---

## 1. Purpose & Product Goals

The CodeForge frontend is a **Single Page Application** and the sole client for the CodeForge platform — an AI-powered coding contest, assessment, and learning system backed by four microservices behind an API Gateway.

### Product Goals

| Goal | What it means for the frontend |
|---|---|
| **Premium, hand-crafted feel** | A distinctive "industrial forge" aesthetic, not generic UI. Every state (loading, empty, error, success) is intentionally designed. Motion is deliberate. |
| **Coherent end-to-end flow** | A user can move guest → register → browse → join → solve → submit → see rank without a dead end or orphan page. Every action has a clear next step. |
| **Real, IDE-grade code experience** | Monaco editor, language switching, live judging feedback — the editor is the centerpiece, not an afterthought. |
| **Backend-faithful** | Types mirror backend DTOs exactly. Flows respect real backend semantics (async submission, lifecycle scheduler, WS broadcast). No invented endpoints. |
| **Role-fluid hosting** | Any user can self-upgrade to host a contest. The UI surfaces host capabilities contextually, never gating behind a separate "admin" silo. |

### Design Non-Negotiables

- No generic AI aesthetics (no Inter/Roboto, no purple-on-white, no cookie-cutter cards).
- The forge theme (charcoal + molten ember) is the established, approved direction.
- Distinctive display + mono type pairing (Outfit + JetBrains Mono).
- Every page shares the same design-system primitives — zero visual drift between screens.

---

## 2. Actors & Access Matrix

| Actor | Backend Role | Frontend Capabilities |
|---|---|---|
| **Guest** | none | Landing/auth pages, public contest browse & problem preview (read-only) |
| **Student** | `ROLE_STUDENT` | Dashboard, join contests, solve problems, submit code, view own submissions, leaderboards, profile |
| **Host / Organizer** | `ROLE_ORGANIZER` | Everything a student can, **plus** create/manage contests, author problems & test cases, run contest lifecycle, view contest analytics |
| **Admin** | `ROLE_ADMIN` | Full access (admin panel is out-of-scope for this rebuild; role is respected but no dedicated UI yet) |

> **Self-Service Host:** A `ROLE_STUDENT` becomes `ROLE_ORGANIZER` by calling `PATCH /auth/upgrade-to-organizer`, which returns a **new token pair** with the upgraded role. The frontend swaps the session tokens in place and unlocks host UI without a re-login. This is a core flow (see §7.3).

### Capability Gating Strategy

- Role lives in the persisted auth session (`user.role`).
- Host-only affordances (Create Contest, Add Problem, Schedule, Cancel, Analytics) are **contextually rendered**, never on separate routes a student can't reach.
- Ownership is checked client-side via `contest.hostId === user.id` for per-contest host actions, and re-validated server-side (the gateway + service enforce real authorization).

---

## 3. Architecture Style

**Pattern: Feature-Sliced SPA with Server/Client State Separation + a Shared Design System**

```
┌──────────────────────────────────────────────────────────────┐
│                    Architecture Principles                     │
│                                                                │
│  Feature Modules     → Self-contained vertical slices          │
│  Design System Layer → Reusable primitives (single source of   │
│                        visual truth, consumed by all features) │
│  Server State        → React Query (cache, dedupe, refetch)    │
│  Client State        → Zustand (auth session, ephemeral UI)    │
│  Type-Safe API Layer → Typed Axios services mirroring DTOs     │
│  Real-Time Layer     → STOMP/WS + polling hooks                │
└──────────────────────────────────────────────────────────────┘
```

**Key Architectural Decisions**

| Decision | Choice | Reason |
|---|---|---|
| Framework | React 19 + TypeScript (strict) | Type safety end-to-end with backend DTOs |
| Build | Vite | Instant HMR, fast prod builds |
| Styling | Tailwind v4 + a hand-built primitive kit | Utility speed + zero visual drift via shared components |
| Server state | TanStack React Query v5 | Caching, dedupe, background refresh, polling |
| Client state | Zustand (persist) | Minimal auth/session store, no boilerplate |
| Forms | React Hook Form + Zod | Performant, schema-validated, typed |
| Routing | React Router v7 | Nested layouts, guards, typed params |
| HTTP | Axios + interceptors | JWT injection, 401 refresh queue |
| Editor | Monaco (`@monaco-editor/react`) | IDE-grade code authoring |
| Real-time | `@stomp/stompjs` + `sockjs-client` | Matches backend STOMP broadcast |

> **Why a hand-built primitive kit over heavy shadcn generation:** the rebuild's #1 goal is a *distinctive* look. We keep a small, theme-native component layer (Button, Input, Card, Badge, Dialog, Select, Tabs, Skeleton, EmptyState) so every screen is visually identical in language and nothing looks defaulted. shadcn primitives may back complex widgets (dialog/popover behavior) but are restyled to the forge theme.

---

## 4. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    React SPA (Vite, port 3000)               │  │
│  │                                                              │  │
│  │  FEATURE MODULES                                             │  │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │  │
│  │  │  auth  │ │ dashboard│ │ contests │ │  solve   │ │profile│ │  │
│  │  │ pages  │ │  pages   │ │  pages   │ │ (editor) │ │ pages │ │  │
│  │  │ hooks  │ │  hooks   │ │  hooks   │ │  hooks   │ │ hooks │ │  │
│  │  │service │ │ service  │ │ service  │ │ service  │ │service│ │  │
│  │  └───┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘ │  │
│  │      └───────────┴────────────┴────────────┴───────────┘     │  │
│  │                            │                                  │  │
│  │  SHARED LAYER              ▼                                  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │ Design System (Button/Input/Card/Badge/Dialog/...)     │  │  │
│  │  │ Layout Shell (Sidebar, Topbar, PageHeader)             │  │  │
│  │  │ Axios client (+JWT, +refresh)  Zustand auth store      │  │  │
│  │  │ React Query client  Real-time hooks (WS + poll)        │  │  │
│  │  │ Types (mirror backend DTOs)   Routes / constants       │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────┬───────────────────────────┬───────────────┘  │
│        REST (Vite proxy /auth,/contest,/exec)   │ WS (SockJS)       │
└───────────────────────│───────────────────────────│────────────────┘
                        ▼                           ▼
        ┌───────────────────────────┐   ┌───────────────────────────┐
        │   API GATEWAY (8080)      │   │  CONTEST SVC WS (8082)     │
        │ /auth/**     → 8081       │   │  /ws/leaderboard (SockJS)  │
        │ /contest/v1/** → 8082     │   │  topic: /topic/            │
        │ /exec/v1/**  → 8083       │   │  leaderboard/{contestId}   │
        │ /ai/**       → 8084       │   │  (NOT routed via gateway)  │
        └───────────────────────────┘   └───────────────────────────┘
```

> **Critical config detail:** the WebSocket endpoint lives on the contest-service directly and is **not** part of the gateway route table. In dev, Vite proxies `/ws` straight to `localhost:8082`. In prod, the deploy config must expose `/ws` to the contest service (gateway WS routing or a dedicated ingress rule).

---

## 5. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript (strict) | `noUnusedLocals/Parameters`, no `any` |
| UI | React 19 | Function components + hooks only |
| Build | Vite | `@` → `src` alias; dev proxy |
| Styling | Tailwind CSS v4 | CSS-variable theme tokens |
| Primitives | Hand-built kit (+ Radix where needed) | Forge-themed, shared |
| Server state | TanStack React Query v5 | Query keys + invalidation map (see LLD) |
| Client state | Zustand + persist | `auth-storage` in localStorage |
| Forms | React Hook Form + Zod | Resolver-bound schemas |
| Routing | React Router v7 | Guards + nested layouts |
| HTTP | Axios | Shared instance + interceptors |
| Code editor | `@monaco-editor/react` | Lazy-loaded |
| Real-time | `@stomp/stompjs`, `sockjs-client` | Live leaderboard |
| Charts | Recharts | Dashboard/analytics |
| Icons | Lucide React | Stroke icons, consistent weight |
| Toasts | Sonner | Themed, top-right |
| Dates | date-fns | UTC-aware formatting |
| Test | Vitest + Testing Library | Hooks + critical flows |

> New dependencies vs v1: `@monaco-editor/react`, `@stomp/stompjs`, `sockjs-client` (+ `@types/sockjs-client`).

---

## 6. Feature Module Breakdown

Each feature is a vertical slice: `pages/`, `components/` (feature-private), `hooks/`, `services/`, `schemas/`, `index.ts` (barrel exposing only pages/public hooks).

### 6.1 `features/auth`
Login, Register, OAuth2 callback handling, the auth Zustand store, route guards, and the role-upgrade action. Owns the session lifecycle.

### 6.2 `features/dashboard`
Landing surface after login. Personal metrics (contests participated, submissions, problems solved) from analytics, plus active/upcoming contests and quick actions. Role-aware (hosts see "your hosted contests" summary).

### 6.3 `features/contests`
Contest browse (All / My, search, status filter, pagination), contest detail (info, problem list, registration, host action panel), create-contest form, and the host authoring sub-flows (add problem, manage test cases, lifecycle controls). Also analytics for hosts.

### 6.4 `features/solve`
The participant problem-solving experience: problem statement panel + Monaco editor + language selector + run/submit + the **live judging** result panel + submission history. This is intentionally its own module (distinct from `contests`) because it has a unique full-height workspace layout.

### 6.5 `features/leaderboard`
Contest ranking view: REST-seeded table + live STOMP updates, rank deltas, podium highlight. Reusable as a route and as an embedded panel.

### 6.6 `features/profile`
Account display/edit, password change, OAuth provider linking, and the **Host upgrade** call-to-action for students.

### 6.7 `shared`
Design system, layout shell, axios client, query client, types, constants, real-time hooks, formatting utils, route guards.

---

## 7. End-to-End User Flows

> These flows are the heart of v2. Every flow terminates in a clear next action — no dead ends.

### 7.1 Guest → Authenticated

```
Landing/Login ──▶ POST /auth/login ──▶ {accessToken, refreshToken, user}
     │                                          │
     │ (no account)                             ▼
     ▼                                  Zustand setAuth() ──▶ persist
  Register ──▶ POST /auth/register ──▶ (same token pair) ──▶ /dashboard
     │
     ▼
  OAuth (Google/GitHub) ──▶ /auth/oauth2/authorize/{p}
     ──▶ provider ──▶ backend callback ──▶ redirect to
         /oauth/callback?accessToken=..&refreshToken=..
     ──▶ frontend parses, setAuth(), fetch /auth/profile ──▶ /dashboard
```

### 7.2 Host a Contest (full lifecycle)

```
[Student or Organizer]
  Create Contest (POST /contests/host)        status = DRAFT
        │   (auto role-upgrade to ORGANIZER handled server-side;
        │    frontend refreshes session role)
        ▼
  Contest Detail (host panel visible)
        ├─▶ Add Problem (POST /contests/{id}/problems)        problem DRAFT
        │       └─▶ Add Test Cases (POST .../testcases)   SAMPLE + HIDDEN
        │       └─▶ Publish Problem (PATCH .../publish)      problem PUBLISHED
        ├─▶ (repeat for N problems)
        ▼
  Schedule Contest (PATCH /contests/{id}/schedule)     DRAFT → SCHEDULED
        ▼
  [30s lifecycle scheduler]  SCHEDULED ──(startTime)──▶ ACTIVE
                              ACTIVE   ──(endTime)────▶ COMPLETED
        ▼
  Host watches live leaderboard + analytics; can Cancel pre-active.
```

**Frontend responsibilities:** surface the *current* valid actions per status (e.g., Schedule only in DRAFT; Cancel only in DRAFT/SCHEDULED; Add Problem only before ACTIVE), and reflect scheduler-driven status changes by refetching the contest (status badge updates without manual reload via query refetch interval while a host watches a pending contest).

### 7.3 Self-Service Role Upgrade

```
Profile (role = STUDENT) ──▶ "Become a Host"
   ──▶ PATCH /auth/upgrade-to-organizer ──▶ new {accessToken, refreshToken, user(role=ORGANIZER)}
   ──▶ swap tokens in Zustand (in place, no logout)
   ──▶ host UI unlocks app-wide (Create Contest appears)
```

> Also triggered implicitly by "Host a Contest" from a student account — same endpoint, then proceed to the create form.

### 7.4 Participant: Join → Solve → Submit → Rank

```
Browse Contests ──▶ Contest Detail
   ├─ OPEN reg:        POST /contests/{id}/register
   └─ INVITE_ONLY:     enter code ──▶ POST /contests/join {inviteCode}
        ▼
  Registered (participant) — when contest ACTIVE, problems are solvable
        ▼
  Open Problem ──▶ Solve Workspace (statement + Monaco + samples)
        ▼
  Submit (POST /exec/v1/submissions) ──▶ 202 { verdict: PENDING }
        ▼
  ┌─ JUDGING (poll GET /exec/v1/submissions/{id} every ~1.5s) ─┐
  │   live panel reveals per-test results as they arrive       │
  └─ terminal verdict: AC | WA | CE | RE | TLE | MLE ──────────┘
        ▼
  On AC ──▶ Kafka submission.completed ──▶ leaderboard recompute
        ▼
  Leaderboard (live STOMP push) ──▶ user sees rank change in real time
```

### 7.5 Submission Verdict State Machine (frontend)

```
        submit()
           │ 202 PENDING
           ▼
     ┌──────────┐  poll (interval, capped retries/timeout)
     │ JUDGING  │──────────────┐
     └────┬─────┘              │ verdict still PENDING
          │ verdict terminal   ▼
          ▼                 (keep polling, animate test progress)
   ┌─────────────┐
   │  RESOLVED   │  AC → success burst; others → diagnostic panel
   └─────────────┘
          │ network error / timeout
          ▼
   ┌─────────────┐
   │   ERROR     │  retry CTA, submission preserved in history
   └─────────────┘
```

---

## 8. Routing Architecture

```
PUBLIC (GuestRoute — redirects authed users to /dashboard)
  /login                                   LoginPage
  /register                                RegisterPage
  /oauth/callback                          OAuthCallbackPage

PUBLIC (no guard — browseable by guests, read-only)
  /explore                                 PublicContestsPage (optional landing)

PROTECTED (ProtectedRoute + AppLayout shell)
  /dashboard                               DashboardPage
  /contests                                ContestsPage (tabs: All | My)
  /contests/create                         CreateContestPage          (host)
  /contests/:id                            ContestDetailPage
  /contests/:id/edit                       EditContestPage            (host, owner)
  /contests/:id/problems/new               ProblemEditorPage          (host, owner)
  /contests/:id/problems/:pid              ProblemDetailPage (preview/route to solve)
  /contests/:id/problems/:pid/edit         ProblemEditorPage          (host, owner)
  /contests/:id/problems/:pid/testcases    TestCaseManagerPage        (host, owner)
  /contests/:id/problems/:pid/solve        SolveWorkspacePage         (participant)
  /contests/:id/leaderboard                LeaderboardPage
  /contests/:id/analytics                  ContestAnalyticsPage       (host, owner)
  /submissions                             MySubmissionsPage
  /profile                                 ProfilePage

FALLBACK
  /                                        → /dashboard
  *                                        → NotFound (themed) → /dashboard
```

**Guards**
- `GuestRoute` — authed users bounce to `/dashboard`.
- `ProtectedRoute` — unauthed users bounce to `/login` (preserving intended path for post-login return).
- `OwnerGuard` (in-page, not a route) — host-only pages verify `contest.hostId === user.id`; on mismatch, render a themed "not authorized" state with a path back.

> Routing change vs v1: the solve experience moves to a dedicated `/solve` route with its own full-height layout (escaping the standard sidebar shell), and host authoring routes are nested and owner-guarded. v1's flat `problems/:problemId` is split into **preview**, **edit**, **testcases**, and **solve** to remove the page-role ambiguity that caused the "no proper flow" problem.

---

## 9. State Management Strategy

| State | Tool | Scope | Persistence |
|---|---|---|---|
| Auth session (user, tokens) | Zustand | Global | localStorage `auth-storage` |
| Server data (contests, problems, submissions, leaderboard) | React Query | Per-query | In-memory, keyed cache |
| Form state | React Hook Form | Per-form | None |
| Editor draft (code per problem) | Zustand (lightweight) + localStorage | Per problem | localStorage (survive refresh mid-contest) |
| Ephemeral UI (modals, tabs) | `useState` | Per-component | None |

**Principles**
- Server state is **never** copied into Zustand. The auth store holds only client-owned session data.
- **Editor drafts persist locally** keyed by `problemId` so a refresh during a contest never loses work — a premium, contest-grade detail.
- Query keys are centralized (see LLD) so invalidation is predictable (e.g., a successful submit invalidates `['submissions', contestId]` and the contest leaderboard).

---

## 10. API Integration & Gateway Contract

### Response envelope (all endpoints)
```ts
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;          // present on success
  errorCode?: string; // present on failure
  timestamp?: string;
}
```
Services unwrap one level (`r.data` → `ApiResponse<T>`); components read `data.data`. Errors surface `message` in a toast; `errorCode` maps to friendly copy where useful.

### Auth contract
- Frontend sends **`Authorization: Bearer <accessToken>`** on every authenticated request (Axios interceptor).
- The **gateway validates the JWT and injects `X-User-Id`, `X-User-Email`, `X-User-Role`** downstream. The frontend **never** sends `X-User-Id` itself.
- `401` triggers a single-flight refresh (`POST /auth/refresh`) with a queued-request replay; refresh failure clears the session and routes to `/login`.

### Service base paths
| Domain | Base | Auth |
|---|---|---|
| Auth | `/auth/**` | mixed (login/register/refresh/oauth public) |
| Contest/Problem/Leaderboard/Analytics | `/contest/v1/**` | mixed (browse/preview public; mutations protected) |
| Submissions | `/exec/v1/**` | all protected |
| AI (future) | `/ai/**` | protected |

### Async submission contract (critical)
`POST /exec/v1/submissions` → **`202 Accepted`** with `verdict: PENDING`. The verdict is computed asynchronously (RabbitMQ → execution workers → Kafka). The frontend **polls** `GET /exec/v1/submissions/{id}` until `verdict !== PENDING` (or a timeout), rendering live progress.

### Pagination contract
List endpoints return Spring `Page<T>`: `{ content, totalElements, totalPages, number, size, ... }`. The frontend reads `data.data.content` + `totalPages`.

---

## 11. Real-Time Architecture

Two independent real-time mechanisms:

### 11.1 Live Leaderboard (server push)
```
Contest svc broadcasts ──▶ STOMP topic /topic/leaderboard/{contestId}
Frontend: SockJS connect ─▶ ws://localhost:8082/ws/leaderboard (dev: Vite proxy /ws)
          STOMP subscribe ▶ /topic/leaderboard/{contestId}
          on message      ▶ replace React Query cache for that leaderboard
Fallback: if WS unavailable, React Query polls the REST leaderboard (e.g., 10s).
```
- One STOMP client per leaderboard view; clean unsubscribe/disconnect on unmount.
- The REST `GET /contest/v1/leaderboard/contest/{id}` seeds the initial table; WS keeps it live.

### 11.2 Submission Judging (client poll)
```
useSubmissionJudge(submissionId):
   poll GET /exec/v1/submissions/{id} @ ~1500ms
   stop when verdict ∈ {AC,WA,CE,RE,TLE,MLE} OR elapsed > ~60s
   expose { status: 'judging'|'resolved'|'error', submission, testProgress }
```
- Backed by React Query `refetchInterval` that returns `false` once terminal.
- Drives the live result panel (per-test reveal, timing/memory, verdict banner).

> Rationale: the backend is genuinely asynchronous; pretending submission is synchronous would either block the UI or lie about results. The poll-with-animation turns a backend constraint into a premium "watch it judge" moment.

---

## 12. Design System & Theming

**Aesthetic:** Dark Industrial Forge — molten metal on cooled steel.

### Color tokens (CSS variables)
| Token | Value | Usage |
|---|---|---|
| `--forge-black` | `#0a0a0b` | App background |
| `--forge-dark` | `#111113` | Cards/panels |
| `--forge-surface` | `#18181b` | Inputs, elevated surfaces |
| `--forge-border` | `#27272a` | Borders, dividers |
| `--forge-muted` | `#71717a` | Secondary text |
| `--forge-text` | `#e4e4e7` | Body text |
| `--forge-white` | `#fafafa` | Headings |
| `--ember-400/500/600` | `#fb923c/#f97316/#ea580c` | Accent, CTAs, links, gradients |
| semantic | green/blue/violet/red | verdicts & statuses (AC, scheduled, hidden, errors) |

### Typography
- **Outfit** — display & body. **JetBrains Mono** — code, data, badges, timestamps.

### System primitives (single source of visual truth)
`Button` (variants: primary-gradient, surface, ghost, danger), `Input`, `Textarea`, `Select`, `Label`, `Field` (label+control+error), `Card`, `Badge` (status/verdict/difficulty variants), `Dialog`, `Tabs`, `Skeleton`, `EmptyState`, `Spinner`, `Tooltip`, `Avatar`, `StatCard`, `PageHeader`, `Pagination`, `CopyButton`.

### Motion language
- One orchestrated entrance per page (staggered fade-up), not scattered micro-animations.
- Ember glow on focus/hover for interactive elements.
- Verdict reveal: a deliberate, satisfying state transition (success burst on AC).

### Consistency rule
No page hand-rolls a button/input/card. If a primitive is missing, it's added to the kit first, then consumed. This is what eliminates the "pages not aligned" problem from v1.

---

## 13. Security Considerations

| Concern | Approach |
|---|---|
| XSS | React auto-escaping; no `dangerouslySetInnerHTML` (problem statements rendered via a sanitized markdown renderer if rich text is needed) |
| CSRF | JWT in `Authorization` header (not cookies) → inherently CSRF-safe |
| Token storage | localStorage via Zustand persist; refresh-token rotation on every refresh |
| Token expiry | Axios single-flight refresh; failed refresh → forced logout |
| Authorization | Client gates host UI for UX; **server is the source of truth** (gateway + service enforce) |
| Input validation | Zod schemas mirror backend Bean Validation rules |
| Secrets | None in client; OAuth handled by backend redirect, tokens delivered post-callback |
| WS origin | Contest svc allows origin patterns; dev via Vite proxy |

---

## 14. Performance Strategy

| Strategy | Implementation |
|---|---|
| Route-based code splitting | `React.lazy` per feature; Monaco lazy-loaded only on the solve route |
| Query caching | React Query stale times tuned per resource (contests 30s, leaderboard live, profile 5m) |
| Polling discipline | Submission poll auto-stops on terminal verdict; leaderboard prefers WS over polling |
| Editor draft persistence | Debounced localStorage writes, not per-keystroke |
| Bundle | Vite tree-shaking; Monaco and charts in separate chunks |
| Fonts | `preconnect` + `display=swap` |
| Skeletons | Every async surface has a themed skeleton (perceived performance) |

---

## 15. Non-Functional Requirements

| Requirement | Target | Approach |
|---|---|---|
| First Contentful Paint | < 1.5s | Lean critical path, code splitting |
| TS strictness | 100% | `strict`, no `any`, no unused |
| Accessibility | WCAG 2.1 AA | Focus management, semantic markup, keyboard paths, Radix-backed widgets |
| Responsiveness | 480 / 768 / 1024 / 1280 | Tailwind breakpoints; solve workspace gracefully stacks on mobile |
| Resilience | No dead ends | Every error/empty state has a themed component + recovery action |
| Real-time | < 2s rank reflect | WS push; poll fallback ≤ 10s |
| Consistency | Zero visual drift | Shared primitive kit enforced by convention + review |

---

*End of Frontend HLD v2.0. See `frontend_low_level_design.md` for file-level structure and component contracts, and `frontend_implementation_plan.md` for the phased build sequence.*
