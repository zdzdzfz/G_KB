# Google Cloud OAuth Setup

1. Open Google Cloud Console.
2. Create or select a project.
3. Enable the Gmail API.
4. Configure OAuth consent screen.
5. If the app is in testing mode, add your Gmail address under test users.
6. Create an OAuth client ID with type `Web application`.
7. Add this authorized redirect URI:

```text
http://localhost:8000/api/google/callback
```

Optional local variant:

```text
http://127.0.0.1:8000/api/google/callback
```

Production Vercel variant:

```text
https://your-vercel-domain.vercel.app/api/google/callback
```

8. Put the client ID and client secret in `backend/.env`.
9. Restart the Express backend:

```bash
cd backend
npm run dev
```

## Required Scopes

- Gmail read-only access
- User email
- User profile
- OpenID

The backend requests offline access so it can refresh Gmail access tokens during sync. It does not request Gmail passwords, IMAP access, attachments, full MIME bodies, or full email bodies.

## Adding Mailboxes

1. Log in to MailAuth Monitor.
2. Click `Generate Link`.
3. Enter the target Gmail address.
4. Open or send the copied OAuth link.
5. The Gmail owner selects the allowed Gmail account and accepts permissions.
6. The mailbox appears in your dashboard.
