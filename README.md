# Stratonas Guild Leaderboard

A self-hosted, fully local, dark-themed gaming leaderboard web app.

**Stack:** Next.js 14 · PostgreSQL 16 · Prisma · NextAuth v5 · Tailwind CSS · Docker Compose

---

## Quick Start (Docker Development)

### 1. Copy env file
```bash
cp .env.docker.example .env.docker
```
Edit `.env.docker` if you want to change passwords. The defaults work out of the box.

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

## Development (No Docker)

This is the fastest way to work on the app after PostgreSQL is installed on your machine.

### Prerequisites
- Node.js 20+
- PostgreSQL 16 installed locally
- FFmpeg, required for memorial video processing

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

The command above works on macOS, Linux, and Windows. You can also use environment variables if you prefer.

PowerShell:

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="choose-a-strong-password"
$env:ADMIN_NAME="Admin"
npm run admin:create
```

macOS/Linux shell:

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

Raid cards use optimized local MP4 memorial videos and final-frame poster images.

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

## Development (App Without Docker)

If PostgreSQL is not installed locally yet, you can still avoid rebuilding the app container. Run only the database in Docker, then run Next.js directly on your machine:

```bash
npm run db:docker:start
npx prisma migrate deploy
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

Production uses the same app image but stores PostgreSQL data in a separate folder:

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

Stop production with:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml down
```
Or:

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml down
```


Do not delete `Production_data` unless you intentionally want to erase the production database.

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
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://stratonas:stratonas@db:5432/stratonas` |
| `POSTGRES_USER` | DB username | `stratonas` |
| `POSTGRES_PASSWORD` | DB password | `stratonas` |
| `POSTGRES_DB` | Database name | `stratonas` |
| `NEXTAUTH_SECRET` | JWT/session secret — **change in production** | dev value |
| `NEXTAUTH_URL` | App URL for NextAuth callbacks | `http://localhost:3000` |

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
│   ├── layout.tsx           # Root layout with fonts
│   ├── page.tsx             # Main leaderboard (server component)
│   └── api/                 # API routes
│       ├── raids/           # Public raid endpoints
│       ├── players/         # Public player endpoints
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
    └── utils.ts
```

---

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/raids` | All raids |
| GET | `/api/raids/[id]/entries` | Ranked entries for a raid |
| GET | `/api/players` | All players |
| GET | `/api/players/[id]` | Player + raid history |
| GET | `/api/stats` | Aggregated stats |
| GET | `/api/health` | `{ status: "ok" }` |

### Admin (requires ADMIN session)
| Method | Path | Description |
|--------|------|-------------|
| POST/PUT/DELETE | `/api/admin/players` `/api/admin/players/[id]` | Player CRUD |
| POST/PUT/DELETE | `/api/admin/clubs` `/api/admin/clubs/[id]` | Club CRUD |
| POST/PUT/DELETE | `/api/admin/raids` `/api/admin/raids/[id]` | Raid CRUD |
| POST/PUT/DELETE | `/api/admin/entries` `/api/admin/entries/[id]` | Entry CRUD |
| POST | `/api/admin/import/xlsx` | Import Top 50 raid entries from XLSX |
