# Stratonas Guild Leaderboard

A self-hosted, dark-themed gaming leaderboard web app for Stratonas guild raid scores, player profiles, clubs, birthdays, and Blue Archive student media.

**Stack:** Next.js 16 · React 18 · TypeScript 5 · PostgreSQL 16 · Prisma 5 · NextAuth v5 beta · Tailwind CSS 3 · Docker Compose

The application stores its primary data in PostgreSQL and can run entirely on your own machine or server. Some admin import workflows can optionally call external services, such as SchaleDB/wiki sources for student and raid-boss metadata, and Discord/image hosts for proxied images.

## What This App Includes

- Public leaderboard, raid detail, player profile, club profile, community, stats, and birthday views.
- Admin-only CRUD for players, clubs, raids, raid entries, students, raid bosses, and lookup data.
- XLSX import for raid score submissions, using `exceljs`.
- Database-configurable favorite-student matching and XLSX review tools with PFP previews.
- Local memorial video/poster serving from `Development_data`.
- Prisma migrations, seed/admin scripts, and Docker-based PostgreSQL.
- Security headers, CSP, same-origin write protection, and cache controls.

---

## Quick Start (Docker Development)

### 1. Copy env file
```bash
cp .env.docker.example .env.docker
```
Edit `.env.docker` if you want to change passwords. The defaults work out of the box.

If your database password contains URL-reserved characters, encode them in `DATABASE_URL`.
For example, `@` becomes `%40`:

```env
POSTGRES_USER=stratonasAsahi
POSTGRES_PASSWORD=StratonasAsahi4104@
POSTGRES_DB=stratonas
DATABASE_URL=postgresql://stratonasAsahi:StratonasAsahi4104%40@db:5432/stratonas
```

### 2. Build and start development
```bash
docker compose up --build
```
If your Docker install uses the older command style, run:

```bash
docker-compose up --build
```

On first run the app will:
1. Run Prisma migrations
2. Start with an empty database

The app will be available at **http://localhost:3000**

Development PostgreSQL data is stored in:

```text
./Development_data/docker-postgres
```

The Docker app container mounts `./Development_data` at `/app/Development_data` read-only so the admin student import and memorial video routes can see `lobbies`, `lobbies-optimized`, and `lobby-posters`.

## Development (No Docker)

This is the fastest way to work on the app after PostgreSQL is installed on your machine.

### Prerequisites
- Node.js 20+
- PostgreSQL 16 installed locally
- FFmpeg, required for memorial video processing
- npm, which is used by the checked-in `package-lock.json`

On macOS:

```bash
brew install node postgresql@16 ffmpeg
```

The media scripts have macOS/Linux shell versions and Windows PowerShell versions.

### Setup
```bash
# Install dependencies
npm install

# Set up your local .env if it does not exist yet
cp .env.example .env

# Start local PostgreSQL inside ./Development_data/native-postgres
npm run postgres:start

# Run migrations
npx prisma migrate deploy

# Start dev server
npm run dev:local
```

App runs at http://localhost:3000

### Create an Admin User

After migrations are applied, create an admin explicitly:

```bash
npm run admin:create -- --email admin@example.com --password choose-a-strong-password --name Admin
```

For Docker-based local runs on macOS/Linux, this command loads `.env.docker` automatically and rewrites the database host from `db` to `localhost`, because it is executed from your machine rather than from inside the Docker network.

On Windows PowerShell, set the host database URL explicitly first:

```powershell
$env:DATABASE_URL="postgresql://stratonas:stratonas@localhost:5432/stratonas"
npx ts-node --project tsconfig.seed.json prisma/create-admin.ts --email admin@example.com --password "choose-a-strong-password" --name "Admin"
```

If you changed `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_DB` in `.env.docker`, update the PowerShell `DATABASE_URL` to match. Keep the host as `localhost` when running the command from Windows.

If you are running with a native local PostgreSQL setup and a `.env` file instead, use Prisma/ts-node directly with your shell environment loaded, or set `DATABASE_URL` before running the command.

