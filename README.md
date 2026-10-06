# UniSolve

**Your Problem. Our Expertise.**

UniSolve is a private academic, technical, project, research and career-support platform for university and college students. Students post a problem; UniSolve routes it to a verified expert who provides legitimate guidance, tutoring, debugging, mentorship and preparation.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router, static export), TypeScript, Tailwind CSS v4, shadcn/ui |
| Hosting | GitHub Pages (via GitHub Actions) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) — free tier |
| Schema | SQL migrations in `supabase/migrations` |
| Payments | Manual UPI (QR + UTR verification by admin); provider interface ready for Razorpay/Stripe |

Because the site is a static export, all authorization is enforced in the database with Row-Level Security — the frontend never holds privileged keys.

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
