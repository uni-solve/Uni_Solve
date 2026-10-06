# UniSolve

**Your Problem. Our Expertise.**

UniSolve is a private academic, technical, project, research and career-support platform for university and college students. Students post a problem with their files, budget and deadline; the UniSolve team responds from the admin dashboard.

## How it works (solo mode)

1. Student posts a problem (one-page form, guest or signed in) → gets a `US-xxxxx` Request ID.
2. Admin accepts the student's budget or sends a quote → split into **50% advance / 50% on delivery**.
3. Student pays the advance by UPI and submits the UTR → admin verifies → request moves to *In progress*.
4. Admin works on it, shares files in the private chat, and marks it *Delivered*.
5. Student pays the balance → admin verifies → student marks it *Complete* (or requests changes) → leaves a review.

Expert-marketplace tables and functions exist in the schema but are dormant (`platform_settings.solo_mode = true`).

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router, static export), TypeScript, Tailwind CSS v4, shadcn/ui |
| Hosting | GitHub Pages (via GitHub Actions) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) — free tier |
| Schema | SQL migrations in `supabase/migrations` |
| Payments | Manual UPI (QR + UTR verification by admin); provider interface ready for Razorpay/Stripe |

Because the site is a static export, all authorization is enforced in the database with Row-Level Security — the frontend never holds privileged keys.

## Testing

```bash
npm run test:db         # 66 RLS + workflow tests against PGlite (no Docker needed)
npm run test:e2e        # guest journey against a local preview (see e2e/student-journey.mjs)
npm run test:e2e:full   # student + admin journey; needs ADMIN_EMAIL / ADMIN_PASSWORD env vars
npm run test:qa         # every public page at phone + desktop: errors, overflow, a11y basics
```

## Database

Migrations live in `supabase/migrations`. To apply them to the linked project:

```bash
npx supabase db push --project-ref <ref>
```

Promote the first admin (SQL editor): `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the static site and publishes it to GitHub Pages.

Repository settings required once:

1. **Settings → Pages → Source:** GitHub Actions
2. **Settings → Secrets and variables → Actions:** add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Project structure

```
src/app            Routes (marketing, auth, dashboards)
src/components     UI primitives (shadcn) and product components
src/lib            Supabase client, data access, validation, utilities
supabase/          Migrations, seed data (development only)
```
