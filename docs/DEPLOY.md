# Deployment

Production runs on hosted Supabase (database + auth) and Vercel (Next.js).
Steps are in order; the auth settings in step 2 assume a single-user app.

## 1. Create the hosted Supabase project and push the schema

Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) and note its
project ref (Project Settings → General) and database password.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # asks for the database password
npx supabase db push --dry-run                        # lists the migrations it would apply
npx supabase db push
```

- `db push` applies the schema only. Local decks and cards are not copied; re-import them
  in production (this also gives imported decks an exact card order).
- Don't run `supabase config push`: it would copy local-only settings such as
  `site_url = "http://localhost:3000"` to production. Set auth settings in the Dashboard.
- To check that migrations replay cleanly before pushing: `npx supabase db diff --local`
  (builds a shadow database from `supabase/migrations/` and should report no changes).

## 2. Auth settings (Dashboard → Authentication), in this order

1. **Users → Add user → Create new user** with your email and a strong password, and tick
   **Auto Confirm User**. Creating your account here means public sign-up never has to be open.
2. **Sign In / Providers → turn off "Allow new users to sign up".** The login page's
   Sign up button then shows "Sign-ups are closed." Users added from the Dashboard still work.
3. **Sign In / Providers → Email:** minimum password length **8** (matches
   `minimum_password_length` in `supabase/config.toml` and the app's checks). Optionally turn
   on **Secure password change** (adds an email check when the session is older than 24 hours).
4. **Project Settings → Data API:** confirm **Max rows = 1000**. The app reads long lists in
   pages of that size.

## 3. URL configuration (Authentication → URL Configuration)

- **Site URL:** `https://<your-app>.vercel.app`
- **Redirect URLs:**
  - `http://localhost:3000/**`
  - `https://<your-app>.vercel.app/**`
  - `https://<your-app>-*-<your-vercel-team>.vercel.app/**` (only if preview deployments
    should be able to sign in)

## 4. Deploy to Vercel

```bash
npx vercel link                                                     # or import the repo at vercel.com/new
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production              # https://<ref>.supabase.co
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production  # sb_publishable_… (Project Settings → API Keys)
# Repeat both for "preview" if you use preview deployments.
npx vercel --prod
```

- Use the hosted project's values, not the ones in `.env.local`.
- Never add the secret key (`sb_secret_…`), and never put it in a `NEXT_PUBLIC_` variable:
  those are sent to the browser. The app doesn't need it.
- `NEXT_PUBLIC_*` values are built into the JavaScript at build time. After changing one in
  Vercel, redeploy, or the old value stays.

## 5. Smoke test in production

1. Sign in, create a deck, import an export (Quizlet or Anki), search, study a few cards,
   and open the dashboard.
2. Try signing up with a different email: it should say "Sign-ups are closed."
