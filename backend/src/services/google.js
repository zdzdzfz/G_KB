import { google } from 'googleapis'
import { config } from '../config.js'
import { all, get, nowIso, run } from '../db.js'
import { decrypt, encrypt } from './crypto.js'
import { parseGmailMessage } from './parser.js'

export const gmailScopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
]

const syncLocks = new Set()
const metadataHeaders = [
  'From',
  'Subject',
  'Date',
  'Message-ID',
  'Return-Path',
  'Authentication-Results',
  'Received-SPF',
  'DKIM-Signature',
  'Received',
  'ARC-Authentication-Results',
]

export function oauthClient() {
  if (!config.google.clientId || !config.google.clientSecret || !config.google.redirectUri) {
    const error = new Error('Google OAuth credentials are not configured.')
    error.status = 422
    throw error
  }

  return new google.auth.OAuth2(config.google.clientId, config.google.clientSecret, config.google.redirectUri)
}

export function authorizationUrl(state) {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: true,
    scope: gmailScopes,
    state,
  })
}

export async function exchangeCode(code) {
  const auth = oauthClient()
  const { tokens } = await auth.getToken(code)
  auth.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth })
  const { data } = await oauth2.userinfo.get()

  return {
    auth,
    tokens,
    profile: {
      id: data.id,
      email: String(data.email || '').toLowerCase(),
      name: data.name || null,
      picture: data.picture || null,
    },
  }
}