On macOS/Linux, you can also use environment variables if you prefer:

```bash
ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="choose-a-strong-password" ADMIN_NAME="Admin" npm run admin:create
```

Then use those credentials from **Admin Login** in the navbar.

Local no-Docker PostgreSQL data is stored in:

```text
./Development_data/native-postgres
```

Stop local PostgreSQL with:

```bash
npm run postgres:stop
```

## Memorial Videos

Raid cards can use optimized local MP4 memorial videos and final-frame poster images. These media files are not committed to git.

### Folder Layout

Put original downloaded MP4 files here:

```text
./Development_data/lobbies
```

The scripts generate:

```text
./Development_data/lobbies-optimized   # optimized MP4 files used by the app
./Development_data/lobby-posters       # final-frame JPG posters used by the app
```

`Development_data` is ignored by git, so these files must be copied or mounted on the production server.

### Generate Media On macOS/Linux

From the project root:

```bash
chmod +x ./scripts/optimize-memorial-videos.sh
chmod +x ./scripts/regenerate-final-frame-posters.sh

./scripts/optimize-memorial-videos.sh
./scripts/regenerate-final-frame-posters.sh
```

The optimizer skips existing optimized videos by default. The final-frame poster script skips existing `.jpg` posters by default. To rebuild everything:

```bash
./scripts/optimize-memorial-videos.sh --force
./scripts/regenerate-final-frame-posters.sh --force
```

On Windows, use the PowerShell versions:

```powershell
.\scripts\optimize-memorial-videos.ps1
.\scripts\regenerate-final-frame-posters.ps1
```

### Add One New Student Video

1. Add the new MP4 to `./Development_data/lobbies`.
2. Run:

```bash
./scripts/optimize-memorial-videos.sh
./scripts/regenerate-final-frame-posters.sh
```

Only missing optimized videos/posters are generated.

3. In the admin panel, run the SchaleDB student import/update so the new student is matched to the video.

### Production Media Setup

For production, make sure these folders exist next to the running app:

```text
./Development_data/lobbies-optimized
./Development_data/lobby-posters
```

The API routes `/api/memorial-video` and `/api/memorial-poster` read those folders from disk. On a macOS host, the simplest setup is to run the same shell scripts on the server or copy the generated folders from your development machine.
When running with Docker Compose, `./Development_data` is mounted into the app container read-only.

## Development (App Without Docker)

If PostgreSQL is not installed locally yet, you can still avoid rebuilding the app container. Run only the database in Docker, then run Next.js directly on your machine:

```bash
npm run db:docker:start
npm run db:migrate
npm run dev:local
```

App runs at http://localhost:3000

In this mode, PostgreSQL data is stored in:

```text
./Development_data/docker-postgres
```

Stop the Docker database with:

```bash
npm run db:docker:stop
```

---

## Production (Docker)

Production uses the same app image but stores PostgreSQL data in a separate folder. The Docker image is built with Next.js `output: "standalone"` and the container runs `prisma migrate deploy` before starting the Next.js server.

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up --build
```
Or with the older Docker Compose command:

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml up --build
```


Production PostgreSQL data is stored in:

```text
./Production_data/docker-postgres
```

The production compose command still reads `.env.docker`. Keep `DATABASE_URL` pointed at the Docker service host:

```env
DATABASE_URL=postgresql://USER:PASSWORD@db:5432/DB_NAME
```

When running helper commands from macOS/Linux, use the npm scripts such as `npm run db:migrate` and `npm run admin:create`; they load `.env.docker` and switch `db:5432` to `localhost:5432` for host access. On Windows PowerShell, set `DATABASE_URL` with `localhost:5432` explicitly before running Prisma or ts-node helper commands.

If Docker Hub times out while pulling `postgres:16`, pull through the Google mirror and tag it locally:

```bash
docker pull mirror.gcr.io/library/postgres:16
docker tag mirror.gcr.io/library/postgres:16 postgres:16
```

