# Test Clausewise with local PostgreSQL

Run both the app and its PostgreSQL database on your computer. No Neon account, hosted database, or Zoho upload is needed for this local workflow.

## Requirements

- Node.js 22.13+ and Git.
- Docker Desktop with its engine running and Docker Compose v2 available. On Windows, use Linux containers.
- The source checkout, not the compiled AppSail upload ZIP.

## First run (Windows PowerShell, macOS or Linux)

Clone the repository if necessary, then open its folder:

```bash
git clone https://github.com/ganesh12456/Clausewise.git
cd Clausewise
npm ci
npm run local:setup
```

Choose a local sign-in password of at least 16 characters. The helper warns that input is visible in the private terminal. It writes a scrypt password hash, a random database password and a random session secret into ignored `.env.local`; it never prints those secrets or stores the plain sign-in password. The local login email is `owner@clausewise.local`.

With Docker Desktop running:

```bash
npm run local:dev
```

This starts PostgreSQL 16, waits for its health check, applies the schema, and starts the development server bound to `127.0.0.1:3000`.

Open **http://localhost:3000/login**. Use `owner@clausewise.local` and the password you chose. Use `localhost` consistently in the browser: `.env.local` sets that exact origin for sign-in and upload requests.

The first Docker start downloads the PostgreSQL image. Later starts reuse it and your existing database volume. Gemini is optional for uploads, policy checks, reviews and commitments; enter a key through Connections when testing AI questions.

## Verify your workspace

1. Open `http://localhost:3000/api/health`; expect `{"status":"ok"}`.
2. Sign in and upload a readable TXT agreement. Refresh and download its original.
3. Create and publish a company standard, run a review and record a decision.
4. Add a commitment and export its calendar reminder.
5. Stop the app with Ctrl+C, stop the database, then start again and verify the agreement remains.

Stop the database:

```bash
npm run db:down
```

Start again on a later day:

```bash
npm run local:dev
```

The database listens on `127.0.0.1:55432` and persists in Docker's `clausewise-local_postgres-data` volume. The stop command keeps that volume. Keep `.env.local` with the volume: its generated database password and session secret must remain stable. Do not run a volume deletion command unless you intend to erase the local workspace.

## Existing settings or existing PostgreSQL

`local:setup` refuses to replace an existing `.env.local`. If you already have one, review it before using the local workflow. The Compose workflow needs `LOCAL_POSTGRES_PASSWORD` and a matching `DATABASE_URL` for `127.0.0.1:55432/clausewise`. Changing `POSTGRES_PASSWORD` does not change the password inside an already initialized PostgreSQL volume.

If you already installed PostgreSQL directly, create a separate local Clausewise database/user through your PostgreSQL administration tool, put its connection URL and the other `.env.example` values into `.env.local`, then use:

```bash
npm run db:migrate:local
npm run dev -- --host 127.0.0.1
```

The local migration command reads `.env.local` and refuses a non-local database hostname, including one inherited from your terminal. The regular hosted migration command still reads hosting environment variables. Tests use a separate embedded/disposable database by default, not your local workspace.

## Common setup problems

- `docker` not found or engine unavailable: install/start Docker Desktop, reopen the terminal, and check `docker compose version`.
- Port `55432` is occupied: stop the other local service or change both the Compose host port and `DATABASE_URL` to the same available port.
- Port `3000` is occupied: stop the other app, or change both the development-server port and `APP_URL` to match.
- Invalid origin: open `http://localhost:3000`, matching `APP_URL`, rather than the IP address.
- Password authentication failed after regenerating settings: the existing volume still has its original database password. Restore the matching `.env.local` or deliberately manage the database credentials; setup does not erase your data.

## Zoho deployment later

This local database serves the app on your computer. Zoho AppSail cannot connect to your computer's `localhost`; a hosted deployment will need a database reachable from Zoho. AppSail disks are not used to persist database files. The local workflow does not change the production storage adapter.
