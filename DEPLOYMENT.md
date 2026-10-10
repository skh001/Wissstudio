# Deploying WissNails Studio (Vercel + Supabase)

Verified locally before writing this guide: `npm install`, `npm run lint` (0 warnings), `npm run typecheck`, `npm run build` (27 routes, builds with no environment variables), production server smoke test (auth redirects, security headers, cron/webhook guards). `npm audit --omit=dev`: 0 vulnerabilities.

---

## 1. Environment variables

Add these in **Vercel → Project → Settings → Environment Variables** (scope: Production, and Preview if you use preview deployments). The template with every variable is [.env.example](.env.example). Never commit real values: `.env*` is git-ignored.

| Variable | Required | Exposed to browser | Purpose | Where to find it / example |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Yes (public by design) | Supabase project URL for every query, auth and storage | Supabase → Project Settings → API → Project URL · `https://tzpawsazrzlljsrkhqph.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Yes (public by design, protected by RLS) | Browser + server client; every read/write runs under RLS as the signed-in user | Supabase → API → `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **No — server only** | Bypasses RLS for code with no user session: Calendly webhook, Google push webhook, cron, OAuth token storage. Without it Google Calendar and Calendly cannot work | Supabase → API → `service_role` / secret key. Starts with `eyJ…` (legacy JWT) or `sb_secret_…`. 40+ characters |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Yes | Public URL, no trailing slash: Google OAuth redirect, password-reset and signup emails, Calendly webhook URL. If missing, the app falls back to the Vercel production domain | `https://wissnails.vercel.app` or your custom domain |
| `CRON_SECRET` | **Yes** (for the scheduled sync) | No | Vercel Cron sends it as `Authorization: Bearer …` to `/api/cron/google-sync`; any other caller gets 401 | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | Optional (Google Calendar) | No | OAuth client | Google Cloud → Credentials → OAuth client ID (Web application) |
| `GOOGLE_CLIENT_SECRET` | Optional (Google Calendar) | No | OAuth client secret | Same OAuth client |
| `GOOGLE_PLACES_API_KEY` | Optional (Reviews import) | No | "Import from Google" on the Reviews page | Google Cloud → Places API (New) → API key |
| `NEXT_PUBLIC_CALENDLY_URL` | Optional | Yes | Booking page embedded on `/booking` | Default `https://calendly.com/wissnails00/wissnails` |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | Optional | No | Only for a webhook created by hand in Calendly. The app normally creates its own webhook and signing key | Leave empty |
| `NEXT_PUBLIC_ALLOW_SIGNUP` | Optional | Yes | `false` closes "Create your studio" once your account exists | `true` for the first deploy, then `false` |
| `NEXT_PUBLIC_SALON_TIMEZONE` | Optional | Yes | Timezone used to save appointment times (Vercel servers run in UTC) | Default `Europe/Paris` |

`NEXT_PUBLIC_*` values are baked in at build time: **redeploy after changing them**.

---

## 2. Supabase (production project)

1. **Migrations**: from the project folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref tzpawsazrzlljsrkhqph
   npx supabase db push
   ```
   This applies every file in `supabase/migrations/` that isn't applied yet, including:
   - `20261010000000_pdf_receipts.sql`: allows PDF receipts / supplier invoices in the `media` bucket;
   - `20261011000000_harden_functions.sql`: stops anonymous visitors from calling the `SECURITY DEFINER` helpers (`bootstrap_owner`, `seed_demo_data`).
   `seed.sql` (demo login) is **not** pushed to production.
2. **Authentication → URL Configuration**:
   - Site URL: `https://YOUR-DOMAIN`
   - Redirect URLs: add `https://YOUR-DOMAIN/auth/callback` (keep `http://localhost:3000/auth/callback` for local development).
3. **Authentication → Providers → Email**: enabled. If "Confirm email" is on, new accounts confirm by email (handled by `/auth/callback`).
4. **Storage**: bucket `media` exists (public read, uploads limited to `<user id>/…` by policy). Nothing to do after `db push`.
5. **API keys**: copy the `anon` and `service_role` keys into Vercel. The service role key must never appear in client code: it is only read in files marked `server-only`.