Stop production with:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml down
```
Or:

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml down
```


Do not delete `Production_data` unless you intentionally want to erase the production database.

Changing `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_DB` after the database has already been initialized does not update the existing database roles. To change credentials for an existing database, update the role inside PostgreSQL. For a fresh local/prod test database, stop Compose and move or delete `Production_data/docker-postgres`, then start again.

---

## Database Backup

```bash
# Make backup script executable (first time only)
chmod +x scripts/backup.sh

# Run backup (requires docker compose to be running)
./scripts/backup.sh
```

Backups are saved to `./backups/stratonas_YYYY-MM-DD_HH-MM.sql`

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string. Use host `db` in `.env.docker`; use `localhost` in `.env` when running commands from your machine. Some host-run npm scripts convert `db:5432` to `localhost:5432`. URL-encode special password characters such as `@` as `%40`. | Docker: `postgresql://stratonas:stratonas@db:5432/stratonas`; local: `postgresql://stratonas:stratonas@localhost:5432/stratonas` |
| `POSTGRES_USER` | DB username | `stratonas` |
| `POSTGRES_PASSWORD` | DB password | `stratonas` |
| `POSTGRES_DB` | Database name | `stratonas` |
| `NEXTAUTH_SECRET` | JWT/session secret. Generate one with `openssl rand -base64 32` and keep it stable after deployment. | dev value |
| `NEXTAUTH_URL` | App URL for NextAuth callbacks | `http://localhost:3000` |
| `AUTH_TRUST_HOST` | Allows Auth.js to trust the incoming Docker/proxy host. Keep `true` for this self-hosted Docker setup. | `true` |
`NEXTAUTH_SECRET` and `AUTH_TRUST_HOST` are Auth.js/NextAuth v5 settings. This app currently uses credentials login with JWT sessions and role checks stored on the user record.

## Local Data Folders

PostgreSQL files are stored directly inside this project:

| Mode | Command | Data folder |
|------|---------|-------------|
| No-Docker development | `npm run postgres:start` | `./Development_data/native-postgres` |
| App without Docker | `npm run db:docker:start` and `npm run dev:local` | `./Development_data/docker-postgres` |
| Full Docker development | `docker compose up --build` | `./Development_data/docker-postgres` |
| Docker production | `docker compose -f docker-compose.yml -f docker-compose.production.yml up --build` | `./Production_data/docker-postgres` |

---

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Design tokens (CSS variables)
│   ├── layout.tsx           # Root layout and NextAuth session provider
│   ├── page.tsx             # Main leaderboard (server component)
│   ├── players/[id]/        # Public player profile page
│   ├── clubs/[id]/          # Public club profile page
│   ├── leaderboard/[id]/    # Raid leaderboard page
│   └── api/                 # API routes
│       ├── raids/           # Public raid endpoints
│       ├── players/         # Public player endpoints
│       ├── clubs/           # Public club endpoints
│       ├── birthdays/       # Birthday widgets/data
│       ├── community/       # Community hub data
│       ├── memorial-*       # Local media routes
│       ├── stats/           # Aggregated stats
│       ├── health/          # Health check
│       └── admin/           # Admin CRUD (session-guarded)
├── components/
│   ├── LeaderboardApp.tsx   # Root client shell
│   ├── Navbar.tsx
│   ├── RaidBlock.tsx
│   ├── RaidBanner.tsx
│   ├── LeaderboardTable.tsx
│   ├── RaidDetailModal.tsx
│   ├── PlayerProfile.tsx
│   ├── StatsPage.tsx
│   ├── AdminPanel.tsx
│   ├── LoginModal.tsx
│   └── ui/                  # Micro components
└── lib/
    ├── prisma.ts
    ├── auth.ts
    ├── auth-guard.ts
    ├── public-data.ts       # Cached public Prisma queries
    ├── cache.ts             # Cache-control and tag invalidation helpers
    ├── xlsx-raid-import.ts  # XLSX score import pipeline
    ├── student-import.ts    # Student import/update logic
    └── utils.ts
