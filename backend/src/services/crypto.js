import crypto from 'node:crypto'
import { config } from '../config.js'

function encryptionKey() {
  const raw = config.appKey.startsWith('base64:') ? Buffer.from(config.appKey.slice(7), 'base64') : Buffer.from(config.appKey)
  return crypto.createHash('sha256').update(raw).digest()
}

export function encrypt(value) {
  if (!value) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(value) {
  if (!value) return null
  const payload = Buffer.from(value, 'base64')
  const iv = payload.subarray(0, 12)
  const tag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex')
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