---

## 3. GitHub

The repository is initialised with a first commit (see below). To publish it:

1. On github.com → **New repository** → name `wissnails-studio` → **Private** → do not add a README or .gitignore.
2. In the project folder:
   ```bash
   git remote add origin https://github.com/YOUR-USER/wissnails-studio.git
   git push -u origin main
   ```
3. For later changes:
   ```bash
   git add .
   git commit -m "Production"
   git push
   ```
   `.env`, `.env.local`, `node_modules`, `.next` and `supabase/.temp` are ignored; check with `git status` before committing.

---

## 4. Vercel

1. vercel.com → **Add New… → Project** → import the GitHub repository.
2. **Framework Preset**: Next.js (detected; also set in `vercel.json`).
3. **Root Directory**: `./` (the repository root).
4. **Build Command**: default (`next build`, i.e. `npm run build`).
5. **Output Directory**: default (leave empty; Next.js on Vercel manages `.next`).
6. **Install Command**: default (`npm install`; `.npmrc` sets `legacy-peer-deps=true`, which React 19 peers need).
7. **Node.js version** (Settings → General): 20.x or 22.x.
8. **Environment Variables**: add every required variable from section 1 (and the optional ones you use).
9. **Deploy**.
10. When the deployment is live:
    - set `NEXT_PUBLIC_SITE_URL` to the final domain if it changed, then **Redeploy**;
    - update the Supabase Site URL / Redirect URLs (section 2) and the Google redirect URI (section 5) to the same domain.

### Cron
`vercel.json` runs `/api/cron/google-sync` once a day (06:00 UTC): Google safety-net sync, renewal of Google push notifications (they expire after ~7 days) and Calendly polling. **The Hobby plan only allows daily crons**; a more frequent schedule makes the deployment fail. On **Pro** you can change the schedule to `*/15 * * * *` for a 15-minute Calendly/Google safety net. Day-to-day sync does not depend on the cron: Google push notifications, the Calendly webhook and the **Sync** buttons are instant.

### Function limits
Routes and pages that call Google or Calendly (`/settings`, `/booking`, `/calendar`, the Google OAuth callback, the cron) declare `maxDuration = 60` seconds, which every plan allows.

---

## 5. Integrations (after the first deploy)

**Google Calendar**
1. Google Cloud Console → enable **Google Calendar API**.
2. OAuth consent screen → External → add your Google address as a test user (or publish the app).
3. Credentials → OAuth client ID → Web application → Authorized redirect URI: `https://YOUR-DOMAIN/api/integrations/google/callback`.
4. Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Vercel → Redeploy.
5. App → Settings → Integrations → **Connect Google Calendar**.

**Calendly**
1. Calendly → Integrations → API & Webhooks → **Personal access token**.
2. App → Settings → Integrations → paste it → **Connect Calendly**. Existing bookings are imported. On HTTPS with a paid Calendly plan, a signed webhook is created automatically (instant sync). Otherwise bookings arrive through the Booking page, the **Sync now** button and the daily cron.
3. Calendly → Calendar sync → connect the **same Google Calendar** with "check for conflicts", so studio appointments block Calendly slots. Calendly events are never copied to Google by the app (no duplicates).
4. Name Calendly event types like your services so prices and durations match.

---

## 6. Production test checklist

Run through this on the live URL after each first deploy.

**Authentication**
- [ ] `/` redirects to `/login` when signed out; `/dashboard` redirects to `/login?next=/dashboard`
- [ ] Sign up (first account) → studio created with 10 services and 13 stock categories
- [ ] Sign in with "Keep me signed in" → still signed in after closing the browser
- [ ] Sign in without it → signed out after closing the browser
- [ ] Sign out → back to `/login`; reopening `/dashboard` redirects to `/login`
- [ ] Forgot password → email arrives → link opens `/reset-password` → new password works
- [ ] Set `NEXT_PUBLIC_ALLOW_SIGNUP=false` → redeploy → signup refused

