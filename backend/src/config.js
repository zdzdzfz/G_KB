import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const config = {
  rootDir,
  port: Number(process.env.PORT || 8000),
  appUrl: process.env.APP_URL || 'http://localhost:8000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  appKey: process.env.APP_KEY || 'mailauth-monitor-dev-key',
  databasePath:
    process.env.DB_CONNECTION === 'sqlite' && process.env.DB_DATABASE
      ? path.resolve(rootDir, process.env.DB_DATABASE)
      : path.resolve(rootDir, 'database', 'database.sqlite'),
  databaseUrl: process.env.DATABASE_URL || '',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/google/callback',
    messageLimit: Number(process.env.GMAIL_MESSAGE_LIMIT || 25),
    syncCooldownSeconds: Number(process.env.GMAIL_SYNC_COOLDOWN_SECONDS || 60),
  },
}
