# Leviosai CRM — Project Memory

## What This Is
A production CRM app (Catalyst v2) originally built as a Claude Artifact, now running as a standalone Vite + Express + TypeScript fullstack app. Selling into the market as a lead management / outreach automation platform.

## Owner
- **Company:** Leviosai
- **Contact:** Christian — christian@leviosai.io
- **GitHub:** LeviosaiCOO/Leviosai

## Stack
- **Frontend:** React (Vite), JSX, served via Express middleware (dev) or static `client/dist` (prod)
- **Backend:** Express + TypeScript, run with `tsx watch server.ts`
- **Database:** PostgreSQL via Supabase, Drizzle ORM
- **Auth:** JWT (jsonwebtoken + bcryptjs), tokens stored in localStorage as `catalyst_token`
- **Deployment:** Railway via Nixpacks builder
- **Dev port:** 3000

## Running Locally
```bash
npm run dev        # starts tsx watch server.ts on port 3000
```
launch.json points to `npm run dev` on port 3000 — use `preview_start` tool with name `"dev"`.

## Environment Variables (.env)
All secrets are stored in `.env` (gitignored) and Railway environment variables.
Required keys: `DATABASE_URL`, `PORT`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`, `SENTRY_DSN`

## Database — Supabase
- **Host:** Supabase connection pooler (port 6543, NOT the direct host)
- **User:** dotted username format — must use `new URL()` parse in db.ts, not raw pg connection string
- db.ts uses explicit host/user/password/port fields to avoid pg stripping the dotted username
- All credentials in `.env` and Railway env vars

## Railway Deployment
- Builder: Nixpacks (NOT Dockerfile)
- Start command: `npx tsx server.ts`
- Health check: `/api/health`
- Deploy: `railway up` from project root
- Set env vars: `railway vars set "KEY=value"`
- Login expires often — may need `railway login` before commands

## Key Files
| File | Purpose |
|------|---------|
| `server.ts` | Entry point, mounts all routes, Vite middleware, Sentry init |
| `lib/db.ts` | pg Pool with URL parsing fix |
| `lib/schema.ts` | Drizzle schema (users, organizations, leads, etc.) |
| `lib/storage.ts` | All DB query functions (org-scoped) |
| `lib/twilio.ts` | SMS + voice, graceful degradation |
| `lib/resend.ts` | Email via Resend, graceful degradation |
| `lib/ai.ts` | Claude AI — lead scoring, message gen, objection handling |
| `lib/stripe.ts` | Stripe billing — checkout, portal, webhook handling |
| `lib/rate-limit.ts` | Rate limiters (auth, API, AI, messaging) |
| `lib/sentry.ts` | Sentry error monitoring init |
| `routes/auth.ts` | POST /api/auth/register, /login, GET /api/auth/me + `requireAuth` middleware |
| `routes/billing.ts` | Stripe checkout, portal, billing status, webhook |
| `routes/webhooks.ts` | Twilio inbound SMS + call status webhooks |
| `routes/messaging.ts` | SMS, email, call endpoints |
| `routes/ai.ts` | AI scoring, message generation, objection endpoints |
| `client/src/api.js` | Full frontend API client with token management |
| `client/src/App.jsx` | Main React app — all pages, real API wiring |

## API Endpoints Summary
**Auth (no auth required):**
- `POST /api/auth/register` — create user + org, returns JWT
- `POST /api/auth/login` — returns JWT
- `GET /api/auth/me` — restore session

**Protected (requires Bearer token):**
- `GET /api/dashboard` — stats (org-scoped)
- `GET /api/leads` — list with status/search filters (org-scoped)
- `POST /api/leads/:id/sms` — send SMS via Twilio
- `POST /api/leads/:id/email` — send email via Resend
- `POST /api/leads/:id/call` — initiate Twilio voice call
- `POST /api/leads/:id/score` — AI lead scoring
- `POST /api/leads/:id/generate-message` — AI message generation
- `POST /api/ai/objection` — AI objection handling
- `POST /api/leads/score-all` — batch score up to 10 leads
- `GET /api/integrations/status` — `{twilio, resend}`
- `GET /api/billing` — current plan + subscription status
- `GET /api/billing/plans` — available plans
- `POST /api/billing/checkout` — create Stripe checkout session
- `POST /api/billing/portal` — create Stripe billing portal session

**Webhooks (no auth — called by external services):**
- `POST /api/billing/webhook` — Stripe payment events
- `POST /api/webhooks/twilio/sms` — inbound SMS
- `POST /api/webhooks/twilio/call-status` — call status updates
- `POST /api/webhooks/twilio/voice` — TwiML for outbound calls

**Public:**
- `GET /api/ai/status` — `{configured}`
- `GET /api/health` — health check

## Integrations Status
- ✅ **Twilio** — SMS confirmed working, voice ready
- ✅ **Claude AI** — lead scoring, message generation, objection handling all live (model: claude-sonnet-4-20250514)
- ⚠️ **Resend** — API key set, but `leviosai.io` domain needs DNS verification in Resend dashboard
  - DNS provider: **Netlify**
  - Go to resend.com/domains → Add Domain → add TXT records in Netlify DNS settings

## Lead Status Mapping (Frontend ↔ Backend)
| Frontend Label | Backend Value |
|----------------|---------------|
| Dead | lost |
| Aged | contacted |
| Revived | qualified |

## Completed Phases
- **Phase 1** — Frontend ↔ backend wiring, real JWT auth, session restore, all pages hooked to real APIs
- **Phase 2** — Twilio SMS/voice, Resend email, Claude AI integrations (all with graceful degradation)
- **Phase 3** — Rate limiting, multi-tenant org auth, Stripe billing, Twilio webhooks, Sentry error monitoring

## Pending / Next Up

### Phase 4
- [ ] Customer onboarding flow
- [ ] Admin dashboard (usage, billing, org management)
- [ ] CRM OAuth integrations (HubSpot, Salesforce)
- [ ] Custom domain on Railway

### Resend
- [ ] Verify leviosai.io domain in Resend dashboard (add DNS TXT records in Netlify)
- [ ] Test live email send after domain verification
