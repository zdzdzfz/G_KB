import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg
const usePostgres = Boolean(config.databaseUrl)
let sqlite = null
let pool = null

if (usePostgres) {
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  })
} else {
  const { DatabaseSync } = await import('node:sqlite')
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true })
  sqlite = new DatabaseSync(config.databasePath)
  sqlite.exec('PRAGMA foreign_keys = ON')
}

export const nowIso = () => new Date().toISOString()

export async function migrate() {
  if (usePostgres) {
    await execPostgres(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified_at TEXT NULL,
        password TEXT NOT NULL,
        remember_token TEXT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL
      );

      CREATE TABLE IF NOT EXISTS api_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_used_at TEXT NULL
      );

      CREATE TABLE IF NOT EXISTS google_mailboxes (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        google_user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT NULL,
        avatar_url TEXT NULL,
        encrypted_refresh_token TEXT NULL,
        granted_scopes TEXT NULL,
        status TEXT NOT NULL DEFAULT 'connected',
        gmail_history_id TEXT NULL,
        messages_total BIGINT NOT NULL DEFAULT 0,
        last_synced_at TEXT NULL,
        last_sync_error TEXT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL,
        UNIQUE (user_id, google_user_id),
        UNIQUE (user_id, email)
      );

      CREATE TABLE IF NOT EXISTS email_messages (
        id BIGSERIAL PRIMARY KEY,
        google_mailbox_id BIGINT NOT NULL REFERENCES google_mailboxes(id) ON DELETE CASCADE,
        gmail_message_id TEXT NOT NULL,
        gmail_thread_id TEXT NULL,
        message_id_header TEXT NULL,
        sender_name TEXT NULL,
        sender_email TEXT NULL,
        subject TEXT NULL,
        snippet TEXT NULL,
        received_at TEXT NULL,
        placement TEXT NOT NULL DEFAULT 'other',
        gmail_category TEXT NULL,
        from_domain TEXT NULL,
        return_path TEXT NULL,
        return_path_domain TEXT NULL,
        observed_sending_ip TEXT NULL,
        spf_result TEXT NOT NULL DEFAULT 'unknown',
        spf_domain TEXT NULL,
        dkim_result TEXT NOT NULL DEFAULT 'unknown',
        dkim_domain TEXT NULL,
        dkim_selector TEXT NULL,
        dmarc_result TEXT NOT NULL DEFAULT 'unknown',
        dmarc_domain TEXT NULL,
        raw_label_ids TEXT NULL,
        authentication_results_raw TEXT NULL,
        received_spf_raw TEXT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL,
        UNIQUE (google_mailbox_id, gmail_message_id)
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        settings TEXT NOT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL
      );

      CREATE TABLE IF NOT EXISTS google_oauth_invitations (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        target_email TEXT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL
      );

      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `)
  } else {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified_at TEXT NULL,
        password TEXT NOT NULL,
        remember_token TEXT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL
      );

      CREATE TABLE IF NOT EXISTS api_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_used_at TEXT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS google_mailboxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        google_user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT NULL,
        avatar_url TEXT NULL,
        encrypted_refresh_token TEXT NULL,
        granted_scopes TEXT NULL,
        status TEXT NOT NULL DEFAULT 'connected',
        gmail_history_id TEXT NULL,
        messages_total INTEGER NOT NULL DEFAULT 0,
        last_synced_at TEXT NULL,
        last_sync_error TEXT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, google_user_id),
        UNIQUE (user_id, email)
      );

      CREATE TABLE IF NOT EXISTS email_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_mailbox_id INTEGER NOT NULL,
        gmail_message_id TEXT NOT NULL,
        gmail_thread_id TEXT NULL,
        message_id_header TEXT NULL,
        sender_name TEXT NULL,
        sender_email TEXT NULL,
        subject TEXT NULL,
        snippet TEXT NULL,
        received_at TEXT NULL,
        placement TEXT NOT NULL DEFAULT 'other',
        gmail_category TEXT NULL,
        from_domain TEXT NULL,
        return_path TEXT NULL,
        return_path_domain TEXT NULL,
        observed_sending_ip TEXT NULL,
        spf_result TEXT NOT NULL DEFAULT 'unknown',
        spf_domain TEXT NULL,
        dkim_result TEXT NOT NULL DEFAULT 'unknown',
        dkim_domain TEXT NULL,
        dkim_selector TEXT NULL,
        dmarc_result TEXT NOT NULL DEFAULT 'unknown',
        dmarc_domain TEXT NULL,
        raw_label_ids TEXT NULL,
        authentication_results_raw TEXT NULL,
        received_spf_raw TEXT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL,
        FOREIGN KEY (google_mailbox_id) REFERENCES google_mailboxes(id) ON DELETE CASCADE,
        UNIQUE (google_mailbox_id, gmail_message_id)
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        settings TEXT NOT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS google_oauth_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        target_email TEXT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT NULL,
        created_at TEXT NULL,
        updated_at TEXT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `)
  }

  const user = await get('SELECT id FROM users WHERE email = ?', 'admin@mailauth.local')
  if (!user) {
    await run(
      'INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      'MailAuth Admin',
      'admin@mailauth.local',
      bcrypt.hashSync('password', 10),
      nowIso(),
      nowIso(),
    )
  }
}

export async function all(statement, ...params) {
  if (usePostgres) {
    const result = await pool.query(toPostgres(statement), params)
    return result.rows
  }
  return sqlite.prepare(statement).all(...params)
}

export async function get(statement, ...params) {
  if (usePostgres) {
    const result = await pool.query(toPostgres(statement), params)
    return result.rows[0] || null
  }
  return sqlite.prepare(statement).get(...params) || null
}

export async function run(statement, ...params) {
  if (usePostgres) {
    const result = await pool.query(toPostgres(statement), params)
    return { changes: result.rowCount }
  }
  return sqlite.prepare(statement).run(...params)
}

export async function closeDb() {
  if (pool) await pool.end()
}

async function execPostgres(sql) {
  await pool.query(sql)
}

function toPostgres(statement) {
  let index = 0
  return statement.replace(/\?/g, () => `$${++index}`)
}
