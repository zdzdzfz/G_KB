import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, MailCheck, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { login, token } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-slate-100 lg:grid-cols-[1fr_520px]">
      <section className="hidden bg-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">MailAuth Monitor</span>
        </div>
        <div className="max-w-xl">
          <MailCheck className="mb-6 h-14 w-14 text-indigo-100" />
          <h1 className="text-4xl font-semibold tracking-normal">Gmail deliverability authentication</h1>
          <p className="mt-4 text-base leading-7 text-indigo-100">
            Monitor SPF, DKIM, DMARC, placement, categories, domains, and observed sending IPs from connected Gmail accounts.
          </p>
        </div>
        <p className="text-sm text-indigo-100">Metadata-only sync. OAuth only.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-indigo-600 text-white lg:hidden">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-950">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">MailAuth Monitor</p>
          </div>

          <label className="mb-4 block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
            />
          </label>

          <label className="mb-6 block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
            />
          </label>

          {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Login
          </button>
        </form>
      </section>
    </main>
  )
}
