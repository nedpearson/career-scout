# Job Tracker

An “agency-style” job hunting app: track jobs + applications, score your match vs your skills, research companies, and generate/send outreach emails via Gmail.

## Features (in this repo)

- Accounts + per-user workspace
- Job search + filters (Local/Onsite, Remote, Hybrid)
- Job import connectors (starts with free/public sources; optional paid connectors later)
- Optional “search other platforms” connector (BYO SerpAPI key; import results into Jobs)
- Match scoring vs your profile/skills (AI optional)
- Company notes + “how you can help” suggestions (AI optional)
- AI writing: outreach email / follow-ups / cover-letter fragments (tone + “human-sounding” control)
- LinkedIn workflow: store your LinkedIn, open search/apply/contact, generate LinkedIn-ready messages (copy/paste)
- AI job deep-dive: strengths/gaps, missing skills, interview angles (saved per job)
- Gmail integration to send email from your address (Google OAuth + Gmail API)
- Export/import your data (so you can share a fresh copy or move accounts)

## Tech

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + Postgres
- Auth.js / NextAuth (Google OAuth)

## Setup

1. Install dependencies:

```bash
cd job-tracker
npm install
```

2. Create `.env` from the example:

```bash
copy .env.example .env
```

3. Setup the database:

```bash
npm run prisma:migrate
```

Note: Prisma client generation runs automatically on install/build (`postinstall` + `prebuild`). You can also run it manually:

```bash
npm run prisma:generate
```

4. Run:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Google OAuth (Gmail send)

Create a Google Cloud OAuth client (Web application) and set:

- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Then set in `.env`:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

This app requests **Gmail send** scope so it can send emails from your Gmail address.

## LinkedIn

This app supports a **LinkedIn workflow**:

- Save your LinkedIn profile URL in Profile
- Save job/company/contact LinkedIn URLs per application
- One-click open LinkedIn search pages (jobs + people search)
- Generate a LinkedIn message draft (AI) to copy/paste

Important: this app **does not automatically send LinkedIn messages or auto-apply**, since that typically requires LinkedIn partner APIs and/or violates their terms if automated.

## Job boards (Indeed, etc.)

Some job boards don’t allow scraping and/or don’t offer public APIs. This project is built with a **connector architecture**:

- Prefer **official APIs / allowed sources** (e.g., public job APIs, ATS feeds, RSS, company career pages you control/have permission to index).
- For platforms that require it, use a **search API provider** you have rights to use (BYO key).

### Optional: SerpAPI job search

If you want broader search coverage (e.g. results that include listings from sites like Indeed via Google Jobs results), set:

- `SERPAPI_API_KEY`

## Sharing with others

This app is designed so each user gets their own data.

- **Share the code**: zip the `job-tracker` folder (excluding `node_modules` and `.env`) or publish to GitHub.
- **Share a “fresh copy”**: new user signs in and starts with an empty workspace.
- **Move your data**: export from Settings → Export, import on another instance.

