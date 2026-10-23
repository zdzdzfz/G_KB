import test from 'node:test'
import assert from 'node:assert/strict'

process.env.DATABASE_URL = ''
process.env.DB_CONNECTION = 'sqlite'
process.env.DB_DATABASE = 'database/test.sqlite'
process.env.ADMIN_EMAIL = 'admin@mailauth.local'
process.env.ADMIN_PASSWORD = 'password'

const { createApp } = await import('../src/app.js')

async function listen() {
  const app = await createApp()
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` })
    })
  })
}

test('login and generate invitation link', async () => {
  const { server, baseUrl } = await listen()
  try {
    const login = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mailauth.local', password: 'password' }),
    })
    assert.equal(login.status, 200)
    const auth = await login.json()
    assert.ok(auth.token)

    const invite = await fetch(`${baseUrl}/api/google/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ target_email: 'client@gmail.com' }),
    })
    assert.equal(invite.status, 200)
    const payload = await invite.json()
    assert.equal(payload.target_email, 'client@gmail.com')
    assert.match(payload.url, /\/api\/google\/invitations\/.+\/redirect/)
  } finally {
    server.close()
  }
})