```

Other important folders:

- `prisma/` contains the Prisma schema, migrations, seed script, and admin creation script.
- `scripts/` contains local PostgreSQL helpers, media-processing scripts, backup script, and memorial scraping utilities.
- `Development_data/` and `Production_data/` are local runtime data folders and are intentionally not committed.

---

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/raids` | All raids |
| GET | `/api/raids/[id]/entries` | Ranked entries for a raid |
| GET | `/api/raid-bosses` | Public raid boss list |
| GET | `/api/players` | Public player list |
| GET | `/api/players/[id]` | Player + raid history |
| GET | `/api/clubs` | Club summaries |
| GET | `/api/clubs/[id]` | Club roster and stats |
| GET | `/api/community` | Community hub data |
| GET | `/api/stats` | Aggregated stats |
| GET | `/api/birthdays/today` | Students with birthdays today |
| GET | `/api/birthdays/upcoming` | Upcoming student birthdays |
| POST | `/api/birthdays/accent` | Birthday accent/theme data |
| GET | `/api/memorial-video` | Streams local memorial MP4 files |
| GET | `/api/memorial-poster` | Serves local memorial poster images |
| GET | `/api/image-proxy` | HTTPS image proxy with an allowlist |
| GET | `/api/health` | `{ status: "ok" }` |

### Admin (requires ADMIN session)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/admin/players` `/api/admin/players/[id]` | Player CRUD |
| GET/POST/PUT/DELETE | `/api/admin/clubs` `/api/admin/clubs/[id]` | Club CRUD |
| GET/POST/PUT/DELETE | `/api/admin/raids` `/api/admin/raids/[id]` | Raid CRUD |
| GET/POST/PUT/DELETE | `/api/admin/raid-bosses` `/api/admin/raid-bosses/[id]` | Raid boss CRUD |
| GET/POST/PUT/DELETE | `/api/admin/entries` `/api/admin/entries/[id]` | Entry CRUD |
| GET/POST/PUT/DELETE | `/api/admin/students` `/api/admin/students/[id]` | Student management |
| GET | `/api/admin/raid-lookups` | Raid type/server/terrain lookup data |
| POST | `/api/admin/import/xlsx` | Import Top 50 raid entries from XLSX |
| GET | `/api/admin/import/xlsx/status` | XLSX import progress |
| GET/POST | `/api/admin/import/xlsx/review` `/api/admin/import/xlsx/review/[id]/resolve` | Review and resolve uncertain favorite-student matches |
| GET/POST/PUT/DELETE | `/api/admin/student-match-rules` `/api/admin/student-match-rules/[id]` | Manage favorite-student aliases and matching rules |
| POST | `/api/admin/students/import` | Import/update students |
| GET | `/api/admin/students/import/status` | Student import progress |
| POST | `/api/admin/raid-bosses/import` | Import/update raid bosses |
| GET | `/api/admin/raid-bosses/import/status` | Raid boss import progress |

### XLSX Import Filenames

Raid XLSX imports must include raid type, season, boss, and terrain in the filename:

```text
Total Assault S74_ Gregorius Indoor.xlsx
```

Valid terrain suffixes are `Urban`, `Indoor`, and `Outdoor`. Finder/browser suffixes after the terrain, such as `(copy)`, are accepted.
Boss names are matched against the Bosses table case-insensitively, with punctuation and spacing ignored. For example, `ShiroKuro` in a filename matches `Shiro & Kuro` in the Bosses table. Manual aliases are also supported, such as `Kaiten` matching `KAITEN FX Mk.0`.

The importer supports Global-style sheets with `Guests` and `Members` tabs and required columns such as `UserId`, `Username`, `IGN`, `Score`, `Club`, `Rank`, and `FavoriteStudent`. It also supports a JP-style reduced column set with `IGN`, `Score`, `Club`, `Rank`, and `FavoriteStudent`.
