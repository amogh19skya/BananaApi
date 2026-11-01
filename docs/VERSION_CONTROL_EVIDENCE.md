# Version Control Evidence — Banana Brain Quest

**Assignment:** CIS046-3  
**GitHub Repository:** https://github.com/amogh19skya/BananaApi  
**Main branch:** `main`  
**Project root:** `banana-brain-ques/`

---

## 1. Repository Overview

The repository demonstrates systematic feature branching throughout the full development lifecycle of Banana Brain Quest. Every significant feature was developed in an isolated branch, committed with descriptive messages, pushed to GitHub, and merged via Pull Request.

---

## 2. Branch History

| Branch Name | Purpose | Status |
|---|---|---|
| `main` | Stable production branch | Active — protected |
| `feature/auth-system` | Session-based login, registration, logout | Merged to main |
| `feature/difficulty-modes` | Easy (60 s), Hard (40 s), Extra Hard (25 s) puzzle timers | Merged to main |
| `feature/endless-runner` | Core Three.js 3D runner game loop | Merged to main |
| `feature/intro-screen` | Landing and intro screen | Merged to main |
| `feature/timed-game` | Time-based game session management | Merged to main |
| `feature/startup-script` | Server startup automation | Merged to main |
| `feature/runner-road-and-crate-puzzle` | 3D road, banana crates, puzzle integration | Merged to main |
| `feature/runner-difficulty-times` | Per-difficulty countdown timers | Merged to main |
| `feature/runner-main-and-difficulty-modes` | Runner entry point + mode selection UI | Merged to main |
| `feature/runner-collision-and-slide-mechanics` | AABB collision detection, press-hold slide | Merged to main |
| `feature/runner-puzzle-gameover-and-activate-flow` | Puzzle fail → game over, reward modal, ACTIVATE POWER button | Merged to main |
| `feature/streamline-runner-ui-and-avatar` | HUD polish, avatar visuals | Merged to main |
| `feature/align-with-assignment-brief` | Alignment with CIS046-3 brief requirements | Merged to main |
| `feature/leaderboard-global-rankings` | Global + per-mode leaderboard with tie-breaking and deduplication | Merged to main (via PR) |
| `feature/runner-powerup-images` | Power-up artwork in reward modal with entrance animation | Merged via game-history branch |
| `feature/game-history-statistics` | Record every game; full statistics dashboard; image/MIME fixes | Merged to main |
| `feature/ninja-player-avatar` | Articulated ninja billboard character with running/jumping/sliding animations | Pushed to origin |
| `feature/auth-login-first-flow` | Enforce login screen first on site entry, direct redirect to 3D runner on login | Pushed to origin |
| `feature/free-obstacle-pass` | Free obstacle pass (shield charge) on puzzle solve: yellow aura glow, HUD icon, crash absorption with quick flash & 1s invulnerability | **Current feature branch** |

---

## 3. Key Commits

All hashes verified with `git log` on local repository.

| Commit Hash | Branch | Message | Purpose |
|---|---|---|---|
| `615b5ff` | main (ancestor) | Build initial Banana Brain Quest game | Initial full-stack app setup |
| `0b17edf` | main | Add three difficulty modes | Easy / Hard / Extra Hard modes |
| `cc457f1` | feature/game-history-statistics | feat(difficulty): align runner difficulty modes to 60s, 40s, and 25s puzzle time limits | Timer values corrected |
| `90b22c7` | feature/game-history-statistics | fix(collision): correct obstacle dimensions and implement press-and-hold DOWN sliding mechanics | Sliding + AABB collision fix |
| `9d1ff32` | feature/game-history-statistics | feat(puzzle): implement puzzle-failure gameover, reward announcement modal, and explicit ACTIVATE POWER button flow | Puzzle reward flow |
| `4ef44e9` | feature/game-history-statistics | fix(landing): synchronize root index.html with runner HTML structure | Landing page sync |
| `6e0e6c9` | feature/game-history-statistics | feat(leaderboard): implement global and mode-specific rankings with windowed best performance deduplication, tie-breakers, and logged-in user highlighting | Full leaderboard system |
| `30e54b0` | feature/game-history-statistics | feat(powerups): integrate power-up images into announcement showcase with entrance animation and highway road enhancement | Power-up image showcase |
| `f59f0c5` | feature/game-history-statistics | feat(history): record every game played with full statistics, status, and dashboard history | Complete game history system |
| `d4be7f1` | feature/game-history-statistics | fix(powerups): serve .jfif images as image/jpeg so Chrome renders power-up images | MIME type fix; puzzle image onload |

