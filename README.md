# Stratonas Guild Leaderboard

A self-hosted, dark-themed gaming leaderboard web app for Stratonas guild raid scores, player profiles, clubs, birthdays, and Blue Archive student media.

**Stack:** Next.js 16 · React 18 · TypeScript 5 · PostgreSQL 16 · Prisma 7 · NextAuth v5 beta · Tailwind CSS 3 · Docker Compose

The application stores its primary data in PostgreSQL and can run entirely on your own machine or server. Some admin import workflows can optionally call external services, such as SchaleDB/wiki sources for student and raid-boss metadata, and Discord/image hosts for proxied images.

## What This App Includes

- Public leaderboard, raid detail, player profile, club profile, community, stats, and birthday views.
- Raid-card PNG/ZIP downloads from raid leaderboard pages, including custom watermarked raid-card creation.
- Admin-only CRUD for players, clubs, raids, raid entries, students, raid bosses, and lookup data.
- XLSX import for raid score submissions, using `exceljs`.
- Database-configurable favorite-student matching and XLSX review tools with PFP previews.
- Local memorial video/poster serving from `Development_data`.
- Prisma migrations, seed/admin scripts, and Docker-based PostgreSQL.
- Security headers, CSP, same-origin write protection, and cache controls.

---

## Choose A Run Mode

Start here. Pick one mode and follow only that section.

| Mode | Best for | App command | Database location |
|------|----------|-------------|-------------------|
| Docker development | Easiest local setup; works on Windows/macOS/Linux | `docker compose up --build` | `./Development_data/docker-postgres` |
| Host app + Docker database | Fast app reloads without installing PostgreSQL locally | `npm run dev:local` | `./Development_data/docker-postgres` |
| Windows native development | Windows with local PostgreSQL installed | `npm run dev:local` | `./Development_data/native-postgres` |
| Docker production | Server/self-hosted deployment | `docker compose -f docker-compose.yml -f docker-compose.production.yml up --build` | `./Production_data/docker-postgres` |

The app runs at **http://localhost:3000** in all local modes.

## Prerequisites

- Node.js 22+ and npm.
- Docker Desktop, if using Docker modes.
- PostgreSQL 16, only if using native development without Docker.
- FFmpeg, only if generating memorial lobby videos/posters.

Install examples:

```powershell
# Windows: install these with winget, Chocolatey, or official installers.
# Make sure node, npm, docker, psql, and ffmpeg are available in PATH.
```

```bash
# macOS
brew install node postgresql@16 ffmpeg
```

## Environment Files

Docker modes use `.env.docker`:

```bash
cp .env.docker.example .env.docker
```

Native local development uses `.env`:

```bash
cp .env.example .env
```

Windows PowerShell equivalent:

```powershell
Copy-Item .env.docker.example .env.docker
Copy-Item .env.example .env
```

Keep this host rule in mind:

- Use `db:5432` inside Docker Compose, for example in `.env.docker`.
- Use `localhost:5432` when running commands from your host machine.

If your password contains URL-reserved characters, encode them in `DATABASE_URL`. For example, `@` becomes `%40`:

```env
POSTGRES_PASSWORD=StratonasAsahi4104@
DATABASE_URL=postgresql://stratonasAsahi:StratonasAsahi4104%40@db:5432/stratonas
```

## Prisma 7 Notes

Prisma is configured through `prisma.config.ts`. The database URL is loaded there from `DATABASE_URL`, so keep the host rule above in mind when running Prisma commands.

The Prisma Client is generated into `src/generated/prisma` and is intentionally not committed. `npm install`, `npm run build`, and Docker builds run `prisma generate` for you.

Database utility scripts that import Prisma Client use `tsx`, not `ts-node`, because the Prisma 7 generated client is ESM-style TypeScript.

## Development

### Option 1: Full Docker Development

This is the simplest setup because Docker runs both Next.js and PostgreSQL.

```bash
docker compose up --build
```

Older Docker Compose installations may need:

```bash
docker-compose up --build
```

On first run, the container waits for PostgreSQL, runs Prisma migrations, then starts the app. Stop it with `Ctrl+C`, or from another terminal:

```bash
docker compose down
```

