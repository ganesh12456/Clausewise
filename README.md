# Clausewise — AI Contract Risk and Negotiation Assistant

A private contract review application. This repository contains a working initial release, not the complete production scope in the build plan.

## Implemented
- PDF, DOCX and TXT upload with browser-side text extraction, private original-file storage and persistent records.
- Owner-scoped APIs, optimistic concurrency, document deletion and activity history.
- Draft/published company standards with multiple rules, source excerpts, editable proposed wording and recorded clause decisions.
- Paragraph comparison between documents.
- Confirmed obligations with downloadable calendar reminders.
- Frontend API-key setup with encrypted storage, connection testing, replacement and removal.
- Server-side Gemini question answering with source-quote validation when a key is saved in Settings.
- Responsive review desk, agreement register, evidence workspace and honest empty/error states. No seeded customer or contract data.

## Hosting on Zoho
The active backend uses **Catalyst Data Store + Stratus**, with the complete Next.js app hosted in **AppSail**. PostgreSQL, Docker Desktop and DATABASE_URL are no longer required. Follow [the native Zoho deployment guide](docs/ZOHO_APPSAIL.md).

Data Store holds the commit index and durable login-rate slots. Protected Stratus storage holds original files and immutable UTF-8 review snapshots, including owner-encrypted Gemini credentials. This is a single-owner workspace. Review data is limited to 32 MB per snapshot; large enterprise portfolios remain outside this release.

Development tables have been created. Stratus requires first activation in the signed-in console before bucket creation can finish. The code migration and build do not mean the new AppSail deployment is live. The older Sites runtime remains on `sites-runtime` and has separate data.

## Run and verify
Use Node.js 22.13+ and npm. Run `npm ci`, `npm test`, `npm run typecheck` and `npm run build`. To produce a Linux x64 upload ZIP, use `npm run build:appsail`; GitHub Actions also publishes that artifact.

Tests use injected storage ports and the installed modular Catalyst SDK's transport. They do not need a local database. Full authenticated testing uses the Catalyst Development AppSail environment; a plain `npm run dev` server can render the signed-out interface but lacks Catalyst runtime credentials. See [testing instructions](docs/LOCAL_TESTING.md).

## Model connection
Sign in and open **Settings → Connect Gemini**. Enter your Gemini API key and model ID, then select **Save API key** and **Test connection**. You can replace or remove the saved key from the same screen. API keys do not need to be added to Zoho environment variables.

The server encrypts keys with AES-256-GCM using a key derived from `SESSION_SECRET`, bound to the owner's account. Status responses never return the key. Keep `SESSION_SECRET` stable and private; if it is rotated, enter the API key again. Keys are not stored in browser local storage. Catalyst resource identifiers, application origin and owner sign-in variables still belong in protected hosting settings.

Testing checks model access without sending a contract or making a generation request. The first contract question checks actual generation availability and quota. Review provider data handling before sending confidential documents.

## Current limits
- Scanned PDFs need external OCR; mixed PDFs show a coverage warning. OCR is not implemented in the hosted application.
- Company standards use exact phrase matching, not semantic legal risk classification. Multiple clause rules can be created and edited.
- Search is keyword-based; vector search is not yet implemented.
- Comparison is text-based, not a legally validated semantic comparison.
- Calendar exports work; automatic email delivery and scheduling are not connected.
- Review memo export is plain text; Word tracked changes are not implemented.
- No claim of legal accuracy, compliance certification, complete enterprise RBAC, antivirus scanning or production evaluation results.
- Full originals and extracted text are stored privately; database and object backup policies require configuration before business-critical use.

## Links
- Source: https://github.com/ganesh12456/Clausewise
- Earlier Sites preview (previous interface, owner-private): https://clausewise-contract-review.solariris7.chatgpt.site

## Remaining production work
Implement the planned FastAPI/pgvector pipeline with Alembic; bounded OCR jobs; semantic clause extraction; expanded policy lifecycle management; embedding retrieval; secure scheduled notification outbox; evaluated obligation extraction; security/load/restore tests; and verify the configured Zoho deployment.

## Product design and architecture
See [the storyboard and user flows](docs/PRODUCT_DESIGN.md) for the business journey and responsive design, and [the architecture notes](docs/ARCHITECTURE.md) for frontend ports, application policies, repository boundaries and their verification. The redesign is implemented in the Zoho-compatible `main` branch.
