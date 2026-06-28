# Frontend Low Level Design (LLD)

**Project:** CodeForge — Frontend SPA
**Version:** 2.0
**Status:** Approved for Rebuild
**Date:** 2026-06-28
**Reads with:** `frontend_high_level_design.md` (v2.0), `frontend_implementation_plan.md`

This document specifies the **concrete, file-level** design: folder structure, the full type system mirroring backend DTOs, every API service function, the design-system component contracts, React Query key/invalidation maps, the real-time hooks, Zod schemas, and a page-by-page component specification. It is the blueprint a developer (or agent) implements directly.

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Conventions](#2-conventions)
3. [Type System (Backend DTO Mirror)](#3-type-system-backend-dto-mirror)
4. [API Service Layer](#4-api-service-layer)
5. [Axios Client Internals](#5-axios-client-internals)
6. [Auth Store (Zustand)](#6-auth-store-zustand)
7. [React Query Keys & Invalidation Map](#7-react-query-keys--invalidation-map)
8. [Routing Implementation](#8-routing-implementation)
9. [Design System Component Contracts](#9-design-system-component-contracts)
10. [Layout Shell](#10-layout-shell)
11. [Real-Time Hooks](#11-real-time-hooks)
12. [Code Editor Integration](#12-code-editor-integration)
13. [Zod Form Schemas](#13-zod-form-schemas)
14. [Page-by-Page Specification](#14-page-by-page-specification)
15. [State/Empty/Error Patterns](#15-stateempty-error-patterns)

---

## 1. Folder Structure

```
src/
├── main.tsx                      # createRoot, ErrorBoundary, Providers
├── index.css                     # Tailwind + theme tokens + base
├── app/
│   ├── providers.tsx             # QueryClientProvider, RouterProvider, Toaster
│   ├── router.tsx                # route tree (lazy pages)
│   └── queryClient.ts            # configured QueryClient
│
├── shared/
│   ├── api/
│   │   └── axiosClient.ts        # shared axios + interceptors
│   ├── components/
│   │   ├── ui/                   # DESIGN SYSTEM primitives
│   │   │   ├── Button.tsx  Input.tsx  Textarea.tsx  Select.tsx
│   │   │   ├── Label.tsx   Field.tsx  Card.tsx      Badge.tsx
│   │   │   ├── Dialog.tsx  Tabs.tsx   Skeleton.tsx  Spinner.tsx
│   │   │   ├── EmptyState.tsx  Tooltip.tsx  Avatar.tsx
│   │   │   ├── StatCard.tsx Pagination.tsx CopyButton.tsx
│   │   │   └── index.ts          # barrel
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx  Sidebar.tsx  Topbar.tsx  PageHeader.tsx
│   │   ├── feedback/
│   │   │   ├── ErrorBoundary.tsx  ProtectedRoute.tsx
│   │   │   ├── GuestRoute.tsx      OwnerGuard.tsx  NotFound.tsx
│   │   └── brand/
│   │       ├── Logo.tsx  EmberField.tsx   # animated ember particles
│   ├── hooks/
│   │   ├── useStompTopic.ts   useDebouncedCallback.ts  useCountdown.ts
│   ├── lib/
│   │   ├── cn.ts             # class merge (clsx + tailwind-merge)
│   │   ├── format.ts         # dates (UTC), numbers, durations
│   │   └── verdict.ts        # verdict → label/color/icon maps
│   ├── constants/
│   │   ├── routes.ts   enums.ts (label maps)  config.ts (WS url, intervals)
│   └── types/
│       ├── api.ts  auth.ts  contest.ts  problem.ts
│       ├── submission.ts  leaderboard.ts  analytics.ts  index.ts
│
└── features/
    ├── auth/
    │   ├── pages/ LoginPage.tsx RegisterPage.tsx OAuthCallbackPage.tsx
    │   ├── components/ OAuthButtons.tsx AuthShell.tsx
    │   ├── hooks/ useAuthStore.ts useLogin.ts useRegister.ts useUpgradeRole.ts
    │   ├── services/ authApi.ts
    │   ├── schemas/ authSchemas.ts
    │   └── index.ts
    ├── dashboard/
    │   ├── pages/ DashboardPage.tsx
    │   ├── components/ MetricGrid.tsx ActiveContests.tsx QuickActions.tsx
    │   ├── hooks/ useDashboard.ts
    │   └── index.ts
    ├── contests/
    │   ├── pages/ ContestsPage.tsx ContestDetailPage.tsx
    │   │          CreateContestPage.tsx EditContestPage.tsx
    │   │          ProblemEditorPage.tsx TestCaseManagerPage.tsx
    │   │          ProblemDetailPage.tsx ContestAnalyticsPage.tsx
    │   ├── components/ ContestCard.tsx ContestStatusBadge.tsx
    │   │          HostActionPanel.tsx ProblemRow.tsx RegisterPanel.tsx
    │   │          ContestCountdown.tsx InviteCodeChip.tsx
    │   ├── hooks/ useContests.ts useContest.ts useProblems.ts
    │   │          useContestMutations.ts useProblemMutations.ts
    │   ├── services/ contestApi.ts problemApi.ts analyticsApi.ts
    │   ├── schemas/ contestSchemas.ts problemSchemas.ts
    │   └── index.ts
    ├── solve/
    │   ├── pages/ SolveWorkspacePage.tsx
    │   ├── components/ ProblemStatement.tsx CodeEditor.tsx
    │   │          LanguageSelect.tsx JudgePanel.tsx TestResultList.tsx
    │   │          VerdictBanner.tsx SubmissionHistory.tsx
    │   ├── hooks/ useSubmission.ts useSubmissionJudge.ts useCodeDraft.ts
    │   ├── services/ submissionApi.ts
    │   └── index.ts
    ├── leaderboard/
    │   ├── pages/ LeaderboardPage.tsx
    │   ├── components/ LeaderboardTable.tsx Podium.tsx RankBadge.tsx
    │   ├── hooks/ useLeaderboard.ts useLiveLeaderboard.ts
    │   ├── services/ leaderboardApi.ts
    │   └── index.ts
    └── profile/
        ├── pages/ ProfilePage.tsx
        ├── components/ ProfileCard.tsx EditProfileForm.tsx
        │          ChangePasswordForm.tsx OAuthLinks.tsx HostUpgradeCard.tsx
        ├── hooks/ useProfile.ts useProfileMutations.ts
        ├── services/ profileApi.ts
        ├── schemas/ profileSchemas.ts
        └── index.ts
```

---

## 2. Conventions

- **Imports:** always `@/...` alias; never `../../` climbing.
- **Barrels:** each feature `index.ts` exports only pages + truly shared hooks (e.g., `useAuthStore`). Feature-private components/services are not re-exported.
- **Components:** named exports, `PascalCase` files. One component per file (small helpers may co-locate).
- **Hooks:** `useX` named exports; data hooks wrap React Query, mutation hooks wrap `useMutation` and own their invalidations + toasts.
- **Services:** plain typed functions; unwrap one envelope level (`.then(r => r.data)`), no toasts/side-effects in services.
- **No `any`.** Use generated DTO types. Errors typed as `AxiosError<ApiResponse<never>>`.
- **Styling:** primitives via the `ui/` kit + `cn()`. Pages compose primitives; raw Tailwind only for layout, never to re-implement a primitive.

---

## 3. Type System (Backend DTO Mirror)

> `src/shared/types/*` — exact mirror of backend DTOs. Backend uses UTC `Instant`/`LocalDateTime`; typed as ISO `string`.

```ts
// api.ts
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string;
  timestamp?: string;
}
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // current page (0-based)
  size: number;
  first: boolean;
  last: boolean;
}

// auth.ts
export type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN';        // backend: ROLE_* stripped to bare
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type AuthType = 'LOCAL' | 'OAUTH' | 'BOTH';
export type OAuthProvider = 'GOOGLE' | 'GITHUB';

export interface UserResponse {
  id: string; fullName: string; email: string;
  role: Role; status: UserStatus; avatarUrl: string | null;
  authType: AuthType; createdAt: string;
}
export interface TokenResponse {
  accessToken: string; refreshToken: string; user: UserResponse;
}
export interface OAuthProviderResponse {
  provider: OAuthProvider; providerEmail: string; linkedAt: string;
}
export interface RegisterRequest { fullName: string; email: string; password: string; }
export interface LoginRequest { email: string; password: string; }
export interface RefreshTokenRequest { refreshToken: string; }
export interface UpdateProfileRequest {
  fullName?: string; currentPassword?: string; newPassword?: string;
}

// contest.ts
export type ContestStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type Visibility = 'PUBLIC' | 'PRIVATE';
export type RegType = 'OPEN' | 'INVITE_ONLY';
export type ScoringMode = 'POINTS' | 'PENALTY_TIME' | 'PERCENTAGE';

export interface Contest {
  id: string; title: string; description: string;
  startTime: string; endTime: string;
  status: ContestStatus; visibility: Visibility; regType: RegType;
  scoringMode: ScoringMode; maxParticipants: number | null;
  inviteCode: string | null; inviteLink: string | null;
  hostId: string; participantCount: number; problemCount: number;
  createdAt: string;
}
export interface CreateContestRequest {
  title: string; description: string; startTime: string; endTime: string;
  visibility: Visibility; regType: RegType; scoringMode: ScoringMode;
  maxParticipants?: number | null;
}
export interface JoinContestRequest { inviteCode: string; }
export interface JoinContestResponse {
  contestId: string; contestTitle: string; message: string;
}

// problem.ts
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ProblemStatus = 'DRAFT' | 'PUBLISHED';
export type TestCaseType = 'SAMPLE' | 'HIDDEN';
export type ProblemCategory =
  | 'ARRAYS' | 'STRINGS' | 'LINKED_LIST' | 'TREES' | 'GRAPHS'
  | 'DYNAMIC_PROGRAMMING' | 'GREEDY' | 'BACKTRACKING' | 'SORTING'
  | 'SEARCHING' | 'MATH' | 'SQL' | 'SYSTEM_DESIGN' | 'MISCELLANEOUS';

export interface TestCase {
  id: string; input: string; expectedOutput: string;
  type: TestCaseType; scoreWeight: number;
}
export interface Problem {
  id: string; contestId: string; title: string; description: string;
  difficulty: Difficulty; category: ProblemCategory;
  timeLimit: number; memoryLimit: number;
  inputFormat: string; outputFormat: string; constraintsText: string;
  explanation: string | null; tags: string | null;
  points: number; sequenceNo: number; status: ProblemStatus;
  sampleTestCases: TestCase[]; createdAt: string;
}
export interface CreateProblemRequest {
  title: string; description: string; difficulty: Difficulty;
  category: ProblemCategory; timeLimit: number; memoryLimit: number;
  inputFormat: string; outputFormat: string; constraintsText: string;
  explanation?: string | null; tags?: string | null;
  points: number; sequenceNo: number;
}
export type UpdateProblemRequest = Partial<CreateProblemRequest>;
export interface CreateTestCaseRequest {
  input: string; expectedOutput: string; type: TestCaseType; scoreWeight: number;
}

// submission.ts
export type Language = 'JAVA' | 'PYTHON' | 'CPP' | 'JAVASCRIPT';
export type Verdict = 'PENDING' | 'AC' | 'WA' | 'CE' | 'RE' | 'TLE' | 'MLE';

export interface TestResult {
  testCaseId: string; passed: boolean; executionTime: number; memoryUsed: number;
}
export interface Submission {
  id: string; userId: string; problemId: string; contestId: string | null;
  language: Language; verdict: Verdict;
  executionTime: number | null; memoryUsed: number | null;
  errorMessage: string | null; submittedAt: string; testResults: TestResult[];
}
export interface CreateSubmissionRequest {
  problemId: string; contestId?: string | null; language: Language; sourceCode: string;
}

// leaderboard.ts
export interface LeaderboardEntry {
  rank: number; userId: string; score: number;
  penaltyTime: number; problemsSolved: number; lastAcTime: string | null;
}

// analytics.ts
export interface ProblemStats { problemId: string; title: string; points: number; sequenceNo: number; }
export interface ContestAnalytics {
  contestId: string; totalParticipants: number; totalProblems: number;
  problemStats: ProblemStats[];
}
export interface UserDashboard {
  contestsParticipated: number; totalSubmissions: number; problemsSolved: number;
}
```

> **Terminal verdicts:** `AC | WA | CE | RE | TLE | MLE`. `PENDING` is the only non-terminal state and the poll trigger.

---

## 4. API Service Layer

> Each function returns `Promise<ApiResponse<T>>` (envelope unwrapped one level). Paths are exact. Protected endpoints rely on the axios Bearer interceptor; `X-User-Id` is gateway-injected — **never set client-side**.

### authApi.ts
| fn | method · path | body / params | returns |
|---|---|---|---|
| `register` | POST `/auth/register` | `RegisterRequest` | `TokenResponse` |
| `login` | POST `/auth/login` | `LoginRequest` | `TokenResponse` |
| `refresh` | POST `/auth/refresh` | `RefreshTokenRequest` | `TokenResponse` |
| `logout` | POST `/auth/logout` | `RefreshTokenRequest` | `void` |
| `getProfile` | GET `/auth/profile` | — | `UserResponse` |
| `updateProfile` | PATCH `/auth/profile` | `UpdateProfileRequest` | `UserResponse` |
| `upgradeToOrganizer` | PATCH `/auth/upgrade-to-organizer` | — | `TokenResponse` |
| `getOAuthProviders` | GET `/auth/oauth2/providers` | — | `OAuthProviderResponse[]` |
| `unlinkProvider` | DELETE `/auth/oauth2/unlink/{provider}` | — | `void` |

### contestApi.ts
| fn | method · path | returns |
|---|---|---|
| `getAll` | GET `/contest/v1/contests?page&size` | `PageResponse<Contest>` |
| `explore` | GET `/contest/v1/contests/explore?page&size` | `PageResponse<Contest>` |
| `getById` | GET `/contest/v1/contests/{id}` | `Contest` |
| `create` | POST `/contest/v1/contests` | `Contest` |
| `host` | POST `/contest/v1/contests/host` | `Contest` |
| `schedule` | PATCH `/contest/v1/contests/{id}/schedule` | `Contest` |
| `cancel` | POST `/contest/v1/contests/{id}/cancel` | `Contest` |
| `register` | POST `/contest/v1/contests/{id}/register` | `void` |
| `join` | POST `/contest/v1/contests/join` | `JoinContestResponse` |
| `getByInvite` | GET `/contest/v1/contests/join/{inviteCode}` | `Contest` |
| `isParticipant` | GET `/contest/v1/contests/{id}/participants/{userId}` | `boolean` |

### problemApi.ts
| fn | method · path | returns |
|---|---|---|
| `list` | GET `/contest/v1/contests/{cid}/problems` | `Problem[]` |
| `getById` | GET `/contest/v1/contests/{cid}/problems/{pid}` | `Problem` |
| `create` | POST `/contest/v1/contests/{cid}/problems` | `Problem` |
| `update` | PATCH `/contest/v1/contests/{cid}/problems/{pid}` | `Problem` |
| `publish` | PATCH `/contest/v1/contests/{cid}/problems/{pid}/publish` | `Problem` |
| `remove` | DELETE `/contest/v1/contests/{cid}/problems/{pid}` | `void` |
| `listTestCases` | GET `/contest/v1/contests/{cid}/problems/{pid}/testcases?type?` | `TestCase[]` |
| `createTestCase` | POST `/contest/v1/contests/{cid}/problems/{pid}/testcases` | `TestCase` |

### submissionApi.ts
| fn | method · path | returns |
|---|---|---|
| `submit` | POST `/exec/v1/submissions` | `Submission` (202, PENDING) |
| `getById` | GET `/exec/v1/submissions/{id}` | `Submission` |
| `list` | GET `/exec/v1/submissions?contestId?&page&size` | `PageResponse<Submission>` |

### leaderboardApi.ts
| fn | method · path | returns |
|---|---|---|
| `getContest` | GET `/contest/v1/leaderboard/contest/{cid}?page&size` | `PageResponse<LeaderboardEntry>` |

### analyticsApi.ts
| fn | method · path | returns |
|---|---|---|
| `getContest` | GET `/contest/v1/analytics/contest/{cid}` | `ContestAnalytics` |
| `getUserDashboard` | GET `/contest/v1/analytics/user/dashboard` | `UserDashboard` |

---

## 5. Axios Client Internals

`shared/api/axiosClient.ts` (already implemented in v1 — retained, hardened):
- **Request interceptor:** reads `auth-storage` from localStorage, attaches `Authorization: Bearer <accessToken>`.
- **Response interceptor:** on `401` + not already retried → single-flight refresh:
  - If a refresh is in progress, queue the request and replay after the new token resolves.
  - On refresh success: persist rotated tokens, replay queued + original.
  - On refresh failure: clear `auth-storage`, redirect to `/login`.
- **Refresh** uses a bare `axios.post('/auth/refresh', ...)` (not the instrumented instance) to avoid interceptor recursion.

> Hardening for v2: also sync the rotated tokens into the Zustand store (not just localStorage) so in-memory state and persisted state never diverge; guard `JSON.parse` with try/catch.

---

## 6. Auth Store (Zustand)

```ts
interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (t: TokenResponse) => void;       // login/register/oauth/upgrade
  setTokens: (a: string, r: string) => void; // silent refresh
  setUser: (u: UserResponse) => void;         // profile update
  logout: () => void;                          // clear + call authApi.logout
}
// persist({ name: 'auth-storage' }) — persists user + tokens + isAuthenticated
```
- `setAuth` is the single entry point for any new token pair (login, register, OAuth callback, **role upgrade**). Role upgrade reuses it → host UI unlocks instantly.

---

## 7. React Query Keys & Invalidation Map

**Key factory** (`shared/constants/queryKeys.ts`):
```ts
export const qk = {
  dashboard: ['dashboard'] as const,
  contests: (scope: 'all'|'explore', page: number) => ['contests', scope, page] as const,
  contest: (id: string) => ['contest', id] as const,
  problems: (cid: string) => ['problems', cid] as const,
  problem: (cid: string, pid: string) => ['problem', cid, pid] as const,
  testCases: (cid: string, pid: string) => ['testcases', cid, pid] as const,
  isParticipant: (cid: string, uid: string) => ['participant', cid, uid] as const,
  submissions: (cid?: string) => ['submissions', cid ?? 'all'] as const,
  submission: (id: string) => ['submission', id] as const,
  leaderboard: (cid: string) => ['leaderboard', cid] as const,
  analytics: (cid: string) => ['analytics', cid] as const,
  oauthProviders: ['oauth-providers'] as const,
};
```

**Invalidation map** (mutation → invalidate):
| Mutation | Invalidates |
|---|---|
| create/host contest | `contests(*)` |
| schedule/cancel contest | `contest(id)`, `contests(*)` |
| register / join | `isParticipant(id,uid)`, `contest(id)` |
| create/update/delete problem | `problems(cid)`, `contest(cid)` |
| publish problem | `problems(cid)`, `problem(cid,pid)` |
| create test case | `testCases(cid,pid)`, `problem(cid,pid)` |
| submit code (on terminal AC) | `submissions(cid)`, `leaderboard(cid)` |
| update profile | `['dashboard']` (name), store `setUser` |
| upgrade role | store `setAuth`; no query invalidation needed |

**Live behavior**
- `contest(id)` uses `refetchInterval` while status ∈ {SCHEDULED} **and** the viewer is the host, so scheduler transitions appear without reload (cleared when ACTIVE/COMPLETED).
- `submission(id)` poll governed by `useSubmissionJudge` (see §11).
- `leaderboard(cid)` seeded by REST; replaced by WS pushes; 10s poll fallback when WS down.

---

## 8. Routing Implementation

`app/router.tsx` — `createBrowserRouter`, pages `React.lazy`-loaded.
- `GuestRoute` / `ProtectedRoute` as wrapper routes (`<Outlet/>`), per HLD §8.
- `ProtectedRoute` captures `location` for post-login redirect (`navigate(from)`).
- Host authoring + analytics pages render inside `AppLayout`, then wrap content in `<OwnerGuard contest={...}>`.
- `SolveWorkspacePage` is **outside** the standard `AppLayout` (full-height workspace) but still under `ProtectedRoute`; it has a slim contextual top bar with back-to-contest + countdown.
- `routes.ts` exports `ROUTES` with builder fns; no hardcoded strings anywhere.

---

## 9. Design System Component Contracts

> `shared/components/ui/*`. Every prop typed; variants via `cva`. `cn()` merges classes. These are the single source of visual truth.

| Component | Key props | Variants / notes |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `leftIcon`, `rightIcon`, `asChild` | `primary` (ember gradient + glow), `surface`, `ghost`, `danger`, `link`; `loading` shows spinner, disables |
| `Input` | native + `error`, `leftIcon`, `rightSlot` | ember focus ring; error border red |
| `Textarea` | native + `error` | non-resize default |
| `Select` | `options`, `value`, `onChange`, `error` | native styled or Radix; forge surface |
| `Field` | `label`, `error`, `hint`, `required`, `children` | composes Label + control + error text (one layout for all forms) |
| `Card` | `as`, `interactive`, `glow` | `interactive` adds hover border/glow; base panel styling |
| `Badge` | `variant` | `status` (per ContestStatus), `verdict` (per Verdict), `difficulty`, `neutral` — color logic centralized here |
| `Dialog` | Radix-backed | themed overlay + content; used for confirms (cancel contest, delete problem) |
| `Tabs` | `tabs`, `value`, `onChange` | underline-ember active indicator (used by Contests All/My, Solve panels) |
| `Skeleton` | `className` | shimmer on forge-surface |
| `Spinner` | `size` | ember ring |
| `EmptyState` | `icon`, `title`, `description`, `action` | themed empty surface with optional CTA — every list uses this |
| `StatCard` | `icon`, `label`, `value`, `accent` | dashboard/metric tiles |
| `PageHeader` | `title`, `subtitle`, `actions` | consistent page top; eliminates per-page header drift |
| `Pagination` | `page`, `totalPages`, `onChange` | prev/next + page indicator |
| `CopyButton` | `value`, `label` | invite code copy w/ check feedback |
| `Avatar` | `src`, `name`, `size` | initial fallback on ember disc |
| `Tooltip` | Radix-backed | hints (e.g., verdict meanings) |

**Badge color logic (centralized):**
- Status: ACTIVE=green, SCHEDULED=blue, DRAFT=ember, COMPLETED=muted, CANCELLED=red.
- Verdict: AC=green, PENDING=blue(pulse), WA/RE/TLE/MLE=red family, CE=amber.
- Difficulty: EASY=green, MEDIUM=amber, HARD=red.

---

## 10. Layout Shell

- **`AppLayout`** — fixed left `Sidebar` + scrollable main with max-width container; renders `<Outlet/>`. Ember vertical accent on the sidebar edge.
- **`Sidebar`** — Logo, primary nav (Dashboard, Contests, Submissions, Profile), a prominent "Host a Contest" CTA, and a footer user block (avatar, name, role, logout). Active route = ember text + surface pill. Collapses to icon-rail < 768px.
- **`Topbar`** (within solve workspace only) — back-to-contest, problem title, live `ContestCountdown`, submit button anchor.
- **`PageHeader`** — title + subtitle + right-aligned actions; used by every standard page for vertical rhythm consistency.

---

## 11. Real-Time Hooks

### `useStompTopic(topic, onMessage, { enabled })` — generic
- Lazily creates one SockJS+STOMP client to `config.WS_URL` (`/ws/leaderboard`), subscribes to `topic`, parses JSON frames to `onMessage`, and tears down on unmount / `enabled=false`. Reconnect with backoff; exposes `connected`.

### `useLiveLeaderboard(contestId)`
```
1. useQuery(qk.leaderboard(cid), leaderboardApi.getContest)  // seed + fallback poll(10s if !connected)
2. useStompTopic(`/topic/leaderboard/${cid}`, frame =>
       queryClient.setQueryData(qk.leaderboard(cid), mapFrameToPage(frame)))
3. return { entries, connected, isLoading }
```

### `useSubmissionJudge(submissionId)`
```
useQuery({
  queryKey: qk.submission(id),
  queryFn: () => submissionApi.getById(id),
  refetchInterval: (q) => isTerminal(q.state.data?.data.verdict) ? false : 1500,
  enabled: !!id,
})
derive: status = !data ? 'judging'
                : isTerminal(verdict) ? 'resolved'
                : 'judging'
on resolve+AC: invalidate submissions + leaderboard
expose { status, submission, verdict, testResults, elapsedMs }
hard stop: after ~60s of PENDING → status 'error' (timeout), keep row in history
```

### `useCodeDraft(problemId, language)`
- Reads/writes `localStorage['draft:{problemId}:{language}']`, debounced (500ms). Seeds editor; cleared on AC (optional).

---

## 12. Code Editor Integration

`solve/components/CodeEditor.tsx` wraps `@monaco-editor/react`:
- Lazy-loaded (`React.lazy` + Suspense skeleton) so Monaco isn't in the main bundle.
- Theme: a custom `forge-dark` Monaco theme matching token palette (defined on mount via `monaco.editor.defineTheme`).
- `languageMap`: `JAVA→java`, `PYTHON→python`, `CPP→cpp`, `JAVASCRIPT→javascript`.
- Props: `value`, `language`, `onChange`, `readOnly`. Options: font JetBrains Mono, ligatures, 14px, minimap off, smooth cursor, bracket colorization.
- Starter templates per language (optional) seed an empty draft.

---

## 13. Zod Form Schemas

Mirror backend Bean Validation. Examples:
```ts
// authSchemas.ts
loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8)
    .regex(/[A-Z]/, '1 uppercase').regex(/\d/, '1 digit')
    .regex(/[^A-Za-z0-9]/, '1 special char'),
});

// contestSchemas.ts  (refine endTime > startTime > now)
createContestSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  startTime: z.string(), endTime: z.string(),
  visibility: z.enum(['PUBLIC','PRIVATE']),
  regType: z.enum(['OPEN','INVITE_ONLY']),
  scoringMode: z.enum(['POINTS','PENALTY_TIME','PERCENTAGE']),
  maxParticipants: z.coerce.number().int().positive().optional(),
}).refine(d => new Date(d.endTime) > new Date(d.startTime), { path:['endTime'], message:'End must be after start' });

// problemSchemas.ts  (per backend: title 5-200, desc ≤10000, time 1-10, mem 16-512, points ≥1, seq ≥1)
// profileSchemas.ts  (newPassword same policy as register; requires currentPassword)
```
- `datetime-local` inputs convert to ISO/UTC before submit (`format.ts` helper).

---

## 14. Page-by-Page Specification

> Format: **data deps** · **mutations** · **key components** · **flow/states**.

### LoginPage
- deps: none · mut: `useLogin` → `authApi.login` → `setAuth` → redirect `from || /dashboard`
- components: `AuthShell` (forge split layout + `EmberField`), `Field`, `Button`, `OAuthButtons`
- states: validation errors inline; invalid creds → toast(message); loading button.

### RegisterPage
- mut: `useRegister` → `authApi.register` → `setAuth` → `/dashboard`
- same shell; password policy hints; duplicate email → toast.

### OAuthCallbackPage
- reads `accessToken`/`refreshToken` from query; `setTokens` + `authApi.getProfile` → `setUser` → `/dashboard`; on missing params → `/login` with error toast.

### DashboardPage
- deps: `analyticsApi.getUserDashboard`, `contestApi.getAll` (active/upcoming slice)
- components: `PageHeader`, `MetricGrid` (`StatCard` ×3: participated, submissions, solved), `ActiveContests` (`ContestCard` list), `QuickActions` (Host / Browse)
- states: skeletons per section; empty → EmptyState with CTA to browse/host.

### ContestsPage
- deps: `contestApi.getAll` (tab All) / filtered to `hostId===user.id` (tab My)
- components: `PageHeader` (+Host CTA), `Tabs`, search `Input`, status filter chips, `ContestCard` grid, `Pagination`
- states: skeleton grid; empty (My) → "host your first contest" CTA.

### ContestDetailPage
- deps: `contestApi.getById`, `problemApi.list`, `isParticipant`
- mut: `register`, `join`, `schedule`, `cancel`, `publish`, `delete problem`
- components: `PageHeader`, `ContestStatusBadge`, stat tiles, `ContestCountdown`, `RegisterPanel` (non-host), `HostActionPanel` (owner: Schedule/Add Problem/Cancel + per-problem Publish/TestCases/Delete), `ProblemRow` list, `InviteCodeChip`, Leaderboard link
- flow: actions gated by status + role per HLD §7.2; participant sees Solve on PUBLISHED problems when ACTIVE.

### CreateContestPage / EditContestPage
- mut: `host`/`create` (create) — on success route to detail; `update` (edit)
- components: `PageHeader`, `Field`-based form, `Select`s, datetime inputs, `Button`
- note: from a STUDENT, "Host" triggers role upgrade server-side; frontend refreshes session role on success.

### ProblemEditorPage (new/edit)
- mut: `problemApi.create`/`update` → on create, route to `TestCaseManagerPage`
- full problem form (title, desc, difficulty, category, limits, points, seq, formats, constraints, explanation, tags) via Zod.

### TestCaseManagerPage
- deps: `problem.getById`, `listTestCases`
- mut: `createTestCase`
- components: split — add form (input/expected/type/weight) | existing cases grouped SAMPLE/HIDDEN; "Done → back to contest" CTA; publish hint.

### ProblemDetailPage
- read-only preview (statement, samples); routes participant to `/solve`, host to editor.

### SolveWorkspacePage (the centerpiece)
- deps: `problem.getById`, `useCodeDraft`, recent `submissions(contestId)`
- mut: `submissionApi.submit` → `useSubmissionJudge`
- layout (full height, no sidebar): **left** `ProblemStatement` (tabs: Statement | Samples | Submissions) · **right** `LanguageSelect` + `CodeEditor` + action bar (Run-samples optional, Submit) + `JudgePanel`
- judging: `JudgePanel` shows `VerdictBanner` (PENDING pulse → terminal) + `TestResultList` (per-test pass/fail, time, mem); AC → success burst + leaderboard invalidate.
- countdown: `ContestCountdown` to endTime; lock submit when COMPLETED.

### LeaderboardPage
- deps: `useLiveLeaderboard(contestId)`
- components: `Podium` (top 3), `LeaderboardTable` (rank, user, solved, score, penalty, lastAC), live `connected` indicator, `Pagination`
- states: skeleton; empty → "no submissions yet"; current user row highlighted.

### ContestAnalyticsPage (host)
- deps: `analyticsApi.getContest`
- components: summary `StatCard`s (participants, problems), per-problem stats table/chart (Recharts).

### MySubmissionsPage
- deps: `submissionApi.list` (optionally filtered by contest)
- components: table (problem, language, `Badge verdict`, time, mem, submittedAt), filter by contest, `Pagination`; row → submission detail/solve.

### ProfilePage
- deps: `authApi.getProfile`, `getOAuthProviders`
- mut: `updateProfile`, `changePassword` (via updateProfile), `upgradeToOrganizer`, `unlinkProvider`
- components: `ProfileCard`, `EditProfileForm`, `ChangePasswordForm`, `OAuthLinks`, `HostUpgradeCard` (only role=STUDENT) → on upgrade `setAuth` and toast "You're now a host".

---

## 15. State/Empty/Error Patterns

- **Loading:** themed `Skeleton` matching final layout (never a bare spinner for page loads).
- **Empty:** `EmptyState` with icon + message + primary action (browse/host/add).
- **Error (query):** inline themed error card with retry; toast for mutation errors via `err.response.data.message`.
- **404 / not authorized:** themed `NotFound` / owner-guard state with a path back to safety.
- **Optimism:** registration/publish use optimistic toasts but reconcile on settle; submission never fakes a verdict.

---

*End of Frontend LLD v2.0.*