### Option 2: Host App + Docker Database

Use this when you want the app running directly on your machine but still want PostgreSQL in Docker.

macOS/Linux/Git Bash:

```bash
npm install
cp .env.docker.example .env.docker
npm run db:docker:start
npm run db:migrate
npm run dev:local
```

Windows PowerShell:

```powershell
npm install
Copy-Item .env.docker.example .env.docker
npm run db:docker:start
$env:DATABASE_URL="postgresql://stratonas:stratonas@localhost:5432/stratonas"
npx prisma migrate deploy
npm run dev:local
```

Stop only the Docker database:

```bash
npm run db:docker:stop
```

### Option 3: Windows Native Development

Use this when PostgreSQL 16 is installed on Windows and available in PATH.

```powershell
npm install
Copy-Item .env.example .env
npm run postgres:start
npx prisma migrate deploy
npm run dev:local
```

Stop native PostgreSQL:

```powershell
npm run postgres:stop
```

The `postgres:start` and `postgres:stop` scripts are PowerShell scripts. They create and manage PostgreSQL data in `./Development_data/native-postgres`.

### Option 4: macOS/Linux Native Development

Use this when PostgreSQL 16 is installed locally on macOS/Linux.

```bash
npm install
cp .env.example .env
# Start PostgreSQL using your OS/service manager, then:
npx prisma migrate deploy
npm run dev:local
```

The repo does not currently include macOS/Linux scripts for starting a native PostgreSQL data directory. Use your system PostgreSQL service, or use the Docker database option above.

## Production With Docker

Production uses the same app image with a separate PostgreSQL data folder.

1. Create or update `.env.docker`.

```bash
cp .env.docker.example .env.docker
```

2. Set production values in `.env.docker`.

```env
DATABASE_URL=postgresql://USER:PASSWORD@db:5432/DB_NAME
POSTGRES_USER=USER
POSTGRES_PASSWORD=PASSWORD
POSTGRES_DB=DB_NAME
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=https://your-domain.example
AUTH_TRUST_HOST=true
```

3. Start production.

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up --build
```

Older Docker Compose:

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml up --build
```

