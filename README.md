# Clausewise — AI Contract Risk and Negotiation Assistant

A private contract review application. This repository contains a working initial release, not the complete production scope in the build plan.

## Implemented
- PDF, DOCX and TXT upload with browser-side text extraction, private original-file storage and persistent records.
- Owner-scoped APIs, optimistic concurrency, document deletion and activity history.
- Draft/published phrase-check playbooks, source excerpts, editable proposed wording and approve/reject decisions.
- Paragraph comparison between documents.
- Confirmed obligations with downloadable calendar reminders.
- Server-side Gemini question answering with source-quote validation when credentials are configured.
- Responsive review workspace and honest empty/error states. No seeded customer or contract data.

## Hosting on Zoho
This version uses standard Next.js on Node.js and PostgreSQL. Follow [the Zoho deployment guide](docs/ZOHO_DEPLOYMENT.md) for Slate settings, database migration and protected variables. The earlier Sites/Cloudflare implementation is preserved on the `sites-runtime` branch.

Contract records, originals and audit events are persisted in PostgreSQL. Sign-in uses a configured owner email, scrypt password hash and signed session cookie. This release supports one owner per deployment.

## Run and build
Use Node 22.13+ and npm. Run `npm ci`, copy `.env.example` to `.env.local` and fill in private settings, then run `npm run dev`. For schema setup, export `DATABASE_URL` in the terminal and run `npm run db:migrate`; the migration script does not load `.env.local` automatically. Production `npm start` validates configuration and applies the migration before starting Next.js. Run `npm run build` to compile without requiring database credentials.

Run `npm test`, `npm run typecheck` and `npm run build`. Storage tests use embedded PostgreSQL (PGlite) locally; set `TEST_DATABASE_URL` to a disposable PostgreSQL database for real database checks. Never point tests at a live workspace. GitHub Actions uses a disposable PostgreSQL 16 service.

## Model connection
Set `GEMINI_API_KEY` and `GEMINI_MODEL` as protected runtime environment variables. No credentials are included in the source or client bundle. Configure suitable provider data handling before uploading confidential documents. AI controls explicitly remain unavailable without the connection.

## Current limits
- Scanned PDFs need external OCR; mixed PDFs show a coverage warning. OCR is not implemented in the hosted application.
- Playbooks use exact phrase matching, not semantic legal risk classification. One rule is created per playbook in the current editor.
- Search is keyword-based; vector search is not yet implemented.
- Comparison is text-based, not a legally validated semantic comparison.
- Calendar exports work; automatic email delivery and scheduling are not connected.
- Review memo export is plain text; Word tracked changes are not implemented.
- No claim of legal accuracy, compliance certification, complete enterprise RBAC, antivirus scanning or production evaluation results.
- Full originals and extracted text are stored privately; database and object backup policies require configuration before business-critical use.

## Links
- Source: https://github.com/ganesh12456/Clausewise
- Hosted app (owner-private): https://clausewise-contract-review.solariris7.chatgpt.site

## Remaining production work
Implement the planned FastAPI/pgvector pipeline with Alembic; bounded OCR jobs; semantic clause extraction; policy version management and multiple-rule editing; embedding retrieval; secure scheduled notification outbox; evaluated obligation extraction; security/load/restore tests; and verify the configured Zoho deployment.
