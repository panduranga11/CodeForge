# Frontend Implementation Plan

**Project:** CodeForge — Frontend SPA (Premium Rebuild)
**Version:** 1.0
**Status:** Ready to Execute
**Date:** 2026-06-28
**Reads with:** `frontend_high_level_design.md` (v2.0), `frontend_low_level_design.md` (v2.0)

This plan sequences the rebuild into phases. Each phase has **goal**, **deliverables (files)**, **acceptance criteria**, and **dependencies**. Phases are ordered so the app is runnable and demonstrable at the end of each. We **keep the existing tooling/config** (Vite, TS, Tailwind, ESLint, deps) and rebuild the application layer; the old `features/*` pages are replaced, not patched.

---

## Guiding Principles

1. **Design system first.** No page is built before its primitives exist. This is the fix for v1's visual drift.
2. **Vertical-slice demos.** Every phase ends in something you can click through end-to-end.
3. **Backend-faithful.** No mocked endpoints; types/flows match the running services.
4. **Strict gates.** Each phase must pass `tsc --noEmit` + `eslint --max-warnings 0` before merge.
5. **No dead ends.** A screen ships only with its loading/empty/error states.

---

## Phase 0 — Foundation Audit & Cleanup

**Goal:** Clean slate on the app layer; confirm tooling.

**Deliverables**
- Add deps: `@monaco-editor/react`, `@stomp/stompjs`, `sockjs-client`, `@types/sockjs-client`.
- Remove v1 feature pages/components scheduled for replacement (keep `axiosClient.ts`, `useAuthStore.ts`, types — refactor in place).
- Establish `src/shared/constants/config.ts` (WS URL, poll intervals, page sizes), `queryKeys.ts`, `lib/cn.ts`, `lib/format.ts`, `lib/verdict.ts`.
- Vite proxy: add `/ws` → `http://localhost:8082` (ws: true) alongside existing `/auth`,`/contest`,`/exec`.

**Acceptance**
- `npm run dev` boots; `tsc --noEmit` clean; theme tokens resolve.

**Depends on:** nothing.

---

## Phase 1 — Design System & Theme

**Goal:** The single source of visual truth.

**Deliverables**
- `index.css`: forge tokens as CSS variables, base layer, font imports (Outfit + JetBrains Mono).
- `shared/components/ui/*`: Button, Input, Textarea, Select, Label, Field, Card, Badge, Dialog, Tabs, Skeleton, Spinner, EmptyState, StatCard, PageHeader, Pagination, CopyButton, Avatar, Tooltip (+ `index.ts`).
- `shared/components/brand/*`: Logo, EmberField.
- Centralized variant logic (`cva`) incl. Badge status/verdict/difficulty colors.
- A throwaway `/_kitchensink` route (dev-only) rendering every primitive/variant for visual QA.

**Acceptance**
- Kitchen-sink shows all primitives in the forge theme, no drift; keyboard focus rings visible; `eslint` clean.

**Depends on:** Phase 0.

---

## Phase 2 — App Shell, Routing & Auth

**Goal:** A user can register/login/logout and move through a themed shell.

**Deliverables**
- `app/queryClient.ts`, `app/providers.tsx`, `app/router.tsx` (lazy routes, guards).
- `shared/components/layout/*`: AppLayout, Sidebar, Topbar, PageHeader wiring.
- `shared/components/feedback/*`: ProtectedRoute (with `from` capture), GuestRoute, OwnerGuard, ErrorBoundary, NotFound.
- `features/auth`: LoginPage, RegisterPage, OAuthCallbackPage, OAuthButtons, AuthShell, `useLogin/useRegister`, authApi, authSchemas; harden axios refresh↔store sync.
- Auth store finalized (`setAuth/setTokens/setUser/logout`).

**Acceptance**
- Register → auto-login → dashboard placeholder; refresh persists session; logout clears + redirects; guards bounce correctly; OAuth callback path parses tokens (manual token test ok); 401 refresh replays a queued request.

**Depends on:** Phases 0–1.

---

## Phase 3 — Dashboard

**Goal:** Meaningful landing surface.

**Deliverables**
- `features/dashboard`: DashboardPage, MetricGrid, ActiveContests, QuickActions, `useDashboard` (analytics + contests slice), analyticsApi.

**Acceptance**
- Real metrics render from `/analytics/user/dashboard`; active/upcoming contests list; skeletons + empty states; host vs student quick actions differ.

**Depends on:** Phase 2.

---

## Phase 4 — Contests: Browse & Detail

**Goal:** Discover, view, register/join contests.

**Deliverables**
- `features/contests` (browse/detail subset): ContestsPage (All/My tabs, search, filter, pagination), ContestDetailPage (read + participant actions), ContestCard, ContestStatusBadge, ContestCountdown, RegisterPanel, InviteCodeChip, ProblemRow, `useContests/useContest/useProblems`, contestApi, problemApi.
- Register (OPEN) and Join-by-code (INVITE_ONLY) flows.

**Acceptance**
- Browse paginates; My tab filters to hosted; detail shows problems + status; register/join updates participant state live; invite copy works; all states themed.

**Depends on:** Phases 2–3.

---

## Phase 5 — Host Authoring & Lifecycle

**Goal:** Full self-service hosting end-to-end.