4. Stop production.

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml down
```

Do not delete `./Production_data/docker-postgres` unless you intentionally want to erase the production database.

If Docker Hub times out while pulling `postgres:16`, pull through the Google mirror and tag it locally:

```bash
docker pull mirror.gcr.io/library/postgres:16
docker tag mirror.gcr.io/library/postgres:16 postgres:16
```

Changing `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_DB` after PostgreSQL has already initialized does not update existing database roles. For a fresh test database, stop Compose and move or delete the relevant data folder. For a real database, update the role inside PostgreSQL instead.

## Admin Account

Run this after migrations are applied. Then sign in from **Admin Login** in the navbar.

macOS/Linux/Git Bash, when using Docker database:

```bash
npm run admin:create -- --email admin@example.com --password "choose-a-strong-password" --name "Admin"
```

PowerShell, when using Docker database:

```powershell
$env:DATABASE_URL="postgresql://stratonas:stratonas@localhost:5432/stratonas"
npx tsx prisma/create-admin.ts --email admin@example.com --password "choose-a-strong-password" --name "Admin"
```

PowerShell, when using native `.env` local database:

```powershell
$env:DATABASE_URL="postgresql://stratonas:stratonas@localhost:5432/stratonas"
npx tsx prisma/create-admin.ts --email admin@example.com --password "choose-a-strong-password" --name "Admin"
```

If you changed the database username, password, or database name, update `DATABASE_URL` in the command. Use `localhost` because the command runs from your machine, not inside Docker.

## Memorial Lobby Videos And Posters

Raid cards can use optimized local MP4 memorial videos and final-frame poster images. These files are not committed to git.

## Raid Card Downloads

Raid leaderboard pages at `/leaderboard/[id]` include a **Download** action for exporting raid cards.

- **Download all raid cards** exports every displayed card for that raid. Multiple cards download as a ZIP of PNG files.
- **Download selected raid cards** lets users pick one or more displayed players. One selected card downloads as a PNG; multiple selected cards download as a ZIP.
- Exported real raid-card filenames include rank, player name, raid server, boss, and season.
- **Customize raid card** opens a local-only editor with a live preview and a subtle `Stratonas Custom Card` watermark.
- Custom cards can use database-backed player, club, and favorite-student selections, or manual overrides.
- Manual custom fields support uploaded images or URLs, club color input, and x/y/scale controls for club logo, portrait, and background media.

The export flow is browser-side and uses `html-to-image` for PNG capture and `jszip` for multi-card ZIP files.

### Folder Layout

Put original downloaded MP4 files here:

```text
./Development_data/lobbies
```

Generated files go here:

```text
./Development_data/lobbies-optimized   # optimized MP4 files used by the app
./Development_data/lobby-posters       # generated poster images used by the app
```

For Docker runs, `./Development_data` is mounted into the app container as read-only, so the app can serve the optimized videos and posters.

### Generate On Windows PowerShell

```powershell
.\scripts\optimize-memorial-videos.ps1
.\scripts\regenerate-final-frame-posters.ps1
```

Rebuild all existing outputs:

```powershell
.\scripts\optimize-memorial-videos.ps1 -Force
.\scripts\regenerate-final-frame-posters.ps1 -Force
```

### Generate On macOS/Linux

```bash
chmod +x ./scripts/optimize-memorial-videos.sh
chmod +x ./scripts/regenerate-final-frame-posters.sh
./scripts/optimize-memorial-videos.sh
./scripts/regenerate-final-frame-posters.sh
```

Rebuild all existing outputs:

```bash
./scripts/optimize-memorial-videos.sh --force
./scripts/regenerate-final-frame-posters.sh --force
```

### Add One New Student Video

1. Add the new MP4 to `./Development_data/lobbies`.
2. Run the two media scripts for your OS.
3. In the admin panel, run the SchaleDB student import/update so the new student can match the video.

The scripts skip existing optimized videos/posters unless you pass `-Force` on PowerShell or `--force` on macOS/Linux.

### Production Media

Production still reads media from `./Development_data/lobbies-optimized` and `./Development_data/lobby-posters` next to the running app. Generate those folders on the server, or copy them from your development machine.

## Script Compatibility

| Script/command | Windows PowerShell | macOS/Linux shell | Notes |
|----------------|--------------------|-------------------|-------|
| `npm run dev:local` | Yes | Yes | Starts Next.js on `127.0.0.1:3000`. |
| `npm run build` | Yes | Yes | Runs Prisma generate and Next build. |
| `npm run start` | Yes | Yes | Starts a built Next.js app. Docker production is recommended for deployment. |
| `npm run postgres:start` / `postgres:stop` | Yes | No | PowerShell-only native PostgreSQL helpers. |
| `npm run db:docker:start` / `db:docker:stop` | Yes | Yes | Requires Docker Compose. |
| `npm run db:migrate` | Git Bash/WSL only | Yes | Uses shell syntax and `sed`; not native PowerShell. |
| `npm run admin:create` | Git Bash/WSL only | Yes | Use the PowerShell `npx tsx ...` command above on Windows. |
| `scripts/*.ps1` media scripts | Yes | No | PowerShell versions for Windows. |
| `scripts/*.sh` media scripts | Git Bash/WSL possible | Yes | Shell versions for macOS/Linux. |
| `scripts/backup.sh` | Git Bash/WSL only | Yes | Requires Docker Compose to be running. |

## Useful Commands

Install dependencies:

```bash
npm install
```

Run lint:

```bash
npm run lint
```

Build locally:

```bash
npm run build
```

Run the student matcher test:

```bash
npm run test:student-lookup
```

Scrape memorial lobby metadata on macOS/Linux/Git Bash:

```bash
npm run wiki:memorials
```

Scrape memorial lobby metadata on Windows PowerShell:

```powershell
$env:DATABASE_URL="postgresql://stratonas:stratonas@localhost:5432/stratonas"
npx tsx scripts/scrape-memorial-lobbies.ts
```

## Database Backup

The backup script is a shell script. Run it from macOS/Linux/Git Bash while Docker Compose is running:

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

Backups are saved to `./backups/stratonas_YYYY-MM-DD_HH-MM.sql`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string. Use host `db` in `.env.docker`; use `localhost` when running commands from your machine. URL-encode special password characters such as `@` as `%40`. | Docker: `postgresql://stratonas:stratonas@db:5432/stratonas`; local: `postgresql://stratonas:stratonas@localhost:5432/stratonas` |
| `POSTGRES_USER` | DB username | `stratonas` |
| `POSTGRES_PASSWORD` | DB password | `stratonas` |
| `POSTGRES_DB` | Database name | `stratonas` |
| `NEXTAUTH_SECRET` | JWT/session secret. Generate a long random value and keep it stable after deployment. | dev value |
| `NEXTAUTH_URL` | App URL for NextAuth callbacks | `http://localhost:3000` |
| `AUTH_TRUST_HOST` | Allows Auth.js to trust the incoming Docker/proxy host. Keep `true` for this self-hosted Docker setup. | `true` |
| `FREELLMAPI_BASE_URL` | Base URL for the local FreeLLMAPI server. The chat route posts to `/chat/completions` under this URL. Use `http://localhost:3001/v1` when running the app on your host; use `http://host.docker.internal:3001/v1` when the app runs inside Docker and FreeLLMAPI runs on your host. | local: `http://localhost:3001/v1`; Docker: `http://host.docker.internal:3001/v1` |
| `FREELLMAPI_API_KEY` | Server-only FreeLLMAPI unified bearer key used by the Kei chatbot. Do not prefix with `NEXT_PUBLIC_`. | empty |
| `FREELLMAPI_CHAT_MODEL` | FreeLLMAPI model name for Kei. `auto` lets FreeLLMAPI route to an available provider/model. Use a model/router path that supports tool/function calling. | `auto` |
| `BRAVE_SEARCH_API_KEY` | Optional server-only Brave Search API key used by the Kei chatbot for web search/research questions. Do not prefix with `NEXT_PUBLIC_`. | empty |

`NEXTAUTH_SECRET` and `AUTH_TRUST_HOST` are Auth.js/NextAuth v5 settings. This app currently uses credentials login with JWT sessions and role checks stored on the user record.

### Kei Chatbot Provider

Kei uses the FreeLLMAPI OpenAI-compatible chat endpoint. Start your FreeLLMAPI server first, then set these values in `.env` or `.env.docker`:

```env
FREELLMAPI_BASE_URL=http://localhost:3001/v1
FREELLMAPI_API_KEY=freellmapi-your-unified-key
FREELLMAPI_CHAT_MODEL=auto
```

When the Next.js app runs inside Docker and FreeLLMAPI runs on your host machine, use:

```env
FREELLMAPI_BASE_URL=http://host.docker.internal:3001/v1
```

The app sends OpenAI-style tool calls to `FREELLMAPI_BASE_URL/chat/completions`, so keep `FREELLMAPI_CHAT_MODEL` on `auto` or choose a model path that supports tool/function calling.

## Runtime Data Folders

PostgreSQL and media files are stored directly inside this project:

| Folder | Purpose |
|--------|---------|
| `./Development_data/docker-postgres` | PostgreSQL data for Docker development and host app + Docker database mode. |
| `./Development_data/native-postgres` | PostgreSQL data created by the Windows native PostgreSQL helper scripts. |
| `./Development_data/lobbies` | Source memorial lobby MP4 files. |
| `./Development_data/lobbies-optimized` | Optimized MP4 files served by the app. |
| `./Development_data/lobby-posters` | Poster images served by the app. |
| `./Production_data/docker-postgres` | PostgreSQL data for Docker production. |

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
│   ├── RaidCard.tsx
│   ├── RaidCardDownloadModal.tsx
│   ├── LeaderboardTable.tsx
│   ├── RaidDetailModal.tsx
│   ├── PlayerProfile.tsx
│   ├── StatsPage.tsx
│   ├── AdminPanel.tsx
│   ├── LoginModal.tsx
│   └── ui/                  # Micro components
├── generated/
│   └── prisma/              # Generated Prisma 7 client, recreated by prisma generate
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
- `prisma.config.ts` contains Prisma 7 CLI configuration, including schema path, migration path, seed command, and datasource URL loading.
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
| GET | `/api/students` | Public student media and card metadata |
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
