# 🍌 Banana Brain Quest

A full-stack web application combining a **3D endless runner game** (Banana Surfers) with a **live Banana API puzzle quiz**. Built for the CIS046-3 assignment.

---

## 🎮 Features

- **Banana Surfers** — Three.js 3D endless runner with lanes, obstacles, and collectible bananas
- **Banana Crate Puzzles** — Solve live number-sequence puzzles fetched from the University of Bedfordshire Banana API to earn power-ups
- **Power-up System** — Four power-ups: Golden Hoverboard (crash shield), Banana Magnet (auto-collect), Energy Shield (obstacle absorber), Speed Boost (2× score)
- **Three Difficulty Modes** — Easy (60 s puzzle timer), Hard (40 s), Extra Hard (25 s)
- **Game History & Statistics** — Every game saved automatically; dashboard shows all records regardless of length or outcome
- **Global Leaderboard** — Rankings across all modes and per-mode; correct tie-breaking by score → accuracy → date
- **Authentication** — Secure session-based login and registration

---

## 🛠 Technology Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 22, Express 4 |
| Database | MySQL 8 |
| 3D Engine | Three.js |
| Puzzle Source | Banana API (University of Bedfordshire) |
| Session Auth | express-session |
| Environment | dotenv |

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/amogh19skya/BananaApi.git
cd BananaApi/banana-brain-ques
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in `banana-brain-ques/`:

```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASS=your_mysql_password
DB_NAME=banana_brain_quest
SESSION_SECRET=your_secret_key_here
PORT=3000
```

> **Never commit `.env` to version control.** It is listed in `.gitignore`.

### 4. Set up the database

Run the schema and migration scripts in order:

```bash
# Create tables
node scripts/migrateRunner.js

# Extend game_history table and backfill existing records
node scripts/migrateGameHistory.js
```

### 5. Start the server

```bash
node server.js
```

The application runs at **http://localhost:3000**

---

## 📁 Project Structure

```
banana-brain-ques/
├── config/
│   └── db.js                  # MySQL connection pool
├── controllers/
│   ├── authController.js      # Login, register, logout
│   ├── leaderboardController.js # Global & per-mode rankings
│   ├── runnerController.js    # Puzzle fetch, verify, end-run
│   └── scoreController.js     # Dashboard stats, game history
├── middleware/
│   └── authMiddleware.js      # Session authentication guard
├── routes/
│   ├── authRoutes.js
│   ├── leaderboardRoutes.js
│   ├── runnerRoutes.js
│   └── scoreRoutes.js
├── scripts/
│   ├── migrateRunner.js       # Initial DB setup
│   └── migrateGameHistory.js  # Game history schema migration
├── sql/
│   └── schema.sql
├── public/
│   ├── index.html             # 3D runner entry point
│   ├── app.js                 # Quiz game frontend
│   ├── runner/
│   │   ├── index.html
│   │   ├── css/runner.css
│   │   └── js/
│   │       ├── game.js        # Game loop, lifecycle, save-run
│   │       ├── puzzle.js      # Banana Crate puzzle system
│   │       ├── powerups.js    # Power-up definitions & activation
│   │       ├── player.js      # Player movement & collision
│   │       ├── obstacles.js   # Obstacle generation
│   │       └── world.js       # Three.js scene, road, lighting
│   ├── pages/
│   │   ├── dashboard.html     # Player stats & game history
│   │   ├── leaderboard.html   # Global rankings
│   │   ├── login.html
│   │   ├── register.html
│   │   └── quiz.html
│   ├── css/dashboard.css
│   ├── js/
│   │   ├── dashboard.js
│   │   └── leaderboard.js
│   └── images/                # Power-up artwork (.jfif)
├── server.js                  # Express app entry point
├── .env                       # ⚠️ NOT committed — local credentials
├── .gitignore
└── docs/
    └── VERSION_CONTROL_EVIDENCE.md
```

---

## 🌿 Branching Strategy

This project follows **Git Flow** with feature branches:

```
main                          ← stable production branch
└── feature/<name>            ← one branch per feature or fix
```

**Rules:**
1. Never commit directly to `main`
2. Each feature gets its own named branch (e.g. `feature/game-history-statistics`)
3. All branches are pushed to origin before merging
4. Merge only via Pull Request after review
5. Use meaningful commit messages (`feat:`, `fix:`, `docs:`, `refactor:`)

### Feature branches in this project

| Branch | Purpose |
|---|---|
| `feature/auth-system` | Login, register, session authentication |
| `feature/difficulty-modes` | Easy / Hard / Extra Hard timer modes |
| `feature/endless-runner` | Core Three.js 3D runner |
| `feature/runner-puzzle-gameover-and-activate-flow` | Puzzle fail → game over, reward modal |
| `feature/runner-collision-and-slide-mechanics` | AABB collision, slide mechanic |
| `feature/leaderboard-global-rankings` | Global & mode rankings with tie-breaking |
| `feature/runner-powerup-images` | Power-up artwork showcase in reward modal |
| `feature/game-history-statistics` | Record every game; full statistics dashboard |

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new player |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `GET` | `/api/runner/crate-puzzle` | Fetch puzzle image from Banana API |
| `POST` | `/api/runner/verify-crate` | Verify player's answer |
| `POST` | `/api/runner/end-run` | Save completed/failed/abandoned run |
| `GET` | `/api/scores/dashboard-stats` | Player aggregate stats + full history |
| `GET` | `/api/leaderboard` | Global leaderboard (all modes) |
| `GET` | `/api/leaderboard?mode=Easy` | Mode-specific leaderboard |

---

## 🗄 Database Tables

| Table | Purpose |
|---|---|
| `users` | Registered player accounts |
| `game_history` | Every game record (all outcomes) |
| `scores` | Leaderboard scores |
| `runner_runs` | Legacy run records (compatibility) |
| `runner_upgrades` | Upgrade tracking |

---

## 📋 Version History

| Tag | Description |
|---|---|
| `v1.0.0` | Initial stable release — 3D runner, puzzle system, authentication, leaderboard, full game history |

---

## 🎓 Assignment

**CIS046-3** — University of Bedfordshire  
Demonstrates: feature branching, meaningful commits, Pull Requests, code review, safe merging, version tagging.

Version control evidence: [`docs/VERSION_CONTROL_EVIDENCE.md`](docs/VERSION_CONTROL_EVIDENCE.md)
