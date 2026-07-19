# Security & Correctness Audit Fixes — 2026-07-19

Branch: `fix/security-audit`. Fixes from the full-project audit, critical items
first plus the highest-impact medium ones. Each entry: what was wrong, why it
mattered, what changed.

---

## C1 — IDOR: any user could read anyone's submission source code (CRITICAL)

**File:** `execution-service/.../SubmissionServiceImpl.java` (`getById`)

`getById(submissionId, requesterId)` accepted the requester ID and never used
it — any authenticated user with a submission UUID could fetch another
competitor's full source code mid-contest.

**Fix:** owner check after load. Non-owners get `SubmissionNotFoundException`
(404, not 403) so submission IDs can't even be probed for existence.

---

## C2 — Pipe-buffer deadlock in DockerSandbox → false TLE (HIGH)

**File:** `execution-service/.../DockerSandbox.java`

`execute()` called `process.waitFor(...)` **before** reading stdout. OS pipe
buffers hold ~64KB; a correct solution printing more blocked on `write()`,
the service blocked in `waitFor`, the timeout fired → **false TLE**. The same
pattern made `compile()`'s timeout ineffective (blocking read before waitFor).

**Fix:** `StreamGobbler` daemon threads consume stdout/stderr concurrently
from before the wait; output capped at 1MB (print-bomb protection) while
still draining the pipe so the child never blocks.

---

## C3 — Compile container had network access (HIGH)

**File:** `DockerSandbox.java` (`buildBaseCommand`)

Execution ran with `--network=none` but compilation didn't — and compilation
is code execution in enough ecosystems to matter. Nothing about compiling
Java/C++/Python/JS needs network.

**Fix:** `--network=none` for both phases.

---

## C4 — Sandbox hardening: root user, no cap-drop, writable mount (HIGH)

**File:** `DockerSandbox.java`

**Fix:**
- `--cap-drop=ALL` on both phases (was: full default capability set)
- Execute phase runs as `--user=65534:65534` (nobody) — was container root
- Execute phase mounts `/code:ro` — submitted code can no longer write to the
  host mount (compile keeps rw; compilers write build outputs)
- `ensureWorldTraversable()` relaxes the temp dir perms so uid 65534 can read
  it on Linux (700 default); no-op on Windows

Defense-in-depth stack is now: no network, memory+swap cap, cpus=1,
pids-limit, cap-drop ALL, no-new-privileges, read-only rootfs, noexec tmpfs,
non-root, read-only code mount.

---

## C5 — Blacklist validator: role clarified, false positive removed (MEDIUM)

**File:** `SecurityValidatorStep.java`

String blacklists are trivially bypassed (concatenation, reflection,
encodings) — documented in-code that this step is fast CE feedback only and
the sandbox is the actual boundary. Removed `Thread.sleep` from the Java ban
list (legitimate solutions were rejected).

---

## C7 — Hardcoded JWT secret fallback removed (HIGH)

**Files:** `auth-service/application.yml`, `api-gateway/application.yml`

`${JWT_SECRET:ThisIsAVeryLong...}` meant a forgotten env var would silently
run production with a signing key committed to git — anyone could mint valid
tokens for any user/role.

**Fix:** `${JWT_SECRET}` with no default — startup fails fast when unset.
⚠️ **Local dev:** `JWT_SECRET` was added to `.env.local` (loaded by
`scripts/start-all.ps1`). If you start auth-service or api-gateway manually,
you must now set `$env:JWT_SECRET` (same value for both services).

---

## C8 — Refresh tokens now hashed at rest (HIGH)

**Files:** `auth-service/.../TokenHasher.java` (new), `UserServiceImpl.java`,
`OAuth2ServiceImpl.java`

Refresh tokens (7-day lifetime) were stored plaintext — a DB dump equaled
live session hijack for every user.

**Fix:** store `SHA-256(token)`; lookups hash the presented token. Raw token
exists only client-side and in transit.
⚠️ Existing refresh-token rows are invalidated — users just log in again.

---

## M1 — Worker transaction no longer spans Docker execution (MEDIUM)

**Files:** `ExecutionWorker.java`, `ExecutionResultPersister.java` (new)

`@Transactional` on the RabbitMQ listener pinned one Hikari connection per
in-flight submission for the entire multi-second sandbox run — pool
exhaustion at ~10 concurrent submissions.

**Fix:** persistence moved to `ExecutionResultPersister` (own bean so the
`@Transactional` proxy actually applies); the listener holds no transaction.

---

## M2 — Idempotent result persistence (MEDIUM)

**File:** `ExecutionResultPersister.java`

On RabbitMQ redelivery the old code re-graded and **appended duplicate test
results**. Now: if verdict != PENDING the delivery is skipped, and the Kafka
`submission.completed` event is only published on first persistence — so the
leaderboard can't receive duplicates either.

---

## M8 — OAuth callback page scrubs tokens + cleans up on failure (MEDIUM)

**File:** `frontend/.../OAuthCallbackPage.tsx`

Tokens stayed in the URL fragment in browser history; a failed profile fetch
left half-authenticated state (tokens set, no user).

**Fix:** `history.replaceState` removes the fragment immediately after
parsing; profile-fetch failure calls `logout()` before redirecting.

---

## M10 — Page-size caps on all list endpoints (MEDIUM)

**Files:** `SubmissionController.java`, `ContestController.java`,
`LeaderboardController.java`, `contest-service/.../PageUtils.java` (new)

`?size=100000` was a free heavy-query DoS. All paginated endpoints now clamp
size to [1, 100].

---

## M12 — Password policy consistent on profile change (LOW)

**File:** `UpdateProfileRequest.java`

Registration required upper/digit/special; password *change* only required
length 8 — a change could weaken the password below signup policy. Same
`@Pattern` rules now apply (null still allowed; the field is optional).

---

## Verified already fixed (audit corrections)

- **BUG-06 (TOCTOU on maxParticipants)** — actually fixed by
  `ContestRepository.tryReserveSlot()`: atomic conditional UPDATE
  (`currentParticipants < maxParticipants`), better than a pessimistic lock.
- BUG-01/02/03/04/07/08 — confirmed fixed in code (commit `30b38b7`);
  the BUGS_AND_FIXES.md status table was stale.

## Known-open items deliberately NOT in this pass

- `X-User-Id` header trust (C6): requires deployment-level fix (private
  network + internal auth header or mTLS) — documented invariant, no code
  change meaningful in local dev.
- Rank recalculation write amplification (M4), Redis N+1 on leaderboard
  reads (M5), memory measurement (M6), typed Feign DTOs (M9), circuit
  breakers (M11), tests / Dockerfiles / Flyway / observability — next pass.
