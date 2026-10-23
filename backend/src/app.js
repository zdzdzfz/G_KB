import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { all, get, migrate, nowIso, run } from './db.js'
import { defaultSettings, mergeSettings } from './services/settings.js'
import { authorizationUrl, exchangeCode, syncMailbox, upsertMailbox } from './services/google.js'
import { hashToken, randomToken } from './services/crypto.js'

export async function createApp() {
  await migrate()

  const app = express()
  app.use(cors({ origin: config.frontendUrl }))
  app.use(express.json())

  app.get('/up', (_, res) => res.status(200).send('<!DOCTYPE html><html><body>OK</body></html>'))

  app.post('/api/login', async (req, res, next) => {
    try {
      const { email, password } = req.body || {}
      const user = await get('SELECT * FROM users WHERE email = ?', String(email || '').toLowerCase())
      if (!user || !(await bcrypt.compare(String(password || ''), user.password))) {
        return res.status(422).json({ message: 'The provided credentials are incorrect.' })
      }

      const token = randomToken(40)
      await run('INSERT INTO api_tokens (user_id, token_hash, created_at) VALUES (?, ?, ?)', user.id, hashToken(token), nowIso())

      res.json({ token, user: userResource(user) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/google/callback', googleCallback)
  app.get('/api/google/invitations/:token/redirect', invitationRedirect)

  app.use('/api', authenticate)

  app.post('/api/logout', async (req, res) => {
    await run('DELETE FROM api_tokens WHERE id = ?', req.tokenRecord.id)
    res.json({ message: 'Logged out.' })
  })

  app.get('/api/me', (req, res) => res.json({ data: userResource(req.user) }))

  app.get('/api/google/redirect', async (req, res) => {
    const state = await createOAuthState({ user_id: req.user.id, mailbox_id: null, return_path: '/dashboard' })
    res.json({ redirect_url: authorizationUrl(state) })
  })

  app.post('/api/google/invitations', async (req, res) => {
    const targetEmail = req.body?.target_email ? String(req.body.target_email).toLowerCase().trim() : null
    const token = randomToken(36)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await run(
      'INSERT INTO google_oauth_invitations (user_id, token, target_email, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      req.user.id,
      token,
      targetEmail,
      expiresAt,
      nowIso(),
      nowIso(),
    )
    res.json({
      url: `${config.appUrl}/api/google/invitations/${token}/redirect`,
      target_email: targetEmail,
      expires_at: expiresAt,
    })
  })

  app.get('/api/mailboxes', async (req, res) => {
    const rows = await all(
      `SELECT gm.*, COUNT(em.id) AS cached_messages_count
       FROM google_mailboxes gm
       LEFT JOIN email_messages em ON em.google_mailbox_id = gm.id
       WHERE gm.user_id = ?
       GROUP BY gm.id
       ORDER BY gm.email ASC`,
      req.user.id,
    )
    res.json({ data: rows.map(mailboxResource) })
  })

  app.post('/api/mailboxes/sync-all', async (req, res) => {
    const mailboxes = await all('SELECT * FROM google_mailboxes WHERE user_id = ? AND status != ?', req.user.id, 'paused')
    const automatic = Boolean(req.body?.automatic)
    const results = []
    for (const mailbox of mailboxes) {
      try {
        if (automatic && recentlySynced(mailbox, config.google.autoSyncCooldownSeconds)) {
          results.push({ mailbox_id: mailbox.id, status: 'skipped' })
          continue
        }
        await syncMailbox(mailbox.id, { manual: !automatic })
        results.push({ mailbox_id: mailbox.id, status: 'synced' })
      } catch (error) {
        results.push({ mailbox_id: mailbox.id, status: 'failed', message: error.message })
      }
    }
    res.json({ results })
  })

  app.post('/api/mailboxes/:id/sync', ownsMailbox, async (req, res, next) => {
    try {
      const mailbox = await syncMailbox(req.mailbox.id, { manual: true })
      res.json({ data: mailboxResource(await withMessageCount(mailbox)) })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/mailboxes/:id/pause', ownsMailbox, async (req, res) => {
    await run('UPDATE google_mailboxes SET status = ?, updated_at = ? WHERE id = ?', 'paused', nowIso(), req.mailbox.id)
    res.json({ data: mailboxResource(await withMessageCount(await get('SELECT * FROM google_mailboxes WHERE id = ?', req.mailbox.id))) })
  })

  app.post('/api/mailboxes/:id/resume', ownsMailbox, async (req, res) => {
    await run('UPDATE google_mailboxes SET status = ?, last_sync_error = ?, updated_at = ? WHERE id = ?', 'connected', null, nowIso(), req.mailbox.id)
    res.json({ data: mailboxResource(await withMessageCount(await get('SELECT * FROM google_mailboxes WHERE id = ?', req.mailbox.id))) })
  })

  app.get('/api/mailboxes/:id/reconnect', ownsMailbox, async (req, res) => {
    const state = await createOAuthState({ user_id: req.user.id, mailbox_id: req.mailbox.id, return_path: '/dashboard' })
    res.json({ redirect_url: authorizationUrl(state) })
  })

  app.delete('/api/mailboxes/:id', ownsMailbox, async (req, res) => {
    await run('DELETE FROM google_mailboxes WHERE id = ?', req.mailbox.id)
    res.json({ message: 'Mailbox disconnected.' })
  })

  app.get('/api/mailboxes/:id/messages', ownsMailbox, async (req, res) => {
    const { sql, params } = messageFilterSql(req.mailbox.id, req.query)
    res.json({ data: (await all(sql, ...params)).map(messageResource) })
  })

  app.get('/api/messages/:id', async (req, res, next) => {
    const message = await get(
      `SELECT em.* FROM email_messages em
       INNER JOIN google_mailboxes gm ON gm.id = em.google_mailbox_id
       WHERE em.id = ? AND gm.user_id = ?`,
      req.params.id,
      req.user.id,
    )
    if (!message) return next(statusError(404, 'Message not found.'))
    res.json({ data: messageResource(message) })
  })

  app.get('/api/dashboard/stats', async (req, res) => {
    const mailboxIds = (await all('SELECT id FROM google_mailboxes WHERE user_id = ?', req.user.id)).map((row) => row.id)
    if (mailboxIds.length === 0) {
      return res.json({
        mailboxes: { total: 0, active: 0, paused: 0, reconnect_required: 0 },
        messages: { cached: 0, inbox: 0, spam: 0, auth_pass_rate: 0 },
      })
    }
    const placeholders = mailboxIds.map(() => '?').join(',')
    const mailboxStats = await get(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('connected','syncing') THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) AS paused,
        SUM(CASE WHEN status = 'reconnect_required' THEN 1 ELSE 0 END) AS reconnect_required
       FROM google_mailboxes WHERE user_id = ?`,
      req.user.id,
    )
    const messageStats = await get(
      `SELECT
        COUNT(*) AS cached,
        SUM(CASE WHEN placement = 'inbox' THEN 1 ELSE 0 END) AS inbox,
        SUM(CASE WHEN placement = 'spam' THEN 1 ELSE 0 END) AS spam,
        SUM(CASE WHEN spf_result = 'pass' AND dkim_result = 'pass' AND dmarc_result = 'pass' THEN 1 ELSE 0 END) AS pass_all
       FROM email_messages WHERE google_mailbox_id IN (${placeholders})`,
      ...mailboxIds,
    )
    res.json({
      mailboxes: numericStats(mailboxStats),
      messages: {
        cached: Number(messageStats.cached || 0),
        inbox: Number(messageStats.inbox || 0),
        spam: Number(messageStats.spam || 0),
        auth_pass_rate: messageStats.cached ? Math.round((Number(messageStats.pass_all || 0) / Number(messageStats.cached)) * 1000) / 10 : 0,
      },
    })
  })

  app.get('/api/dashboard/top-sending-ips', async (req, res) => {
    const rows = await all(
      `SELECT em.observed_sending_ip, COUNT(*) AS total
       FROM email_messages em
       INNER JOIN google_mailboxes gm ON gm.id = em.google_mailbox_id
       WHERE gm.user_id = ? AND em.observed_sending_ip IS NOT NULL
       GROUP BY em.observed_sending_ip
       ORDER BY total DESC
       LIMIT 10`,
      req.user.id,
    )
    res.json({ data: rows })
  })

  app.get('/api/settings', async (req, res) => {
    res.json({ data: { settings: await getSettings(req.user.id) } })
  })

  app.put('/api/settings', async (req, res) => {
    const settings = mergeSettings(req.body || {})
    await saveSettings(req.user.id, settings)
    res.json({ data: { settings } })
  })

  app.post('/api/settings/reset', async (req, res) => {
    await saveSettings(req.user.id, defaultSettings)
    res.json({ data: { settings: defaultSettings } })
  })

  app.use((error, req, res, _next) => {
    const status = error.status || error.code || 500
    if (status >= 500) console.error(error)
    res.status(status).json({ message: error.message || 'Server error' })
  })

  return app
}

async function googleCallback(req, res, next) {
  try {
    if (req.query.error) {
      return redirectFrontend(res, '/dashboard', { gmail: 'error', message: req.query.error })
    }
    const state = await consumeOAuthState(String(req.query.state || ''))
    if (!state) return redirectFrontend(res, '/dashboard', { gmail: 'state_invalid', message: 'OAuth state could not be validated.' })

    const { auth, tokens, profile } = await exchangeCode(String(req.query.code || ''))
    const invitation = state.invitation_id ? await get('SELECT * FROM google_oauth_invitations WHERE id = ?', state.invitation_id) : null
    if (invitation) {
      if (invitation.used_at || Date.parse(invitation.expires_at) < Date.now()) {
        return redirectFrontend(res, state.return_path || '/login', { gmail: 'invite_invalid', message: 'This Gmail connection link is invalid or expired.' })
      }
      if (invitation.target_email && invitation.target_email.toLowerCase() !== profile.email.toLowerCase()) {
        return redirectFrontend(res, state.return_path || '/login', { gmail: 'email_mismatch', message: 'This link is reserved for another Gmail address.' })
      }
    }

    const mailbox = await upsertMailbox(state.user_id, profile, tokens)
    if (invitation) await run('UPDATE google_oauth_invitations SET used_at = ?, updated_at = ? WHERE id = ?', nowIso(), nowIso(), invitation.id)
    try {
      await syncMailbox(mailbox.id, { auth })
    } catch (error) {
      console.error(error)
    }
    return redirectFrontend(res, state.return_path || '/dashboard', { gmail: 'connected', mailbox: mailbox.email })
  } catch (error) {
    next(error)
  }
}

async function invitationRedirect(req, res) {
  const invitation = await get('SELECT * FROM google_oauth_invitations WHERE token = ?', req.params.token)
  if (!invitation || invitation.used_at || Date.parse(invitation.expires_at) < Date.now()) {
    return redirectFrontend(res, '/login', { gmail: 'invite_invalid', message: 'This Gmail connection link is invalid or expired.' })
  }
  const state = await createOAuthState({ user_id: invitation.user_id, invitation_id: invitation.id, mailbox_id: null, return_path: '/login' })
  res.redirect(authorizationUrl(state))
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return next(statusError(401, 'Unauthenticated.'))
    const tokenRecord = await get('SELECT * FROM api_tokens WHERE token_hash = ?', hashToken(token))
    if (!tokenRecord) return next(statusError(401, 'Unauthenticated.'))
    const user = await get('SELECT * FROM users WHERE id = ?', tokenRecord.user_id)
    if (!user) return next(statusError(401, 'Unauthenticated.'))
    await run('UPDATE api_tokens SET last_used_at = ? WHERE id = ?', nowIso(), tokenRecord.id)
    req.user = user
    req.tokenRecord = tokenRecord
    next()
  } catch (error) {
    next(error)
  }
}

async function ownsMailbox(req, _res, next) {
  const mailbox = await get('SELECT * FROM google_mailboxes WHERE id = ? AND user_id = ?', req.params.id, req.user.id)
  if (!mailbox) return next(statusError(404, 'Mailbox not found.'))
  req.mailbox = mailbox
  next()
}

async function createOAuthState(payload) {
  const state = randomToken(32)
  await run(
    'INSERT INTO oauth_states (state, payload, expires_at, created_at) VALUES (?, ?, ?, ?)',
    state,
    JSON.stringify(payload),
    new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    nowIso(),
  )
  return state
}

async function consumeOAuthState(state) {
  const row = await get('SELECT * FROM oauth_states WHERE state = ?', state)
  if (!row) return null
  await run('DELETE FROM oauth_states WHERE state = ?', state)
  if (Date.parse(row.expires_at) < Date.now()) return null
  return JSON.parse(row.payload)
}

function messageFilterSql(mailboxId, query) {
  const where = ['google_mailbox_id = ?']
  const params = [mailboxId]
  const search = String(query.search || '').trim().toLowerCase()
  if (search) {
    where.push(
      `(
        LOWER(COALESCE(sender_name, '')) LIKE ?
        OR LOWER(COALESCE(sender_email, '')) LIKE ?
        OR LOWER(COALESCE(subject, '')) LIKE ?
        OR LOWER(COALESCE(from_domain, '')) LIKE ?
        OR LOWER(COALESCE(return_path_domain, '')) LIKE ?
        OR LOWER(COALESCE(return_path, '')) LIKE ?
        OR LOWER(COALESCE(observed_sending_ip, '')) LIKE ?
      )`,
    )
    const value = `%${search}%`
    params.push(value, value, value, value, value, value, value)
  }
  const map = { placement: 'placement', category: 'gmail_category', spf: 'spf_result', dkim: 'dkim_result', dmarc: 'dmarc_result' }
  for (const [input, column] of Object.entries(map)) {
    if (query[input]) {
      where.push(`${column} = ?`)
      params.push(query[input])
    }
  }
  if (query.date_from) {
    where.push('received_at >= ?')
    params.push(query.date_from)
  }
  if (query.date_to) {
    where.push('received_at <= ?')
    params.push(query.date_to)
  }
  return {
    sql: `SELECT * FROM email_messages WHERE ${where.join(' AND ')} ORDER BY received_at DESC, id DESC LIMIT 25`,
    params,
  }
}

function recentlySynced(mailbox, cooldownSeconds) {
  if (!mailbox.last_synced_at) return false

  const seconds = (Date.now() - Date.parse(mailbox.last_synced_at)) / 1000
  return seconds < cooldownSeconds
}

async function getSettings(userId) {
  const row = await get('SELECT * FROM app_settings WHERE user_id = ?', userId)
  if (!row) {
    await saveSettings(userId, defaultSettings)
    return defaultSettings
  }
  return mergeSettings(JSON.parse(row.settings || '{}'))
}

async function saveSettings(userId, settings) {
  const row = await get('SELECT id FROM app_settings WHERE user_id = ?', userId)
  if (row) {
    await run('UPDATE app_settings SET settings = ?, updated_at = ? WHERE user_id = ?', JSON.stringify(settings), nowIso(), userId)
  } else {
    await run('INSERT INTO app_settings (user_id, settings, created_at, updated_at) VALUES (?, ?, ?, ?)', userId, JSON.stringify(settings), nowIso(), nowIso())
  }
}

async function withMessageCount(mailbox) {
  const count = await get('SELECT COUNT(*) AS total FROM email_messages WHERE google_mailbox_id = ?', mailbox.id)
  return { ...mailbox, cached_messages_count: count.total }
}

function mailboxResource(mailbox) {
  return {
    id: Number(mailbox.id),
    email: mailbox.email,
    display_name: mailbox.display_name,
    avatar_url: mailbox.avatar_url,
    status: mailbox.status,
    granted_scopes: parseJson(mailbox.granted_scopes, []),
    gmail_history_id: mailbox.gmail_history_id,
    messages_total: Number(mailbox.messages_total || 0),
    cached_messages_count: Number(mailbox.cached_messages_count || 0),
    last_synced_at: mailbox.last_synced_at,
    last_sync_error: mailbox.last_sync_error,
    created_at: mailbox.created_at,
  }
}

function messageResource(message) {
  return {
    ...message,
    id: Number(message.id),
    google_mailbox_id: Number(message.google_mailbox_id),
    raw_label_ids: parseJson(message.raw_label_ids, []),
  }
}

function userResource(user) {
  return { id: Number(user.id), name: user.name, email: user.email }
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function numericStats(row) {
  return {
    total: Number(row.total || 0),
    active: Number(row.active || 0),
    paused: Number(row.paused || 0),
    reconnect_required: Number(row.reconnect_required || 0),
  }
}

function redirectFrontend(res, path, query) {
  res.redirect(`${config.frontendUrl}${path}?${new URLSearchParams(query).toString()}`)
}

function statusError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}
