import test from 'node:test'
import assert from 'node:assert/strict'
import { extractDomainFromEmail, extractEmail, extractSendingIp, parseAuthResults } from '../src/services/parser.js'

test('parses authentication results', () => {
  const parsed = parseAuthResults(
    'mx.google.com; spf=pass smtp.mailfrom=google.com; dkim=pass header.d=accounts.google.com header.s=202401; dmarc=fail header.from=google.com',
  )

  assert.equal(parsed.spf_result, 'pass')
  assert.equal(parsed.spf_domain, 'google.com')
  assert.equal(parsed.dkim_result, 'pass')
  assert.equal(parsed.dkim_domain, 'accounts.google.com')
  assert.equal(parsed.dkim_selector, '202401')
  assert.equal(parsed.dmarc_result, 'fail')
})

test('extracts domains and public sending IP', () => {
  assert.equal(extractEmail('Google <no-reply@accounts.google.com>'), 'no-reply@accounts.google.com')
  assert.equal(extractDomainFromEmail('no-reply@accounts.google.com'), 'accounts.google.com')
  assert.equal(
    extractSendingIp('client-ip=10.0.0.3', 'mx.google.com; smtp.remote-ip=74.125.24.139', ['from private (192.168.1.10)']),
    '74.125.24.139',
  )
})