**Dashboard**
- [ ] KPIs (today, week, month, year, profit, expenses, average basket, returning %) match the data
- [ ] 12-month revenue and profit charts show real months; upcoming appointments and low-stock alerts listed
- [ ] Quick actions open the appointment, client, expense and stock dialogs

**Clients**
- [ ] Create (with photo), edit, delete
- [ ] Search; filters Favourites / VIP / Inactive / Birthdays; sorting
- [ ] Favourite and VIP toggles persist after reload
- [ ] Import CSV, export CSV (opens in Excel with accents)
- [ ] Profile: history, gallery, invoices, loyalty, statistics, "Book" button

**Appointments & Calendar**
- [ ] Create with nail art / strass / discount: live total equals saved total
- [ ] Edit, duplicate, confirm, cancel, delete
- [ ] Complete → stock deducted, loyalty points added, invoice created
- [ ] Record payment later (card, cash, gift card → card balance reduced)
- [ ] Calendar: drag & drop and resize persist after reload; click a slot to book
- [ ] Tabs (upcoming, today, pending, past, cancelled), search, CSV export

**Services**
- [ ] Create, edit, hide, reorder, delete
- [ ] Price shown in the appointment form and used for new bookings
- [ ] Consumption rules (per service and per nail-art add-on) deduct stock on completion

**Stock**
- [ ] Create product (with photo), edit, delete
- [ ] Update stock: add / remove / set; restock adds an expense
- [ ] Low-stock alert (red card, dashboard, notifications); movement history

**Finance**
- [ ] Revenue, expenses, profit, charts per week / month / year
- [ ] Add / edit / delete expense with **photo and PDF receipt**
- [ ] Invoices list → invoice page → A4 and 80 mm receipt print
- [ ] Gift cards: create, disable

**Gallery & uploads**
- [ ] Before/after upload (phone photo is resized), categories, edit, delete (file removed from storage)
- [ ] Client avatar, product photo, salon logo, expense receipt (image and PDF) all display after reload

**Reports**
- [ ] Day / week / month / year; PDF, Excel and CSV download with real figures

**Reviews**
- [ ] Add, edit, delete; "Import from Google" (if Places key + Place ID set)

**Settings**
- [ ] Salon, opening hours (calendar business hours follow), prices & taxes, technicians, theme
- [ ] Backup JSON download

**Google Calendar**
- [ ] Connect → returns to Settings with "Google Calendar connected"
- [ ] New appointment → event in Google; move → moved in Google; cancel/delete → removed from Google
- [ ] Move or delete the event in Google → studio updated (instantly, or with "Sync Google")

**Calendly**
- [ ] Connect with the token → "Calendly connected" (+ imported bookings)
- [ ] Book on `/booking` → appointment "Confirmed" appears right away, client created/found by email
- [ ] Book on calendly.com → appears via webhook (paid plan) or "Sync now"
- [ ] Cancel on Calendly → cancelled in the studio; cancel in the studio → cancelled on Calendly
- [ ] Same booking received twice → still one appointment

**Cron**
- [ ] Vercel → Settings → Cron Jobs shows `/api/cron/google-sync`; "Run" returns `{"synced": …}`
- [ ] `curl https://YOUR-DOMAIN/api/cron/google-sync` without the secret returns 401

**PWA**
- [ ] "Install app" works on phone; offline shows the offline page

---

## 7. Security notes

- Every table has RLS (`owner_id = auth.uid()`); OAuth tokens in `integrations` are not readable by the browser (column grants).
- The service role key is only used in `server-only` modules (webhooks, cron, integrations).
- Webhooks are verified: Calendly by HMAC signature (per-account key), Google by channel id; the cron by `CRON_SECRET`.
- Storage: uploads are restricted to the user's own folder. The bucket is **public-read**: anyone holding a file's URL (random UUID) can open it. Don't upload documents more sensitive than salon photos and receipts.
- Security headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. HSTS is added by Vercel.
- Signing out clears the offline page cache of the service worker.
- Remaining `npm audit` findings are in dev-only build tooling (`braces`, `postcss-selector-parser` via Tailwind 3); nothing in the shipped app.
