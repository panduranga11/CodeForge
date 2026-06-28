# Git Commands & Problems Faced — CodeForge

> Reconstructed from `git reflog` and the commit graph (the actual recorded
> history), not from session memory.

## Important: scope & limits of this reconstruction

This is **not** an exact transcript of every command typed. It is rebuilt from
`git reflog`, which only records operations that moved `HEAD`. Specifically:

- **Captured by reflog** (and therefore reliable here): `commit`, `checkout`,
  `revert`, `reset`, `cherry-pick`, `pull`, `pull --rebase`.
- **NOT captured by reflog** (used, but invisible in this reconstruction):
  `git status`, `git add`, `git diff`, `git push`, `git branch`, `git log`,
  and any `gh` PR commands (PR create/merge happened on GitHub).

So the workflow below is accurate for the history-changing steps, but the
day-to-day commands (add/status/push/etc.) are not listed because the reflog
does not store them.

## The normal workflow used

The repo follows a **feature-branch + cherry-pick + PR-merge** pattern. The
recurring command sequence was:

```bash
git checkout -b feature/<name>          # create a feature branch
git commit -m "..."                     # commit work
git cherry-pick <sha>                   # copy a commit from one branch onto another
git pull origin main                    # sync local main (fast-forward)
git pull --rebase origin main           # sync without creating a merge commit
git checkout main / git checkout feature/...   # switch branches
```

PRs #1–#8 were merged on GitHub; each merge appears as a
`Merge pull request #N` commit in the graph.

## The specific tangle (and how it got resolved)

The most recent docs commit
(`docs: update HLD, LLD, FRD for UTC timestamps...`) went through several
false starts before landing cleanly. In chronological order:

| Step | Command | What happened |
|------|---------|---------------|
| 1 | `git commit` -> `2525cc6` | Docs update committed on `feature/contest-service` |
| 2 | repeated `git checkout` | Switching between `main` and `feature/contest-service` to figure out where the commit belonged |
| 3 | `git revert` -> `39a96e8` | A **revert** of the docs commit was created — this is where things went sideways |
| 4 | `git reset` -> `bb0297f` | `main` was reset back to a clean state to undo the mess |
| 5 | `git cherry-pick` -> `28887e3`, then `git reset 39a96e8`, then `git cherry-pick` -> `32bb4c8` | The docs commit was finally **cherry-picked cleanly onto `main`** as `32bb4c8` (current HEAD) |

### The problem in plain terms

The docs commit was made on the **wrong branch**
(`feature/contest-service`) and there was confusion about how to get it onto
`main`. A `git revert` was attempted (which creates a *new* commit that undoes
changes — not what you want for "move this elsewhere"), which added noise.

### How it was solved

- `git reset` rewound `main` back to a known-good commit (`bb0297f`),
  discarding the revert noise.
- `git cherry-pick` then **copied** the docs commit cleanly onto `main`,
  producing `32bb4c8`.
- The `feature/contest-service` branch still carries the revert (`39a96e8`)
  and the original commits (`2525cc6`, `0aa3b21`) — that branch diverged, but
  `main` ended up clean.

## Net result

- **`main`** is clean: ends at `32bb4c8` with the docs update applied via
  cherry-pick.
- `revert` vs `reset` vs `cherry-pick` were the three tools in play.

## Key lesson

`git revert` was the **wrong choice** for relocating a commit. The right
combination was:

- **`git cherry-pick`** to *copy* the commit to the correct branch.
- **`git reset`** to *clean up* the branch that got the revert noise.

## Caution

`git reset` and `git revert` on `main` rewrite/alter shared history. Since
`main` is pushed, these operations can cause divergence from `origin/main`.
Verify with:

```bash
git status
git log origin/main..main
```
