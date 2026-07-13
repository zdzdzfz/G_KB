# Troubleshooting

## redirect_uri_mismatch

Go to Google Cloud Console:

`APIs & Services -> Credentials -> OAuth 2.0 Client ID`

Add this exact authorized redirect URI:

```text
http://localhost:8000/api/google/callback
```

For Vercel production, add the production URI too:

```text
https://your-vercel-domain.vercel.app/api/google/callback
```

Then restart the backend:

```bash
cd backend
npm run dev
```

## Mailbox Does Not Appear

Adding a Gmail address as a Google Cloud test user is not enough. In MailAuth Monitor, click `Generate Link`, open the link, choose the Gmail account, and accept permissions.

## Reconnect Required

The Gmail refresh token was revoked, expired, or missing. Cached messages remain visible. Use the mailbox `Reconnect` action.

## Manual Sync Cooldown

Manual sync is limited by `GMAIL_SYNC_COOLDOWN_SECONDS`, default `60`.

## Local Link Works Only On Your PC

Generated links use `APP_URL`. With `localhost`, links work only on your machine. To send links to another person, use a public URL such as ngrok or deploy the backend, then update:

```env
APP_URL=https://your-public-url
GOOGLE_REDIRECT_URI=https://your-public-url/api/google/callback
```

Also add that exact redirect URI in Google Cloud.

## Supabase Connection Fails On Vercel

Use `DATABASE_URL` from Supabase:

- Prefer `Connection pooling -> Transaction` for Vercel/serverless.
- Include the real database password instead of `[YOUR-PASSWORD]`.
- Keep `ssl` enabled; the Express backend enables SSL automatically for non-local Postgres URLs.

You do not need Supabase anon key or service role key for this backend unless you later add Supabase Auth or Storage.
