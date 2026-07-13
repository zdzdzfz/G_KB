const allowedResults = new Set(['pass', 'fail', 'softfail', 'neutral', 'none', 'temperror', 'permerror', 'unknown'])

export function extractEmail(value = '') {
  const match = String(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}

export function extractName(value = '') {
  const name = String(value).replace(/<[^>]+>/g, '').trim().replace(/^["']|["']$/g, '')
  return name || null
}

export function extractDomainFromEmail(email) {
  if (!email || !email.includes('@')) return null
  return email.split('@').pop().toLowerCase()
}

export function parseAuthResults(raw = '') {
  const findResult = (name) => normalize((raw.match(new RegExp(`\\b${name}\\s*=\\s*([a-z]+)`, 'i')) || [])[1])
  const findValue = (keys) => {
    for (const key of keys) {
      const match = raw.match(new RegExp(`\\b${key.replace('.', '\\.')}\\s*=\\s*"?([^"\\s;()]+)"?`, 'i'))
      if (match?.[1]) {
        const value = match[1].replace(/[<>;,]/g, '').toLowerCase()
        return value.includes('@') ? value.split('@').pop() : value
      }
    }
    return null
  }

  return {
    spf_result: findResult('spf'),
    spf_domain: findValue(['smtp.mailfrom', 'mailfrom', 'header.from']),
    dkim_result: findResult('dkim'),
    dkim_domain: findValue(['header.d', 'd']),
    dkim_selector: findValue(['header.s', 's']),
    dmarc_result: findResult('dmarc'),
    dmarc_domain: findValue(['header.from', 'from']),
  }
}

export function normalize(result) {
  const value = String(result || '').toLowerCase().trim()
  return allowedResults.has(value) ? value : 'unknown'
}

export function extractSendingIp(receivedSpf = '', authRaw = '', receivedHeaders = []) {
  const groups = [
    extractByPattern(receivedSpf, /\bclient-ip\s*=\s*([A-F0-9:.]+)/gi),
    extractByPattern(authRaw, /\bsmtp\.remote-ip\s*=\s*([A-F0-9:.]+)/gi),
    extractByPattern(authRaw, /\bclient-ip\s*=\s*([A-F0-9:.]+)/gi),
    extractByPattern(receivedHeaders.join('\n'), /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g),
  ]

  for (const group of groups) {
    for (const ip of group) {
      if (isPublicIpv4(ip)) return ip
    }
  }
  return null
}

function extractByPattern(text, pattern) {
  return [...String(text || '').matchAll(pattern)].map((match) => match[1] || match[0])
}

function isPublicIpv4(ip) {
  const parts = String(ip).split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  if (a === 10 || a === 127 || a === 0 || a >= 224) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 169 && b === 254) return false
  if (a === 100 && b >= 64 && b <= 127) return false
  if (a === 192 && b === 0) return false
  if (a === 198 && (b === 18 || b === 19)) return false
  return true
}

export function parseGmailMessage(message) {
  const headers = {}
  for (const header of message.payload?.headers || []) {
    const key = header.name.toLowerCase()
    headers[key] ||= []
    headers[key].push(header.value)
  }

  const first = (name) => headers[name.toLowerCase()]?.[0] || null
  const all = (name) => headers[name.toLowerCase()] || []
  const labelIds = message.labelIds || []
  const from = first('From')
  const senderEmail = extractEmail(from)
  const authRaw = [...all('Authentication-Results'), ...all('ARC-Authentication-Results')].filter(Boolean).join('\n')
  const receivedSpf = first('Received-SPF')
  const auth = parseAuthResults(authRaw)
  const dkimSignature = first('DKIM-Signature') || ''
  const dkimDomain = auth.dkim_domain || (dkimSignature.match(/(?:^|;)\s*d=([^;]+)/i)?.[1] || null)
  const dkimSelector = auth.dkim_selector || (dkimSignature.match(/(?:^|;)\s*s=([^;]+)/i)?.[1] || null)
  const returnPath = first('Return-Path')

  return {
    gmail_message_id: message.id,
    gmail_thread_id: message.threadId || null,
    message_id_header: first('Message-ID'),
    sender_name: extractName(from),
    sender_email: senderEmail,
    subject: first('Subject') || '(No subject)',
    snippet: message.snippet || null,
    received_at: parseDate(first('Date')),
    placement: labelIds.includes('SPAM') ? 'spam' : labelIds.includes('INBOX') ? 'inbox' : 'other',
    gmail_category: category(labelIds),
    from_domain: extractDomainFromEmail(senderEmail),
    return_path: returnPath,
    return_path_domain: extractDomainFromEmail(extractEmail(returnPath)),
    observed_sending_ip: extractSendingIp(receivedSpf, authRaw, all('Received')),
    spf_result: auth.spf_result,
    spf_domain: auth.spf_domain,
    dkim_result: auth.dkim_result,
    dkim_domain: dkimDomain?.toLowerCase() || null,
    dkim_selector: dkimSelector?.toLowerCase() || null,
    dmarc_result: auth.dmarc_result,
    dmarc_domain: auth.dmarc_domain,
    raw_label_ids: JSON.stringify(labelIds),
    authentication_results_raw: authRaw || null,
    received_spf_raw: receivedSpf,
  }
}

function parseDate(value) {
  const timestamp = Date.parse(value || '')
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

function category(labelIds) {
  const map = {
    CATEGORY_PRIMARY: 'Primary',
    CATEGORY_PROMOTIONS: 'Promotions',
    CATEGORY_SOCIAL: 'Social',
    CATEGORY_UPDATES: 'Updates',
    CATEGORY_FORUMS: 'Forums',
  }
  return Object.keys(map).find((label) => labelIds.includes(label)) ? map[Object.keys(map).find((label) => labelIds.includes(label))] : null
}