**Deliverables**
- CreateContestPage/EditContestPage (Zod), HostActionPanel, ProblemEditorPage, TestCaseManagerPage, `useContestMutations/useProblemMutations`, contest/problem schemas.
- Lifecycle controls: Schedule, Cancel (Dialog confirm), publish/delete problem; status-gated affordances.
- Role-upgrade-on-host wiring (refresh session role after `host`).
- Host watch: `contest(id)` refetchInterval while SCHEDULED.

**Acceptance**
- Create → add problem → add SAMPLE+HIDDEN cases → publish → schedule; status badge advances to ACTIVE via scheduler without manual reload; invalid transitions hidden; ownership-guarded.

**Depends on:** Phase 4.

---

## Phase 6 — Solve Workspace (Monaco + Judging)

**Goal:** The premium centerpiece — author and submit code, watch it judge.

**Deliverables**
- `features/solve`: SolveWorkspacePage (full-height layout), ProblemStatement (tabs), CodeEditor (lazy Monaco + forge theme), LanguageSelect, JudgePanel, TestResultList, VerdictBanner, SubmissionHistory.
- Hooks: `useSubmission` (submit), `useSubmissionJudge` (poll state machine), `useCodeDraft` (localStorage drafts), submissionApi.

**Acceptance**
- Open PUBLISHED problem in ACTIVE contest → write code → submit → 202 PENDING → live per-test reveal → terminal verdict; AC triggers success burst + invalidates leaderboard/submissions; draft survives refresh; submit locked when COMPLETED; timeout path handled.

**Depends on:** Phases 4–5.

---

## Phase 7 — Leaderboard (REST + Live WS)

**Goal:** Real-time rankings.

**Deliverables**
- `features/leaderboard`: LeaderboardPage, LeaderboardTable, Podium, RankBadge, `useLeaderboard`, `useLiveLeaderboard`, `useStompTopic`, leaderboardApi.

**Acceptance**
- REST seeds table; STOMP push updates ranks < 2s after an AC; `connected` indicator; poll fallback when WS down; current user highlighted; paginates.

**Depends on:** Phase 6 (to generate real rank changes).

---

## Phase 8 — Profile, Role Upgrade & Submissions

**Goal:** Account management + history.

**Deliverables**
- `features/profile`: ProfilePage, ProfileCard, EditProfileForm, ChangePasswordForm, OAuthLinks, HostUpgradeCard, `useProfile/useProfileMutations`, profileApi, profileSchemas.
- MySubmissionsPage (within contests or shared) + ContestAnalyticsPage (Recharts).

**Acceptance**
- Edit name/password; STUDENT sees Host upgrade → role flips in place, host UI unlocks without re-login; OAuth providers list/unlink; submissions history filters + paginates; analytics renders.

**Depends on:** Phases 2, 6.

---

## Phase 9 — Polish, Responsive, Accessibility

**Goal:** Premium finish.

**Deliverables**
- Page entrance motion (staggered fade-up), verdict reveal animation, ember hover/focus consistency.
- Responsive passes: sidebar icon-rail, solve workspace stacking, tables → cards on mobile.
- A11y: focus traps in dialogs, keyboard nav, aria labels, color-contrast check.
- Final empty/error/loading audit across every route.

**Acceptance**
- No layout breaks 480–1280px; keyboard-only path through core flows; zero visual drift; Lighthouse a11y ≥ 90.

**Depends on:** Phases 1–8.

---

## Phase 10 — Tests & Hardening

**Goal:** Confidence + regressions guarded.

**Deliverables**
- Vitest unit tests: `verdict.ts`, `format.ts`, auth store, `useSubmissionJudge` state machine, query-key factory.
- Component tests: Button/Badge/Field; a render test per critical page (login, contest detail, solve) with mocked services.
- Flow test: submit → judging → resolved transition with mocked poll.

**Acceptance**
- `npm test` green; critical flows covered; `tsc` + `eslint --max-warnings 0` clean; `npm run build` succeeds.

**Depends on:** all.

---

## Sequencing & Dependency Graph

```
P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7
                 │         └→ P8 (profile/subs/analytics, after P6)
                 └──────────────→ (P9 polish spans P1–P8)
                                   P10 tests (after all)
```

## Definition of Done (per phase)
- `tsc --noEmit` clean · `eslint --max-warnings 0` · all new surfaces have loading/empty/error · uses only design-system primitives · no `any` · flows reach a clear next action.

## Risks & Mitigations
| Risk | Mitigation |
|---|---|
| WS not routed via gateway | Dev Vite proxy `/ws`→8082; document prod ingress need (HLD §4/§11) |
| Monaco bundle weight | Lazy-load only on solve route; separate chunk |
| Submission poll storms | Auto-stop on terminal + 60s cap; single in-flight per submission |
| Scheduler lag (30s) vs UI expectations | Show "starts in / awaiting activation" copy; host refetchInterval |
| Token/store divergence on refresh | Sync rotated tokens into Zustand, not just localStorage |
| OAuth callback contract drift | Verify exact callback query param names against backend before P2 sign-off |

## Out of Scope (this rebuild)
Admin panel, AI features UI (`/ai/**`), payments, i18n, SSR. Hooks/types left extensible for later.

---

*End of Frontend Implementation Plan v1.0.*
