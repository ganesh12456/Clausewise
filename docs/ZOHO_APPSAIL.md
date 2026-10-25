# Deploy Clausewise with Catalyst Data Store and Stratus

The `main` branch now runs entirely on Zoho for application hosting and storage. It requires no PostgreSQL connection, Docker Desktop, or local database installation.

## What has been provisioned

Development project: **clausewise**, project ID **54566000000079016**, organization **60077364156**.

| Resource | Configuration | Current provisioning status |
| --- | --- | --- |
| `CWCommits` | Data Store commit index; `commit_key` must be unique | Created, table ID `54566000000077031` |
| `CWLoginSlots` | Data Store login-rate slots; `slot_key` must be unique | Created, table ID `54566000000077390` |
| `clausewise-54566000000079016` | Protected Stratus bucket; encryption on, caching off, versioning off | First console activation required; bucket creation not yet confirmed |

Zoho rejected the initial bucket creation with: **User needs to be in session when accessing Stratus for the first time**. Open the [Ganesh console](https://console.catalyst.zoho.in/baas/60077364156/index), select **clausewise → Cloud Scale → Stratus**, and complete its initial activation. Then create the bucket named above, or complete creation through the connector after activation. Choose protected access, encryption enabled, versioning disabled and caching disabled. Do not upload contracts until this setup is verified.

Tables are accessed only by the backend using Catalyst admin scope. Keep App User table permissions disabled; the application uses its own single-owner sign-in and enforces ownership on the server. No direct browser Data Store or Stratus permissions, public file links, or CORS grants are required.

Schema and provisioning IDs are recorded in [`catalyst-resources.json`](../catalyst-resources.json). For another project or Production, create the same schema and bucket in that environment. This file is a resource manifest, not a CLI-generated `catalyst.json`.

## Download the current build

1. Open [GitHub Actions](https://github.com/ganesh12456/Clausewise/actions) and select the latest successful **Verify Clausewise** run on `main` containing this migration.
2. Download **clausewise-appsail-build** and extract the download once.
3. Upload the inner **clausewise-appsail.zip**. Old build artifacts from before this migration still require PostgreSQL; use the newest native-storage build.

The ZIP includes the Next.js standalone server, modular Catalyst SDK packages, compiled assets, PDF worker and startup script. It does not contain database credentials, environment files, SQL migrations or a PostgreSQL runtime.

## AppSail settings

In **clausewise → Serverless → Compute → AppSail**, create a Catalyst-managed service:

| Setting | Value |
| --- | --- |
| Name | `clausewise` |
| Runtime | Node.js 22 |
| Startup command | `node scripts/start.mjs --standalone` |
| Memory | Start at 512 MB; measure actual use |
| Port | AppSail default; the script reads `X_ZOHO_CATALYST_LISTEN_PORT` |

Configure these protected runtime variables:

| Variable | Value |
| --- | --- |
| `CATALYST_PROJECT_ID` | `54566000000079016` for the existing Development project |
| `CATALYST_STRATUS_BUCKET` | `clausewise-54566000000079016` after bucket creation |
| `APP_URL` | Exact assigned AppSail HTTPS origin, without a path or trailing slash |
| `OWNER_EMAIL` | Your chosen sign-in email |
| `OWNER_PASSWORD_HASH` | Output of the password helper |
| `SESSION_SECRET` | Secret printed by the same helper; keep stable |

Generate the owner settings in a private local terminal, with Node.js installed:

```bash
node scripts/hash-password.mjs
```

The helper requires a password of at least 16 characters. Its input is visible in that private terminal. Keep the password yourself and enter only the generated hash and session secret into Zoho. Never commit these values. The app deliberately refuses to start with missing settings. Obtain the service's assigned endpoint during initial creation, then finish `APP_URL` and restart/redeploy before testing sign-in.

Catalyst injects SDK credentials in gateway request headers. The backend initializes the current request with `@zcatalyst/auth` in admin scope and verifies its project matches `CATALYST_PROJECT_ID`. Do not configure refresh tokens, client secrets, or SDK credentials in the frontend. Serve this build in the same Catalyst project as its storage resources.

Startup binds the server promptly and performs no SQL migration, network initialization or database provisioning. `/api/health` checks Data Store access, required unique constraints and the Stratus bucket.

## CLI upload from GitHub

With Git, GitHub CLI, Node.js and Catalyst CLI installed, run in PowerShell:

```powershell
git clone https://github.com/ganesh12456/Clausewise.git
cd Clausewise
gh auth login
gh run list --repo ganesh12456/Clausewise --branch main --status success --limit 5
```

Use the run ID of the new native-storage build:

```powershell
gh run download RUN_ID --repo ganesh12456/Clausewise --name clausewise-appsail-build --dir .\dist\download
Expand-Archive -Path .\dist\download\clausewise-appsail.zip -DestinationPath .\dist\appsail -Force
catalyst login --dc in
(Resolve-Path .\dist\appsail).Path
catalyst init appsail --dc in
```

Replace `RUN_ID` with the actual number. During initialization choose the existing Ganesh/clausewise project, Catalyst-managed runtime, no sample app, the current repository as source, the absolute `dist/appsail` path as build path and Node.js 22. Let the CLI generate project configuration. Set the generated `app-config.json` command to `node scripts/start.mjs --standalone`, preserving its other fields.

```powershell
catalyst deploy appsail --project 54566000000079016 --org 60077364156 --dc in
```

Set the runtime variables in AppSail Configuration and restart/redeploy. The CLI uploads the extracted build directory. This does not set up automatic deployment for future Git pushes.

## Verify before sharing

1. Open the assigned service URL plus `/api/health`: expect HTTP 200 and `{"status":"ok","storage":"catalyst"}`.
2. Sign in at `/login`. Upload a readable TXT agreement, refresh, and download its original.
3. Create/publish a company standard, review a finding and record a decision.
4. Create a commitment, verify its date and export its calendar reminder.
5. Open Connections and save/test the Gemini API key and model through the frontend.
6. Restart/redeploy and confirm the same agreements, originals, decisions and connection remain.
7. Use a signed-out browser to confirm private API routes return 401.

The general project domain is not an AppSail deployment URL. The earlier Sites preview is a separate runtime and dataset. Runtime AppSail verification and Stratus upload/download remain pending until activation and deployment succeed; a passing local test suite does not establish them.

## Storage limits and cleanup

The workspace remains single-owner. Data Store holds compact commit and rate-limit metadata. Stratus holds UTF-8 review snapshots and original binaries; this avoids Data Store text-field limits and preserves emoji/non-BMP document characters.

Each workspace mutation writes one immutable snapshot and publishes it with a uniquely constrained commit row. Concurrent commits from the same base revision return a conflict instead of overwriting each other. Original uploads are staged before publication. Deletion immediately removes accessible records and linked commitments in the committed snapshot; original-file and superseded-snapshot cleanup is retried on later reads/saves when Stratus is temporarily unavailable.

Review data is capped at 32 MB per workspace snapshot; original uploads remain capped at 20 MB, 100 pages and 1.5 million extracted characters. A mutation rewrites the review snapshot, so this initial release is not intended for large enterprise portfolios. There is no automatic retention scheduler. A process crash or an unconfirmed publication may leave an unreferenced staged object. Check Stratus inventory and committed references before manual orphan cleanup; never blindly delete an owner prefix. Do not enable bucket versioning without a separate version-retention policy.

This migration does not automatically copy or delete data from an older PostgreSQL or Sites workspace. Download originals and export review notes before switching if you have existing data. API keys must be entered again in the new workspace. Preserve the old deployment until the new one is verified.

References: [Modular SDK authentication](https://docs.catalyst.zoho.com/en/sdk/javascript/v1/auth-config/node-consideration/), [Data Store](https://docs.catalyst.zoho.com/en/sdk/javascript/v1/cloudscale/datastore/insert-rows/), [Stratus uploads](https://docs.catalyst.zoho.com/en/sdk/javascript/v1/cloudscale/stratus/upload-object/), [AppSail CLI](https://docs.catalyst.zoho.com/en/cli/v1/deploy-resources/deploy-appsail/).
