# MailAuth Monitor Express Backend

This folder now runs the Express.js API for MailAuth Monitor.

```bash
npm install
npm run dev
```

The API listens on `http://localhost:8000` by default and uses `database/database.sqlite`.
When `DATABASE_URL` is set, it uses Supabase/Postgres instead.