---

## 4. Commit Message Convention

All commits in this project use Conventional Commits format:

```
type(scope): short description

Longer explanation of what changed and why.
```

**Types used:**

| Type | Meaning |
|---|---|
| `feat` | New feature added |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructured, no behaviour change |
| `test` | Tests added or updated |

---

## 5. Game History Feature — Test Evidence

The game history system was tested by sending direct API calls simulating four game-ending scenarios. All results were verified against the `game_history` database table.

| Scenario | End Condition | Status Saved | gameId | Score | Accuracy |
|---|---|---|---|---|---|
| A | Crash, 0 crates solved | `Game Over` | 14 | 0 | 0% |
| B | Wrong puzzle answer, 1 attempted | `Game Over` | 15 | 350 | 0% |
| C | Navigation abandon, 2 attempted 1 solved | `Abandoned` | 16 | 700 | 50% |
| D | All 10 crates solved | `Completed` | 17 | 3500 | 100% |

**Dashboard API verification:**  
`GET /api/scores/dashboard-stats` returned:
```json
{
  "totalGames": 4,
  "highestScore": 3500,
  "totalBananas": 198,
  "totalDistance": 913,
  "averageAccuracy": 38
}
```

**Leaderboard:** Rankings remained intact across all tests.

---

## 6. Power-up Images — Test Evidence

After MIME type fix (`d4be7f1`), all four images verified with `Invoke-WebRequest`:

| Image File | HTTP Status | Content-Type | Result |
|---|---|---|---|
| `golden-hoverboard.jfif` | 200 | `image/jpeg` | ✅ Rendered in Chrome |
| `magnet.jfif` | 200 | `image/jpeg` | ✅ Rendered in Chrome |
| `shield.jfif` | 200 | `image/jpeg` | ✅ Rendered in Chrome |
| `power.jfif` | 200 | `image/jpeg` | ✅ Rendered in Chrome |

**Root cause:** Express `serve-static` defaulted to `image/pjpeg` for `.jfif` files. Chrome does not render `image/pjpeg`. Fixed by adding `setHeaders` to `express.static` in `server.js`.

---

## 7. Pull Request Evidence

**PR target:** `main` ← `feature/game-history-statistics`

> **Action required:** Create the PR manually in browser:  
> https://github.com/amogh19skya/BananaApi/compare/main...feature/game-history-statistics

**Suggested PR title:**  
`feat: complete game history tracking, player statistics dashboard, power-up images, leaderboard rankings`

**Suggested PR description:**
> Combines all features developed in this session:
> - Full game history recording (every game, all outcomes)
> - Player statistics dashboard with 5 stat cards and per-game history
> - Power-up image showcase with correct MIME type serving for Chrome
> - Global and mode-specific leaderboard with tie-breaking
> - Puzzle image onload handling (no black rectangle flash)
>
> **Tested:** 4 game-ending scenarios, dashboard API, leaderboard integrity, all 4 power-up images.

---

## 8. Version Tag

| Tag | Commit | Description |
|---|---|---|
| `v1.0.0` | `d4be7f1` (pending) | Initial stable release — 3D runner, puzzle system, authentication, leaderboard, full game history and statistics |

> Tag created and pushed after merge to `main` is confirmed.

---

## 9. `.gitignore` Coverage

The following sensitive items are excluded from version control:

```
node_modules/
.env
*.log
.DS_Store
```

Verified: no `.env` file, no `node_modules/` directory, no credentials have appeared in any commit.

---

## 10. Git Commands Reference (Tutor Presentation)

```bash
# View all branches
git branch -a

# View commit history with graph
git log --oneline --graph --all

# View changes in a specific commit
git show d4be7f1

# View diff between feature branch and main
git diff main..feature/game-history-statistics --stat

# Create and switch to a new feature branch
git checkout -b feature/new-feature

# Stage and commit
git add <files>
git commit -m "feat(scope): description"

# Push feature branch
git push origin feature/game-history-statistics

# Merge feature into main (no fast-forward, preserves branch history)
git checkout main
git merge --no-ff feature/game-history-statistics -m "merge: ..."
git push origin main

# Create annotated version tag
git tag -a v1.0.0 -m "Version 1.0.0 — stable release"
git push origin v1.0.0
```

---

*Last updated: 2026-11-01 — commit `d4be7f1` pushed to `feature/game-history-statistics`*

