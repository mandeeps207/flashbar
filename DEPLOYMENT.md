# FlashBar Deployment

## Supabase

Use the pooled Supabase connection for app runtime queries and the direct
connection for migrations:

```bash
DATABASE_URL="postgresql://postgres.<project-ref>:<database-password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<project-ref>:<database-password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

Run the migrations after adding those values to `.env`:

```bash
npx prisma migrate deploy
```

For local development against Supabase, use:

```bash
npx prisma migrate dev --name add_banner_setting
```

## Shopify

Link this local project to the correct Partner Dashboard app:

```bash
npm run config:link
```

Configure an app proxy with subpath `/apps/flashbar` and point it at the Vercel
deployment. The theme app extension block fetches `/apps/flashbar/settings`.

## Vercel

Add these environment variables in Vercel:

```bash
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SCOPES
SHOPIFY_APP_URL
DATABASE_URL
DIRECT_URL
```

Deploy from Vercel or run:

```bash
vercel deploy --prod
```
