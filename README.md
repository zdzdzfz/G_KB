# MailAuth Monitor

MailAuth Monitor is an Express.js + React full-stack app for connecting multiple Gmail mailboxes to one user account through Google OAuth 2.0. It caches Gmail metadata for placement, category, sending IP, SPF, DKIM, and DMARC monitoring.

## Stack

- Backend: Express.js, Node.js 22+, SQLite locally, Supabase/Postgres in production, Google Gmail API, Google OAuth 2.0
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, TanStack Query
- Structure: `backend/` and `frontend/`

## Install

Backend:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm.cmd run dev
```

Default login:

- Email: `admin@mailauth.local`
- Password: `password`

## Environment

Backend `.env`:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
APP_KEY=change-me-to-a-long-random-string
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
DATABASE_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/google/callback

GMAIL_MESSAGE_LIMIT=25
GMAIL_SYNC_COOLDOWN_SECONDS=60
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:8000/api
```
.
On Vercel, the frontend automatically uses `/api` when `VITE_API_URL` is not set.

## Supabase + Vercel

This repo is ready for one Vercel project:

- React builds to `frontend/dist`.
- Express runs as the Vercel function in `api/index.js`.
- Supabase stores users, generated OAuth links, Gmail mailboxes, encrypted refresh tokens, and cached message metadata.

Set these Vercel environment variables:

```env
APP_URL=https://your-vercel-domain.vercel.app
FRONTEND_URL=https://your-vercel-domain.vercel.app
APP_KEY=use-a-long-random-secret
DATABASE_URL=postgresql://postgres.xxxxx:YOUR-PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/google/callback
GMAIL_MESSAGE_LIMIT=25
GMAIL_SYNC_COOLDOWN_SECONDS=60
```

You can also copy the safe template from `.env.example` into Vercel's Environment Variables page and replace the placeholder values. Use the Supabase Postgres connection string, preferably the transaction pooler URI for Vercel/serverless. After deploy, add the exact `GOOGLE_REDIRECT_URI` above to Google Cloud OAuth authorized redirect URIs.

## GitHub Checklist

Before pushing, keep these files local only:

- `backend/.env`
- `.env` with real secret values
- any `node_modules/` folder
- `frontend/dist/`
- `backend/database/`
- `*.log`

They are already covered by `.gitignore` and `.vercelignore`. Commit the source files, lockfiles, `vercel.json`, and `.env.example` files.

## Gmail Flow

- The dashboard shows only `Generate Link` for adding Gmail mailboxes.
- Generate a link for the target Gmail address.
- The Gmail owner opens the link and accepts Google permissions.
- The mailbox is saved under the current MailAuth user account.
- One MailAuth user can manage multiple Gmail mailboxes from one dashboard.
- Mailboxes stay in the database until you disconnect/delete them.

## Data Storage

- `google_mailboxes`: connected Gmail accounts and encrypted refresh tokens
- `email_messages`: latest 25 cached Gmail metadata records per mailbox
- `google_oauth_invitations`: generated OAuth links
- `api_tokens`: Express bearer tokens

The app never asks for Gmail passwords and never returns Google tokens to React.

See [GOOGLE_CLOUD_OAUTH.md](GOOGLE_CLOUD_OAUTH.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
