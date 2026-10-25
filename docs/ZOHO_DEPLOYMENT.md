# Zoho deployment

The active backend is Catalyst Data Store + Stratus, hosted with the Next.js app in AppSail. Follow [the current AppSail guide](ZOHO_APPSAIL.md).

Older instructions involving PostgreSQL, DATABASE_URL, Docker, SQL migrations or a separate Slate frontend no longer apply to `main`. The native SDK needs the Catalyst gateway request context, so this deployment is intended for AppSail in the same project as its Data Store tables and protected Stratus bucket.

This change does not delete an older database or automatically import its data. Earlier implementations remain in Git history. The original Cloudflare/Sites runtime remains on `sites-runtime`.
