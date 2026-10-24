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

## Runtime
The immediately hostable version uses Next.js-compatible Vinext on Sites, D1 for records, R2 for originals, and platform-managed private authentication. It does NOT currently use PostgreSQL/pgvector or Supabase. The planned Python/PostgreSQL Zoho deployment remains a separate implementation milestone. Do not deploy this Worker build unchanged to Zoho Slate/AppSail.

## Run and build
Use Node 22.13+ and pnpm. Run `pnpm install --frozen-lockfile`, `pnpm db:generate` only after schema changes, then `pnpm build`. The Sites hosting workflow applies the committed D1 migration. For local development see the starter runtime scripts; private API requests require authenticated platform identity. Never expose the Worker directly with spoofable identity headers.

Run `node --experimental-strip-types tests/engine.test.ts` for rule and comparison regression checks and `pnpm exec tsc --noEmit` for TypeScript validation.

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
Implement FastAPI/PostgreSQL/pgvector with Alembic; bounded OCR jobs; semantic clause extraction; policy version management and multiple-rule editing; embedding retrieval; secure scheduled notification outbox; evaluated obligation extraction; security/load/restore tests; and verified Zoho deployment.