export async function upsertMailbox(userId, profile, tokens) {
  const existing = await get(
    'SELECT * FROM google_mailboxes WHERE user_id = ? AND (google_user_id = ? OR email = ?) LIMIT 1',
    userId,
    profile.id,
    profile.email,
  )
  const now = nowIso()
  const refreshToken = tokens.refresh_token || safeDecrypt(existing?.encrypted_refresh_token)
  const grantedScopes = tokens.scope ? JSON.stringify(String(tokens.scope).split(/\s+/).filter(Boolean)) : JSON.stringify([])

  if (existing) {
    await run(
      `UPDATE google_mailboxes
       SET google_user_id = ?, email = ?, display_name = ?, avatar_url = ?, encrypted_refresh_token = ?,
           granted_scopes = ?, status = ?, last_sync_error = ?, updated_at = ?
       WHERE id = ?`,
      profile.id,
      profile.email,
      profile.name,
      profile.picture,
      refreshToken ? encrypt(refreshToken) : existing.encrypted_refresh_token,
      grantedScopes,
      refreshToken ? 'connected' : 'reconnect_required',
      refreshToken ? null : 'Reconnect required',
      now,
      existing.id,
    )
    return get('SELECT * FROM google_mailboxes WHERE id = ?', existing.id)
  }

  await run(
    `INSERT INTO google_mailboxes
     (user_id, google_user_id, email, display_name, avatar_url, encrypted_refresh_token, granted_scopes, status, last_sync_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    profile.id,
    profile.email,
    profile.name,
    profile.picture,
    refreshToken ? encrypt(refreshToken) : null,
    grantedScopes,
    refreshToken ? 'connected' : 'reconnect_required',
    refreshToken ? null : 'Reconnect required',
    now,
    now,
  )

  return get('SELECT * FROM google_mailboxes WHERE user_id = ? AND google_user_id = ?', userId, profile.id)
}

export async function syncMailbox(mailboxId, { manual = false, auth = null } = {}) {
  const mailbox = await get('SELECT * FROM google_mailboxes WHERE id = ?', mailboxId)
  if (!mailbox) {
    const error = new Error('Mailbox not found.')
    error.status = 404
    throw error
  }

  if (mailbox.status === 'paused') return mailbox

  if (manual && mailbox.last_synced_at) {
    const seconds = (Date.now() - Date.parse(mailbox.last_synced_at)) / 1000
    if (seconds < config.google.syncCooldownSeconds) {
      const error = new Error(`Manual sync is available every ${config.google.syncCooldownSeconds} seconds.`)
      error.status = 422
      throw error
    }
  }

  if (syncLocks.has(mailbox.id)) return mailbox
  syncLocks.add(mailbox.id)

  try {
    auth ||= oauthClient()
    if (!auth.credentials?.access_token) {
      const refreshToken = safeDecrypt(mailbox.encrypted_refresh_token)
      if (!refreshToken) {
        await markReconnectRequired(mailbox.id)
        const error = new Error('Reconnect required.')
        error.status = 422
        throw error
      }
      auth.setCredentials({ refresh_token: refreshToken })
    }

    await run('UPDATE google_mailboxes SET status = ?, last_sync_error = ?, updated_at = ? WHERE id = ?', 'syncing', null, nowIso(), mailbox.id)

    const gmail = google.gmail({ version: 'v1', auth })
    const { data: profile } = await gmail.users.getProfile({ userId: 'me' })
    const { data: list } = await gmail.users.messages.list({
      userId: 'me',
      includeSpamTrash: true,
      maxResults: config.google.messageLimit,
    })

    for (const ref of list.messages || []) {
      const { data: message } = await gmail.users.messages.get({
        userId: 'me',
        id: ref.id,
        format: 'metadata',
        metadataHeaders,
      })
      await upsertMessage(mailbox.id, parseGmailMessage(message))
    }

    await trimMessages(mailbox.id)
    await run(
      `UPDATE google_mailboxes
       SET status = ?, gmail_history_id = ?, messages_total = ?, last_synced_at = ?, last_sync_error = ?, updated_at = ?
       WHERE id = ?`,
      'connected',
      profile.historyId || null,
      Number(profile.messagesTotal || 0),
      nowIso(),
      null,
      nowIso(),
      mailbox.id,
    )

    return get('SELECT * FROM google_mailboxes WHERE id = ?', mailbox.id)
  } catch (error) {
    const message = String(error.message || error)
    if (message.includes('invalid_grant') || message.includes('Reconnect required')) {
      await markReconnectRequired(mailbox.id)
    } else {
      await run('UPDATE google_mailboxes SET status = ?, last_sync_error = ?, updated_at = ? WHERE id = ?', 'error', message, nowIso(), mailbox.id)
    }
    throw error
  } finally {
    syncLocks.delete(mailbox.id)
  }
}

async function upsertMessage(mailboxId, message) {
  const now = nowIso()
  const existing = await get('SELECT id FROM email_messages WHERE google_mailbox_id = ? AND gmail_message_id = ?', mailboxId, message.gmail_message_id)
  const values = [
    message.gmail_thread_id,
    message.message_id_header,
    message.sender_name,
    message.sender_email,
    message.subject,
    message.snippet,
    message.received_at,
    message.placement,
    message.gmail_category,
    message.from_domain,
    message.return_path,
    message.return_path_domain,
    message.observed_sending_ip,
    message.spf_result,
    message.spf_domain,
    message.dkim_result,
    message.dkim_domain,
    message.dkim_selector,
    message.dmarc_result,
    message.dmarc_domain,
    message.raw_label_ids,
    message.authentication_results_raw,
    message.received_spf_raw,
    now,
  ]

  if (existing) {
    await run(
      `UPDATE email_messages SET
        gmail_thread_id = ?, message_id_header = ?, sender_name = ?, sender_email = ?, subject = ?, snippet = ?,
        received_at = ?, placement = ?, gmail_category = ?, from_domain = ?, return_path = ?, return_path_domain = ?,
        observed_sending_ip = ?, spf_result = ?, spf_domain = ?, dkim_result = ?, dkim_domain = ?, dkim_selector = ?,
        dmarc_result = ?, dmarc_domain = ?, raw_label_ids = ?, authentication_results_raw = ?, received_spf_raw = ?, updated_at = ?
       WHERE id = ?`,
      ...values,
      existing.id,
    )
    return
  }

  await run(
    `INSERT INTO email_messages
      (google_mailbox_id, gmail_message_id, gmail_thread_id, message_id_header, sender_name, sender_email, subject, snippet,
       received_at, placement, gmail_category, from_domain, return_path, return_path_domain, observed_sending_ip,
       spf_result, spf_domain, dkim_result, dkim_domain, dkim_selector, dmarc_result, dmarc_domain,
       raw_label_ids, authentication_results_raw, received_spf_raw, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    mailboxId,
    message.gmail_message_id,
    ...values,
    now,
  )
}

async function trimMessages(mailboxId) {
  const keep = (
    await all(
      'SELECT id FROM email_messages WHERE google_mailbox_id = ? ORDER BY received_at DESC, id DESC LIMIT ?',
      mailboxId,
      config.google.messageLimit,
    )
  ).map((row) => row.id)
  if (keep.length === 0) return
  const placeholders = keep.map(() => '?').join(',')
  await run(`DELETE FROM email_messages WHERE google_mailbox_id = ? AND id NOT IN (${placeholders})`, mailboxId, ...keep)
}

async function markReconnectRequired(mailboxId) {
  await run(
    'UPDATE google_mailboxes SET status = ?, last_sync_error = ?, updated_at = ? WHERE id = ?',
    'reconnect_required',
    'Reconnect required',
    nowIso(),
    mailboxId,
  )
}

function safeDecrypt(value) {
  try {
    return decrypt(value)
  } catch {
    return null
  }
}
