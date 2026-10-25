# Test the Catalyst backend

The backend now uses Catalyst Data Store and Stratus. PostgreSQL, Docker and the previous local database scripts are no longer required or included.

## Source checks without cloud credentials

With Node.js 22.13+ installed:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

The storage tests inject in-memory implementations of the commit-index and object-storage ports. They verify ownership, Unicode preservation, publication conflicts, rollback, original download, cascaded deletion, cleanup retry, login limits and uncertain network outcomes. The SDK transport tests exercise the installed modular SDK against recorded response shapes. These are isolated tests, not a fake persistence fallback in the application.

`npm run dev` can render the signed-out UI, but authenticated storage calls require Catalyst gateway headers. A plain localhost Next.js server cannot obtain those credentials automatically. Do not enter hosted OAuth credentials or spoof platform headers to make that server look deployed.

## Full application test

Use the existing Catalyst **Development** project and follow [the AppSail setup guide](ZOHO_APPSAIL.md). Activate Stratus, finish creating the protected bucket, deploy the current build and configure the six runtime variables. Test uploads, source downloads, review decisions, commitments and Gemini connection through that service URL.

This route needs no local database or Docker Desktop. Full AppSail/Stratus verification remains pending until the cloud setup is complete.
